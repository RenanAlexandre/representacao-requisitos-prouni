-- ============================================================================
-- 29 — Órgão expedidor, a ficha cadastral completa e "Sisprouni"
--
-- Rode depois do 28.
--
-- QUATRO COISAS
-- -------------
-- 1. O RG passa a vir com ÓRGÃO EXPEDIDOR, obrigatório na landing. Sem ele o
--    RG não identifica documento nenhum, e a tela de análise do GenDocs já
--    mostrava um "SSP <UF>" inventado no painel de campos lidos.
--
-- 2. `portal_meus_dados` devolve tudo o que a landing passou a coletar — as
--    quatro declarações, o órgão expedidor, o processo seletivo. A tela de
--    Dados Cadastrais mostrava um recorte antigo do formulário.
--
-- 3. BUG ENCONTRADO AGORA: `portal_meus_dados` montava o curso como
--    `codigo_mec || ' – ' || nome`. Depois da migração 25 só 8 dos 83 cursos
--    têm código e-MEC — nos outros 75 a concatenação com NULL devolve NULL, e
--    o candidato via o curso em branco no próprio portal. Passa a usar
--    `rotulo_do_curso`, como o ERP já fazia. O polo tinha o mesmo defeito.
--
-- 4. "Sispro" vira "Sisprouni" nos textos. É o nome do sistema do ProUni; a
--    forma curta era invenção nossa.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Órgão expedidor do RG
--
-- Fica sem `not null` porque há candidatos gravados antes desta coluna: a
-- obrigatoriedade vale para inscrição nova, e é a landing que a impõe. Um
-- `not null` aqui derrubaria a migração ou exigiria inventar valor para quem
-- já está no banco — e inventar dado de documento é pior do que deixar vazio.
-- ---------------------------------------------------------------------------
alter table candidatos add column if not exists rg_orgao_expedidor text;

comment on column candidatos.rg_orgao_expedidor is
  'Órgão expedidor do RG como o candidato digitou (ex.: SSP/PR). Obrigatório na landing a partir da migração 29; nulo nos cadastros anteriores.';


-- ---------------------------------------------------------------------------
-- 2. A landing grava o órgão expedidor
--
-- O corpo abaixo é a definição VIVA do banco (`pg_get_functiondef`), com duas
-- linhas acrescentadas: a coluna no insert e o valor no select. Reconstruir de
-- memória seria erro na certa — a versão em arquivo (17) já estava defasada da
-- que roda, que usa `gendocs_distribuir_candidato` e `sessoes_portal`.
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

  select cc.id, ps.nome into v_concurso, v_ps_nome
    from processos_seletivos ps
    join concursos cc on cc.processo_seletivo_id = ps.id
   where ps.codigo = case when v_cota then 'PROUNICOTA' else 'PROUNISCOTA' end and ps.ativo
   order by cc.created_at limit 1;

  if v_concurso is null then
    raise exception 'Processo seletivo não encontrado ou sem concurso' using errcode = 'P0002';
  end if;

  insert into inscricoes
    (candidato_id, concurso_id, status, modalidade_concorrencia, chamada)
  values (v_cand, v_concurso, 'Inscrito',
          case when v_cota then 'PPI' else 'Ampla' end, '1ª Chamada');

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


-- ---------------------------------------------------------------------------
-- 3. A ficha cadastral completa
--
-- O portal mostrava um recorte do formulário de 3 etapas. Agora devolve o que
-- a landing coleta hoje: identificação com órgão expedidor, contato, endereço,
-- formação, curso/polo/plano e as QUATRO declarações do Sisprouni — que são o
-- que decide o módulo de coleta, e por isso o candidato precisa poder conferir.
-- ---------------------------------------------------------------------------
create or replace function portal_meus_dados(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_id uuid := sessao_candidato(p_token);
  v_out jsonb;
begin
  select to_jsonb(x) into v_out from (
    select c.protocolo, c.nome, c.cpf, c.rg, c.rg_orgao_expedidor,
           c.nascimento, c.sexo,
           r.nome as raca, r.ppi as raca_ppi,
           c.uf_naturalidade, c.municipio_naturalidade,
           c.email, c.ddd, c.telefone,
           c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
           e.nome as escolaridade, c.ano_conclusao_em,
           -- Sem `rotulo_do_curso` o candidato via o curso em branco: 75 dos
           -- 83 cursos não têm código e-MEC, e concatenar com NULL dá NULL.
           rotulo_do_curso(c.curso_id) as curso,
           cu.area_conhecimento, cu.tipo_formacao, cu.modalidade, cu.duracao,
           case when po.codigo_sispro is null then po.nome
                else po.codigo_sispro || ' – ' || po.nome end as polo,
           pl.nome as plano, pl.tipo_bolsa, pl.percentual as plano_percentual,
           c.aceite_contrato, c.aceite_contrato_em,
           c.aceite_contato,  c.aceite_contato_em,
           c.aceite_cota,     c.aceite_cota_em,
           c.declara_encerramento_matricula,
           c.declara_encerramento_beneficio,
           c.declara_professor_rede_publica,
           c.created_at as inscrito_em,
           i.modalidade_concorrencia as cota,
           i.chamada,
           i.status::text as status_inscricao,
           ps.nome as processo_seletivo,
           m.nome as modulo_coleta,
           m.envio_inicio, m.envio_fim,
           greatest(0, (m.envio_fim - current_date)) as dias_restantes
      from candidatos c
      left join racas r          on r.codigo = c.raca_codigo
      left join escolaridades e  on e.codigo = c.escolaridade_codigo
      left join cursos cu        on cu.id = c.curso_id
      left join polos po         on po.id = c.polo_id
      left join planos_pagamento pl on pl.id = c.plano_pagamento_id
      left join inscricoes i     on i.candidato_id = c.id
      left join concursos cc     on cc.id = i.concurso_id
      left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
      left join gendocs_grupos g on g.candidato_id = c.id
      left join gendocs_participantes gp on gp.grupo_id = g.id and gp.titular
      left join modulos_gendocs m on m.id = gp.modulo_id
     where c.id = v_id
     limit 1
  ) x;

  return v_out;
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 4. O painel de campos lidos usa o órgão expedidor de verdade
--
-- Continua sendo andaime (não há OCR), mas agora o "Órgão Emissor" mostra o
-- que a pessoa declarou, em vez de um 'SSP <UF>' montado a partir da UF de
-- endereço. Quando o dado não existe — cadastro anterior à coluna — cai no
-- traço, que é honesto.
-- ---------------------------------------------------------------------------
create or replace function demo_extrair_campos(p_documento_coleta_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_campos  text[];
  v_campo   text;
  v_nome    text;
  v_cpf     text;
  v_rg      text;
  v_orgao   text;
  v_nasc    date;
  v_uf      text;
  v_valor   text;
  v_saida   jsonb := '{}'::jsonb;
begin
  select de.campos_ia, coalesce(c.nome, mb.nome, gp.nome), c.cpf, c.rg,
         c.rg_orgao_expedidor, coalesce(c.nascimento, mb.nascimento),
         coalesce(c.uf, 'PR')
    into v_campos, v_nome, v_cpf, v_rg, v_orgao, v_nasc, v_uf
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes gp on gp.id = ct.participante_id
    join gendocs_grupos g on g.id = gp.grupo_id
    left join candidatos c on c.id = g.candidato_id
    left join membros_grupo_familiar mb on mb.id = gp.membro_id
   where dc.id = p_documento_coleta_id;

  if v_campos is null or cardinality(v_campos) = 0 then
    return '{}'::jsonb;
  end if;

  foreach v_campo in array v_campos loop
    v_valor := case v_campo
      when 'Nome' then upper(v_nome)
      when 'Cadastro de Pessoa Física(CPF)' then
        case when v_cpf is null then '—'
             else regexp_replace(v_cpf, '(\d{3})(\d{3})(\d{3})(\d{2})', '\1.\2.\3-\4') end
      when 'Data de Nascimento' then coalesce(to_char(v_nasc, 'DD/MM/YYYY'), '—')
      when 'Documento de Identidade' then coalesce(v_rg, '—')
      when 'Órgão Emissor' then coalesce(v_orgao, '—')
      when 'Unidade Federal (UF) Emissor' then
        coalesce(nullif(split_part(replace(coalesce(v_orgao, ''), '-', '/'), '/', 2), ''), v_uf)
      when 'Nacionalidade' then 'BRASILEIRO(A)'
      when 'Tipo de Documento' then 'DOCUMENTO DE IDENTIFICAÇÃO'
      when 'Categoria' then 'AB'
      when 'Filiação 1' then 'NÃO INFORMADO NO CADASTRO'
      when 'Filiação 2' then 'NÃO INFORMADO NO CADASTRO'
      when 'Data de Emissão' then to_char(current_date - 400, 'DD/MM/YYYY')
      when 'Data de Expedição' then to_char(current_date - 400, 'DD/MM/YYYY')
      when 'Data de Validade' then to_char(current_date + 3000, 'DD/MM/YYYY')
      when 'Data da Primeira Habilitação' then coalesce(to_char(v_nasc + 6600, 'DD/MM/YYYY'), '—')
      when 'Número da Carteira Nacional de Habilitação (CNH)' then
        lpad((abs(hashtext(v_nome)) % 100000000000)::text, 11, '0')
      when 'Número de Registro' then
        lpad((abs(hashtext(v_nome || 'reg')) % 100000000000)::text, 11, '0')
      else '—'
    end;

    v_saida := v_saida || jsonb_build_object(
      v_campo, jsonb_build_object('valor', v_valor, 'confianca', demo_confianca(v_campo)));
  end loop;

  return v_saida;
end;
$fn$;

-- O RG passa a pedir o órgão junto, e o texto diz isso.
update documentos_exigidos
   set descricao = 'Frente e verso no mesmo arquivo, com o órgão expedidor legível — é o mesmo ' ||
                   'que você informou na inscrição. No lugar do RG valem também Carteira ' ||
                   'Funcional, Identidade Militar ou Passaporte emitido no Brasil, mas o CPF ' ||
                   'continua sendo pedido à parte.'
 where nome = 'RG';


-- ---------------------------------------------------------------------------
-- 5. "Sispro" vira "Sisprouni"
-- ---------------------------------------------------------------------------
update documentos_exigidos
   set descricao = regexp_replace(descricao, 'Sispro(?!uni)', 'Sisprouni', 'gi')
 where descricao ~* 'sispro(?!uni)';

update modulos_gendocs
   set descricao = regexp_replace(descricao, 'Sispro(?!uni)', 'Sisprouni', 'gi')
 where descricao ~* 'sispro(?!uni)';


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_sobrou int;
  v_coluna int;
  v_curso  text;
begin
  select count(*) into v_coluna from information_schema.columns
   where table_name = 'candidatos' and column_name = 'rg_orgao_expedidor';
  if v_coluna <> 1 then
    raise exception 'A coluna rg_orgao_expedidor não foi criada';
  end if;

  select count(*) into v_sobrou from documentos_exigidos
   where descricao ~* 'sispro(?!uni)';
  if v_sobrou > 0 then
    raise exception 'Ainda restam % descrições com "Sispro"', v_sobrou;
  end if;

  -- O curso não pode mais sair em branco para quem não tem código e-MEC.
  select rotulo_do_curso(c.curso_id) into v_curso
    from candidatos c where c.curso_id is not null limit 1;
  if v_curso is null then
    raise exception 'rotulo_do_curso devolveu nulo para um candidato com curso';
  end if;

  raise notice 'órgão expedidor criado; textos com Sisprouni; curso de exemplo: %', v_curso;
end;
$blk$;
