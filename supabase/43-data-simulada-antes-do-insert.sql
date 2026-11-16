-- ============================================================================
-- 43 — A data simulada precisa existir ANTES do insert do candidato
--
-- Rode depois do 42.
--
-- O ERRO DA 42
-- ------------
-- O bloco que resolve a chamada simulada foi parar onde ele já estava na
-- função: DEPOIS do `insert into candidatos`. Só que `v_quando` alimenta o
-- `created_at` desse insert. Resultado: `inscricoes.inscrito_em` recebia a
-- data equivalente (15/10, 27/11) e `candidatos.created_at` continuava com
-- `now()` — os dois campos que deveriam contar a mesma história discordavam,
-- e o Portal mostra justamente o `created_at`.
--
-- Passou despercebido porque a inscrição CAÍA na chamada certa: o que estava
-- errado era só a data de entrada, que é o miolo do pedido.
--
-- Resolver o concurso antes do insert é seguro: ele não depende do candidato,
-- só do calendário.
-- ============================================================================

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

  -- Resolvido ANTES do insert: `v_quando` vira `created_at` do candidato,
  -- e o concurso não depende de nada que ainda não exista.
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
-- Conferência — as datas dos candidatos simulados que a 42 deixou tortas
-- ---------------------------------------------------------------------------
do $blk$
declare v_tortos int;
begin
  select count(*) into v_tortos
    from candidatos c
    join inscricoes i on i.candidato_id = c.id
   where (c.created_at at time zone 'America/Sao_Paulo')::date
      <> (i.inscrito_em at time zone 'America/Sao_Paulo')::date;

  if v_tortos > 0 then
    raise notice '% candidato(s) com created_at diferente de inscrito_em — resquício da 42', v_tortos;
  else
    raise notice 'created_at e inscrito_em batem em todos os candidatos';
  end if;
end;
$blk$;
