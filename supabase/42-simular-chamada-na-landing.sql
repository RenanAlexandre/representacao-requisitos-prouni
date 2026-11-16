-- ============================================================================
-- 42 — ANDAIME: entrar numa chamada que não é a de hoje
--
-- Rode depois do 41.
--
-- O PROBLEMA DE DEMONSTRAR CALENDÁRIO
-- -----------------------------------
-- A regra é boa e invisível: quem separa as três chamadas é a data em que o
-- candidato preenche. O problema é justamente esse — para MOSTRAR a 2ª chamada
-- ou a lista de espera funcionando seria preciso esperar outubro, ou mexer no
-- relógio da máquina.
--
-- Então a landing ganha um seletor de demonstração. Escolhida uma chamada que
-- não é a de hoje, a inscrição entra nela COM A DATA EQUIVALENTE: o mesmo dia
-- ordinal que hoje ocupa na chamada corrente. Hoje é o 8º dia da 1ª chamada
-- (26/08 a 07/10); o 8º dia da 2ª (08/10 a 19/11) é 15/10, e o da lista de
-- espera (20/11 a 01/01) é 27/11. É esse dia que fica gravado como entrada do
-- aluno — em `candidatos.created_at` e em `inscricoes.inscrito_em`, que são os
-- dois campos que o ERP e o Portal mostram como data de inscrição.
--
-- ⚠️ NADA DISSO EXISTE NO PRODUTO. Lá o campo `chamada_simulada` não é enviado,
-- `demo_data_equivalente` não é chamada, e a data de entrada é `now()`. O
-- seletor mora numa nota de desenvolvimento, marcada como tal na tela.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. O dia equivalente
--
-- Ordinal, não data: "o 8º dia" é o que se traduz entre janelas de tamanhos
-- diferentes. Se as três tivessem durações distintas, o ordinal ainda faria
-- sentido — por isso o `least` com o tamanho da chamada de destino, que evita
-- pedir o 40º dia de uma chamada de 30.
--
-- Fora de qualquer janela (antes da abertura ou depois do fim), o ordinal é
-- travado em 1: melhor entrar no primeiro dia da chamada escolhida do que
-- inventar uma data fora dela.
-- ---------------------------------------------------------------------------
create or replace function demo_data_equivalente(p_chamada text)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_hoje    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_vig     record;
  v_alvo    record;
  v_ordinal int;
begin
  select cc.id,
         (cc.inicio at time zone 'America/Sao_Paulo')::date as de,
         (cc.fim    at time zone 'America/Sao_Paulo')::date as ate
    into v_vig
    from concursos cc where cc.id = concurso_vigente();

  if v_vig.id is null then
    raise exception 'Não há concurso vigente para tirar o dia equivalente'
      using errcode = 'P0002';
  end if;

  select cc.id, cc.nome, cc.chamada,
         (cc.inicio at time zone 'America/Sao_Paulo')::date as de,
         (cc.fim    at time zone 'America/Sao_Paulo')::date as ate
    into v_alvo
    from concursos cc
    join processos_seletivos ps on ps.id = cc.processo_seletivo_id
   where cc.ativo and ps.ativo and cc.chamada = p_chamada;

  if v_alvo.id is null then
    raise exception 'Chamada inexistente: %', p_chamada using errcode = '22023';
  end if;

  -- Onde hoje cai dentro da chamada corrente, em dias.
  v_ordinal := greatest(1, least(v_hoje - v_vig.de + 1, (v_vig.ate - v_vig.de) + 1));
  -- E o mesmo lugar dentro da chamada escolhida.
  v_ordinal := least(v_ordinal, (v_alvo.ate - v_alvo.de) + 1);

  return jsonb_build_object(
    'concurso_id',  v_alvo.id,
    'concurso',     v_alvo.nome,
    'chamada',      v_alvo.chamada,
    'dia_ordinal',  v_ordinal,
    'dias_chamada', (v_alvo.ate - v_alvo.de) + 1,
    -- Meia-noite de Brasília, como todo marco de data deste banco.
    'data',         ((v_alvo.de + (v_ordinal - 1))::text || ' 00:00-03')::timestamptz,
    'simulado',     true);
end;
$fn$;

comment on function demo_data_equivalente is
  'ANDAIME de demonstração: traduz o dia de hoje para o dia equivalente de outra chamada. Não existe no produto.';

revoke all on function demo_data_equivalente(text) from public;
grant execute on function demo_data_equivalente(text) to anon;


-- ---------------------------------------------------------------------------
-- 2. O calendário devolve o dia equivalente de cada chamada
--
-- A tela precisa mostrar a data ANTES de enviar — senão o seletor pede um
-- salto no escuro. O cálculo é o mesmo de `demo_data_equivalente`, chamado de
-- lá, para não haver duas contas.
-- ---------------------------------------------------------------------------
create or replace function lp_chamadas()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.inicio), '[]'::jsonb)
    from (
      select cc.nome,
             cc.chamada,
             cc.inicio,
             cc.fim,
             ps.nome as processo_seletivo,
             cc.id = concurso_vigente()                        as vigente,
             (cc.fim::date - cc.inicio::date) + 1              as dias,
             -- ANDAIME: só serve ao seletor de demonstração da landing.
             (demo_data_equivalente(cc.chamada)->>'data')::timestamptz as data_equivalente,
             (demo_data_equivalente(cc.chamada)->>'dia_ordinal')::int  as dia_ordinal
        from concursos cc
        join processos_seletivos ps on ps.id = cc.processo_seletivo_id
       where cc.ativo and ps.ativo
    ) x;
$fn$;

grant execute on function lp_chamadas() to anon;


-- ---------------------------------------------------------------------------
-- 3. A inscrição aceita a chamada simulada
--
-- Corpo abaixo é a definição VIVA com o bloco de escolha do concurso e as duas
-- datas de entrada trocadas. O campo entra DENTRO de `p_dados`, e não como
-- argumento novo: assinatura que muda derruba o cliente publicado antes da
-- migração — já aconteceu neste projeto.
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
  v_simulada  text := nullif(btrim(coalesce(p_dados->>'chamada_simulada', '')), '');
  v_equiv     jsonb;
  v_quando    timestamptz := now();
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
    declara_professor_rede_publica, created_at
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
    v_matricula, v_beneficio, v_professor, v_quando
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
  -- ANDAIME: `chamada_simulada` deixa a demonstração entrar numa chamada que
  -- não é a de hoje, com a data equivalente. No produto o campo não existe e
  -- quem decide é só o calendário. Ver `demo_data_equivalente`.
  if v_simulada is not null then
    v_equiv    := demo_data_equivalente(v_simulada);
    v_concurso := (v_equiv->>'concurso_id')::uuid;
    v_quando   := (v_equiv->>'data')::timestamptz;
  else
    v_concurso := concurso_vigente();
  end if;

  if v_concurso is null then
    raise exception 'Nenhum concurso aberto no processo seletivo ativo' using errcode = 'P0002';
  end if;

  select cc.chamada, ps.nome into v_chamada, v_ps_nome
    from concursos cc
    join processos_seletivos ps on ps.id = cc.processo_seletivo_id
   where cc.id = v_concurso;

  insert into inscricoes
    (candidato_id, concurso_id, status, modalidade_concorrencia, chamada, inscrito_em)
  values (v_cand, v_concurso, 'Inscrito',
          case when v_cota then 'PPI' else 'Ampla' end, v_chamada, v_quando);

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
    'modulos', v_modulos, 'modulo', v_modulo,
    'chamada', v_chamada, 'inscrito_em', v_quando,
    'simulada', v_simulada is not null);
end;
$fn$;

grant execute on function lp_criar_candidato(jsonb) to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  r        record;
  v_hoje   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ord    int;
begin
  select (demo_data_equivalente(cc.chamada)->>'dia_ordinal')::int into v_ord
    from concursos cc where cc.id = concurso_vigente();

  raise notice 'hoje (%) e o dia % da chamada corrente', v_hoje, v_ord;

  for r in
    select e->>'chamada' as chamada,
           (e->>'vigente')::boolean as vigente,
           (e->>'dia_ordinal')::int as dia,
           to_char((e->>'data_equivalente')::timestamptz at time zone 'America/Sao_Paulo',
                   'DD/MM/YYYY') as data
      from jsonb_array_elements(lp_chamadas()) e
     order by (e->>'inicio')::timestamptz
  loop
    raise notice '  %  %  dia % -> %',
      case when r.vigente then '[hoje]' else '      ' end, rpad(r.chamada, 16), r.dia, r.data;
  end loop;

  -- O ordinal tem de ser o MESMO nas três: é isso que "dia equivalente" quer
  -- dizer. Se alguma chamada fosse mais curta, a dela seria menor.
  if (select count(distinct (e->>'dia_ordinal')::int) from jsonb_array_elements(lp_chamadas()) e) <> 1
  then
    raise exception 'Os dias ordinais divergiram entre as chamadas';
  end if;
end;
$blk$;
