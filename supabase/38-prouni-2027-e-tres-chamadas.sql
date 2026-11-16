-- ============================================================================
-- 38 — Um processo seletivo, três chamadas
--
-- Rode depois do 37.
--
-- O QUE MUDA
-- ----------
-- Havia três processos seletivos: `TESTEGRAD` (linha de print, inativa) e um
-- par `PROUNI C/COTA` + `PROUNI S/COTA`, herdado de quando a cota decidia o
-- processo. Todos saem. Entra UM:
--
--   PROUNI 2027 · PROUNI.2027/1 · período 2027.1 · Graduação · ativo
--
-- com três concursos, todos tipo "Pro Uni", origem "Sede", ativos:
--
--   PROUNI 1ª CHAMADA      26/08/2026 a 07/10/2026
--   PROUNI 2ª CHAMADA      08/10/2026 a 19/11/2026
--   PROUNI LISTA DE ESPERA 20/11/2026 a 01/01/2027
--
-- A janela combinada (26/08 a 01/01, 129 dias) foi dividida em três blocos
-- iguais de 43 dias, SEM dia em comum: o fim de um é a véspera do começo do
-- seguinte. Os dias mais próximos ficam com a 1ª chamada e os mais distantes
-- com a lista de espera. A divisão é calculada aqui, a partir das duas datas —
-- não são três pares de datas digitados à mão, que é como se erra um dia e
-- ninguém percebe. A data do vestibular de cada concurso é o início dele.
--
-- POR QUE A COTA DEIXA DE SER PROCESSO
-- ------------------------------------
-- Cotista e não cotista concorrem no MESMO processo; o que muda é a
-- modalidade de concorrência, que já vive em `inscricoes.modalidade_concorrencia`
-- ('PPI' / 'Ampla'). Dois processos para a mesma chamada duplicavam o
-- calendário e obrigavam a landing a escolher um deles por um `case`.
--
-- Quem passa a escolher o concurso é o CALENDÁRIO — ver `concurso_vigente()`.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. A chamada vira um dado do concurso, não uma string solta
--
-- `inscricoes.chamada` já existia como texto livre. Guardar o mesmo rótulo no
-- concurso deixa a inscrição herdar dele em vez de repetir o literal em cada
-- lugar que cria inscrição.
-- ---------------------------------------------------------------------------
alter table concursos add column if not exists chamada text;

comment on column concursos.chamada is
  'Rótulo da chamada ("1ª Chamada", "2ª Chamada", "Lista de Espera"). A inscrição herda daqui.';


-- ---------------------------------------------------------------------------
-- 2. O processo novo e os três concursos
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_ps     uuid;
  v_inicio date := date '2026-08-26';
  v_fim    date := date '2027-01-01';
  v_dias   int;
  v_bloco  int;
  v_c1_fim date;
  v_c2_fim date;
begin
  v_dias  := (v_fim - v_inicio) + 1;      -- 129 dias, contando as duas pontas
  v_bloco := v_dias / 3;                  -- 43

  if v_bloco < 1 then
    raise exception 'Janela curta demais para dividir em três (% dias)', v_dias;
  end if;

  v_c1_fim := v_inicio + (v_bloco - 1);
  v_c2_fim := v_inicio + (2 * v_bloco - 1);
  -- O terceiro bloco vai até o fim da janela e absorve qualquer sobra da
  -- divisão, para nenhum dia ficar de fora.

  insert into processos_seletivos (nome, codigo, periodo_letivo, nivel_ensino, ativo)
  values ('PROUNI 2027', 'PROUNI.2027/1', '2027.1', 'Graduação', true)
  returning id into v_ps;

  -- `inicio`/`fim` à meia-noite de Brasília, como as linhas que já existiam:
  -- gravar em UTC puro faria a tela mostrar o dia anterior.
  insert into concursos
    (processo_seletivo_id, nome, chamada, tipo, origem, inicio, fim,
     data_vestibular, tipo_classificacao, requer_prova, ativo)
  values
    (v_ps, 'PROUNI 1ª CHAMADA', '1ª Chamada', 'Pro Uni', 'Sede',
     (v_inicio       || ' 00:00-03')::timestamptz, (v_c1_fim || ' 00:00-03')::timestamptz,
     (v_inicio       || ' 00:00-03')::timestamptz, 'Não há', false, true),
    (v_ps, 'PROUNI 2ª CHAMADA', '2ª Chamada', 'Pro Uni', 'Sede',
     (v_c1_fim + 1   || ' 00:00-03')::timestamptz, (v_c2_fim || ' 00:00-03')::timestamptz,
     (v_c1_fim + 1   || ' 00:00-03')::timestamptz, 'Não há', false, true),
    (v_ps, 'PROUNI LISTA DE ESPERA', 'Lista de Espera', 'Pro Uni', 'Sede',
     (v_c2_fim + 1   || ' 00:00-03')::timestamptz, (v_fim    || ' 00:00-03')::timestamptz,
     (v_c2_fim + 1   || ' 00:00-03')::timestamptz, 'Não há', false, true);

  raise notice 'PROUNI 2027 criado: % a % | % a % | % a %',
    v_inicio, v_c1_fim, v_c1_fim + 1, v_c2_fim, v_c2_fim + 1, v_fim;
end;
$blk$;


-- ---------------------------------------------------------------------------
-- 3. Os candidatos mudam de concurso
--
-- Cada inscrição vai para o concurso da chamada que ela já declarava. Se
-- alguma trouxesse uma chamada que não existe mais, ela cairia na 1ª — mas o
-- bloco de conferência recusa a migração antes disso, para o dado não ser
-- movido no escuro.
-- ---------------------------------------------------------------------------
do $blk$
declare v_orfas int; v_movidas int;
begin
  select count(*) into v_orfas
    from inscricoes i
   where coalesce(i.chamada, '') not in ('1ª Chamada', '2ª Chamada', 'Lista de Espera');
  if v_orfas > 0 then
    raise exception '% inscrição(ões) com chamada fora das três novas — trate antes de migrar',
      v_orfas;
  end if;

  update inscricoes i
     set concurso_id = cc.id
    from concursos cc
    join processos_seletivos ps on ps.id = cc.processo_seletivo_id
   where ps.codigo = 'PROUNI.2027/1'
     and cc.chamada = i.chamada
     and i.concurso_id <> cc.id;
  get diagnostics v_movidas = row_count;

  raise notice 'inscrições migradas para o PROUNI 2027: %', v_movidas;
end;
$blk$;


-- ---------------------------------------------------------------------------
-- 4. Os processos antigos saem
--
-- `concursos`, `ofertas` e `turmas` caem por cascade. `inscricoes.concurso_id`
-- NÃO tem cascade — de propósito: se alguma inscrição tivesse ficado para trás,
-- o delete falharia por chave estrangeira em vez de levar o candidato junto.
-- ---------------------------------------------------------------------------
do $blk$
declare v_presas int; v_apagados int;
begin
  select count(*) into v_presas
    from inscricoes i
    join concursos cc on cc.id = i.concurso_id
    join processos_seletivos ps on ps.id = cc.processo_seletivo_id
   where ps.codigo <> 'PROUNI.2027/1';
  if v_presas > 0 then
    raise exception '% inscrição(ões) ainda apontam para processo antigo', v_presas;
  end if;

  delete from processos_seletivos where codigo <> 'PROUNI.2027/1';
  get diagnostics v_apagados = row_count;
  raise notice 'processos seletivos removidos: %', v_apagados;
end;
$blk$;


-- ---------------------------------------------------------------------------
-- 5. Quem escolhe o concurso é o calendário
--
-- Dentro da janela, a chamada é a que contém hoje. Antes da abertura, a
-- primeira que vai abrir. Depois do fim, a última que fechou — assim uma
-- inscrição fora de prazo entra na lista de espera em vez de estourar, e o
-- caso aparece no relatório em vez de sumir.
--
-- A conta é feita no fuso de Brasília: comparar `now()` em UTC com um marco
-- gravado à meia-noite local erra o dia por três horas.
-- ---------------------------------------------------------------------------
create or replace function concurso_vigente()
returns uuid
language sql stable security definer set search_path = public as $fn$
  with abertos as (
    select cc.id,
           (cc.inicio at time zone 'America/Sao_Paulo')::date as de,
           (cc.fim    at time zone 'America/Sao_Paulo')::date as ate
      from concursos cc
      join processos_seletivos ps on ps.id = cc.processo_seletivo_id
     where cc.ativo and ps.ativo
  ), hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select id from abertos, hoje
   order by
     case when hoje.d between abertos.de and abertos.ate then 0
          when abertos.de > hoje.d                      then 1
          else 2 end,
     case when abertos.de > hoje.d then abertos.de end asc nulls last,
     abertos.ate desc
   limit 1;
$fn$;

comment on function concurso_vigente is
  'O concurso em que uma inscrição feita agora deve entrar: a chamada aberta hoje; senão a próxima a abrir; senão a última encerrada.';

revoke all on function concurso_vigente() from public;


-- ---------------------------------------------------------------------------
-- 6. A landing passa a usar o calendário
--
-- Corpo abaixo é a definição VIVA com o bloco de escolha do concurso trocado.
-- ---------------------------------------------------------------------------
create or replace function lp_criar_candidato(p_dados jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_cpf       text := regexp_replace(p_dados->>'cpf', '\D', '', 'g');
  v_cota      boolean := coalesce((p_dados->>'aceite_cota')::boolean, false);
  v_matricula boolean := coalesce((p_dados->>'declara_encerramento_matricula')::boolean, false);
  v_beneficio boolean := coalesce((p_dados->>'declara_encerramento_beneficio')::boolean, false);
  v_professor boolean := coalesce((p_dados->>'declara_professor_rede_publica')::boolean, false);
  v_curso     uuid := curso_por_rotulo(p_dados->>'curso');
  v_cand      uuid;
  v_protocolo text;
  v_concurso  uuid;
  v_token     uuid;
  v_ps_nome   text;
  v_chamada   text;
  v_modulos   int;
  v_modulo    text;
begin
  if length(v_cpf) <> 11 then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;
  if exists (select 1 from candidatos where cpf = v_cpf) then
    raise exception 'Já existe uma inscrição para este CPF' using errcode = '23505';
  end if;
  if v_curso is null then
    raise exception 'Curso não encontrado: %', p_dados->>'curso' using errcode = '22023';
  end if;

  insert into candidatos (
    cpf, nome, rg, rg_orgao_expedidor, nascimento, sexo, raca_codigo,
    uf_naturalidade, municipio_naturalidade,
    email, ddd, telefone,
    cep, logradouro, numero, complemento, bairro, cidade, uf,
    escolaridade_codigo, ano_conclusao_em, curso_id, plano_pagamento_id,
    aceite_contrato, aceite_contrato_em,
    aceite_contato,  aceite_contato_em,
    aceite_cota,     aceite_cota_em,
    declara_encerramento_matricula, declara_encerramento_beneficio,
    declara_professor_rede_publica
  )
  select
    v_cpf, p_dados->>'nome', p_dados->>'rg',
    nullif(btrim(coalesce(p_dados->>'rg_orgao_expedidor', '')), ''),
    (p_dados->>'nascimento')::date,
    p_dados->>'sexo', r.codigo,
    p_dados->>'uf_naturalidade', p_dados->>'municipio_naturalidade',
    p_dados->>'email', p_dados->>'ddd', p_dados->>'telefone',
    regexp_replace(p_dados->>'cep', '\D', '', 'g'),
    p_dados->>'logradouro', p_dados->>'numero', nullif(p_dados->>'complemento', ''),
    p_dados->>'bairro', p_dados->>'cidade', p_dados->>'uf',
    e.codigo, (p_dados->>'ano_conclusao')::int, v_curso, pl.id,
    true, now(),
    coalesce((p_dados->>'aceite_contato')::boolean, false),
    case when coalesce((p_dados->>'aceite_contato')::boolean, false) then now() end,
    v_cota, case when v_cota then now() end,
    v_matricula, v_beneficio, v_professor
  from racas r
  left join escolaridades e on e.nome = p_dados->>'escolaridade'
  left join planos_pagamento pl on pl.nome = p_dados->>'plano'
  where r.nome = p_dados->>'raca'
  returning id, protocolo into v_cand, v_protocolo;

  if v_cand is null then
    raise exception 'Não foi possível montar o cadastro — confira raça e plano'
      using errcode = '22023';
  end if;

  -- Antes eram dois processos seletivos, um por modalidade de cota, e a
  -- inscrição escolhia por aí. Agora é UM processo com três concursos, e quem
  -- escolhe é o CALENDÁRIO: cai na chamada cuja janela contém hoje. A cota
  -- deixou de decidir o concurso — ela vive em `modalidade_concorrencia`,
  -- que é onde sempre foi o lugar dela.
  v_concurso := concurso_vigente();

  if v_concurso is null then
    raise exception 'Nenhum concurso aberto no processo seletivo ativo' using errcode = 'P0002';
  end if;

  select cc.chamada, ps.nome into v_chamada, v_ps_nome
    from concursos cc
    join processos_seletivos ps on ps.id = cc.processo_seletivo_id
   where cc.id = v_concurso;

  insert into inscricoes
    (candidato_id, concurso_id, status, modalidade_concorrencia, chamada)
  values (v_cand, v_concurso, 'Inscrito',
          case when v_cota then 'PPI' else 'Ampla' end, v_chamada);

  v_modulos := gendocs_distribuir_candidato(v_cand);

  select m.nome into v_modulo
    from gendocs_participantes p
    join gendocs_grupos g on g.id = p.grupo_id
    join modulos_gendocs m on m.id = p.modulo_id
   where g.candidato_id = v_cand and p.titular;

  insert into sessoes_portal (candidato_id) values (v_cand) returning token into v_token;

  return jsonb_build_object(
    'candidato_id', v_cand, 'protocolo', v_protocolo, 'token', v_token,
    'processo', v_ps_nome, 'cotista', v_cota,
    'modulos', v_modulos, 'modulo', v_modulo);
end;
$fn$;

grant execute on function lp_criar_candidato(jsonb) to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_ps       int;
  v_conc     int;
  v_insc     int;
  v_buraco   int;
  v_vigente  text;
  r          record;
begin
  select count(*) into v_ps from processos_seletivos;
  if v_ps <> 1 then
    raise exception 'Deveria haver 1 processo seletivo, há %', v_ps;
  end if;

  select count(*) into v_conc from concursos;
  if v_conc <> 3 then
    raise exception 'Deveriam existir 3 concursos, há %', v_conc;
  end if;

  select count(*) into v_insc
    from inscricoes i
    join concursos cc on cc.id = i.concurso_id
    join processos_seletivos ps on ps.id = cc.processo_seletivo_id
   where ps.codigo = 'PROUNI.2027/1';
  if v_insc <> (select count(*) from inscricoes) then
    raise exception 'Nem toda inscrição foi migrada';
  end if;

  -- Nenhum dia em comum e nenhum buraco entre os três blocos.
  select count(*) into v_buraco from (
    select cc.fim, lead(cc.inicio) over (order by cc.inicio) as prox
      from concursos cc
  ) x where x.prox is not null
      and (x.prox at time zone 'America/Sao_Paulo')::date
        <> (x.fim at time zone 'America/Sao_Paulo')::date + 1;
  if v_buraco > 0 then
    raise exception '% emenda(s) errada(s) entre as chamadas', v_buraco;
  end if;

  if exists (select 1 from concursos where data_vestibular <> inicio) then
    raise exception 'Há concurso com data do vestibular diferente do início';
  end if;

  select cc.nome into v_vigente from concursos cc where cc.id = concurso_vigente();

  raise notice 'inscrições no PROUNI 2027: % | concurso vigente hoje: %', v_insc, v_vigente;
  for r in
    select nome, chamada, tipo, origem,
           to_char(inicio at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') as de,
           to_char(fim    at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') as ate,
           (fim::date - inicio::date) + 1 as dias
      from concursos order by inicio
  loop
    raise notice '  % | % | % a % (% dias)', rpad(r.nome, 24), rpad(r.chamada, 16),
      r.de, r.ate, r.dias;
  end loop;
end;
$blk$;
