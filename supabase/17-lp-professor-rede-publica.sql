-- ============================================================================
-- 17 — A inscrição grava a quarta declaração
--
-- Rode depois do 16.
--
-- `lp_criar_candidato` ganha `declara_professor_rede_publica`. O resto do
-- caminho já funciona sozinho: `gendocs_distribuir_candidato` chama
-- `modulo_do_candidato`, que lê as quatro colunas e devolve o módulo da
-- combinação. Nada mais precisa saber que existe uma declaração nova.
--
-- O retorno passa a trazer `modulo` — a tela de confirmação diz em qual módulo
-- o candidato caiu, que agora é informação útil (antes eram sempre "PROUNI +
-- os condicionais").
-- ============================================================================

create or replace function lp_criar_candidato(p_dados jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_cpf       text := regexp_replace(p_dados->>'cpf', '\D', '', 'g');
  v_cota      boolean := coalesce((p_dados->>'aceite_cota')::boolean, false);
  v_matricula boolean := coalesce((p_dados->>'declara_encerramento_matricula')::boolean, false);
  v_beneficio boolean := coalesce((p_dados->>'declara_encerramento_beneficio')::boolean, false);
  v_professor boolean := coalesce((p_dados->>'declara_professor_rede_publica')::boolean, false);
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

  insert into candidatos (
    cpf, nome, rg, nascimento, sexo, raca_codigo,
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
    v_cpf, p_dados->>'nome', p_dados->>'rg', (p_dados->>'nascimento')::date,
    p_dados->>'sexo', r.codigo,
    p_dados->>'uf_naturalidade', p_dados->>'municipio_naturalidade',
    p_dados->>'email', p_dados->>'ddd', p_dados->>'telefone',
    regexp_replace(p_dados->>'cep', '\D', '', 'g'),
    p_dados->>'logradouro', p_dados->>'numero', nullif(p_dados->>'complemento', ''),
    p_dados->>'bairro', p_dados->>'cidade', p_dados->>'uf',
    e.codigo, (p_dados->>'ano_conclusao')::int, c.id, pl.id,
    true, now(),
    coalesce((p_dados->>'aceite_contato')::boolean, false),
    case when coalesce((p_dados->>'aceite_contato')::boolean, false) then now() end,
    v_cota, case when v_cota then now() end,
    v_matricula, v_beneficio, v_professor
  from racas r
  left join escolaridades e on e.nome = p_dados->>'escolaridade'
  left join cursos c        on c.codigo_mec = split_part(p_dados->>'curso', ' ', 1)
  left join planos_pagamento pl on pl.nome = p_dados->>'plano'
  where r.nome = p_dados->>'raca'
  returning id, protocolo into v_cand, v_protocolo;

  if v_cand is null then
    raise exception 'Não foi possível montar o cadastro — confira raça, curso e plano'
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
$$;
