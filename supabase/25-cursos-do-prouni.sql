-- ============================================================================
-- 25 — Os 83 cursos do ProUni
--
-- Rode depois do 24.
--
-- FONTE: "OPÇÕES DE CURSO PROUNI.xlsx", aba "DESCRITIVOS CURSOS" — 83 cursos
-- com habilitação, duração e modalidade. É a oferta real do ProUni na
-- UNIFATECIE e substitui os 11 cursos que tínhamos, tirados por amostragem do
-- relatório do MEC.
--
-- O QUE A PLANILHA NÃO TEM: código e-MEC e área de conhecimento.
--
--   * ÁREA DE CONHECIMENTO foi atribuída curso a curso, estendendo o
--     vocabulário que o ERP já mostrava ("SAÚDE E BEM-ESTAR", "NEGÓCIOS E
--     GESTÃO", "ENGENHARIAS E PRODUÇÃO", "CIÊNCIAS AGRÁRIAS"). Toda
--     licenciatura caiu em EDUCAÇÃO E LICENCIATURAS de propósito: é o recorte
--     que importa para a modalidade "professor da rede pública" do ProUni.
--
--   * CÓDIGO E-MEC deixa de ser obrigatório. Os cursos que já tínhamos mantêm
--     o código real, casando pelo nome; os demais ficam sem — inventar número
--     de e-MEC seria pior que não ter, porque pareceria verdadeiro. Por isso o
--     curso passa a ser identificado e exibido pelo NOME.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Estrutura
-- ---------------------------------------------------------------------------
alter table cursos add column if not exists duracao text;

comment on column cursos.duracao is
  'Duracao informada na planilha da oferta, ex.: "2,5 ANOS".';

alter table cursos alter column codigo_mec drop not null;

comment on column cursos.codigo_mec is
  'Codigo e-MEC quando conhecido. NULL na maioria: a planilha da oferta nao traz. Nao invente — o identificador de trabalho e o nome.';

-- As duas linhas de EDUCAÇÃO FÍSICA tinham o mesmo nome e só se distinguiam
-- pela formação. A planilha já as separa no nome; adotamos isso, e o nome
-- passa a ser identificador único.
update cursos set nome = 'EDUCAÇÃO FÍSICA - BACHARELADO'
 where nome = 'EDUCAÇÃO FÍSICA' and tipo_formacao = 'Bacharelado';
update cursos set nome = 'EDUCAÇÃO FÍSICA - LICENCIATURA'
 where nome = 'EDUCAÇÃO FÍSICA' and tipo_formacao = 'Licenciatura';

-- AGRONOMIA e ENGENHARIA AGRONÔMICA são o mesmo curso com dois nomes. Adota o
-- da planilha, preservando o código e-MEC real que a linha já carregava.
update cursos set nome = 'ENGENHARIA AGRONÔMICA' where nome = 'AGRONOMIA';

create unique index if not exists um_curso_por_nome on cursos (nome);


-- ---------------------------------------------------------------------------
-- 2. Os 83 da planilha
--
-- `on conflict (nome)` atualiza quem já existia — assim os que têm código
-- e-MEC real mantêm o código e ganham duração e área.
-- ---------------------------------------------------------------------------
insert into cursos (nome, tipo_formacao, duracao, modalidade, area_conhecimento, ativo)
select v.nome, v.formacao, v.duracao, v.modalidade, v.area, true
  from (values
    ('ADMINISTRAÇÃO', 'Bacharelado', '3 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('AGENTE COMUNITÁRIO', 'Tecnólogo', '2,5 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('ANÁLISE E DESENVOLVIMENTO DE SISTEMAS', 'Tecnólogo', '2 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('ARQUITETURA E URBANISMO', 'Bacharelado', '5 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('ARTES', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('ARTES VISUAIS', 'Bacharelado', '3 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('BIBLIOTECONOMIA', 'Bacharelado', '3 ANOS', 'EAD', 'CIÊNCIAS HUMANAS E SOCIAIS'),
    ('BIOMEDICINA', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('CIÊNCIAS BIOLÓGICAS - BACHARELADO', 'Bacharelado', '4 ANOS', 'Semipresencial', 'CIÊNCIAS EXATAS E DA NATUREZA'),
    ('CIÊNCIAS BIOLÓGICAS - LICENCIATURA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('CIÊNCIAS CONTÁBEIS', 'Bacharelado', '3 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('CIÊNCIAS DO FUTURO', 'Tecnólogo', '1,5 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('CIÊNCIAS ECONÔMICAS', 'Bacharelado', '3 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('COMÉRCIO EXTERIOR', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('DESIGN DE INTERIORES', 'Tecnólogo', '1,5 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('DESIGN DE MODA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('DESIGN DE PRODUTO', 'Tecnólogo', '1,5 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('DESIGN GRÁFICO', 'Tecnólogo', '1,5 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('EDUCAÇÃO ESPECIAL', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('EDUCAÇÃO FÍSICA - BACHARELADO', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('EDUCAÇÃO FÍSICA - LICENCIATURA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('ENGENHARIA AGRONÔMICA', 'Bacharelado', '5 ANOS', 'Semipresencial', 'CIÊNCIAS AGRÁRIAS'),
    ('ENGENHARIA AMBIENTAL E SANITÁRIA', 'Bacharelado', '5 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('ENGENHARIA CIVIL', 'Bacharelado', '5 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('ENGENHARIA DE COMPUTAÇÃO', 'Bacharelado', '4 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('ENGENHARIA DE PRODUÇÃO', 'Bacharelado', '5 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('ENGENHARIA DE SOFTWARE', 'Bacharelado', '4 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('ENGENHARIA ELÉTRICA', 'Bacharelado', '5 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('ENGENHARIA MECÂNICA', 'Bacharelado', '5 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('ESTÉTICA E COSMÉTICA', 'Tecnólogo', '2,5 ANOS', 'EAD', 'SAÚDE E BEM-ESTAR'),
    ('ESTUDOS TEÓRICOS PSICANALÍTICOS E SOCIAIS', 'Bacharelado', '4 ANOS', 'EAD', 'CIÊNCIAS HUMANAS E SOCIAIS'),
    ('FARMÁCIA', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('FILOSOFIA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('FISIOTERAPIA', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('FONOAUDIOLOGIA', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('GASTRONOMIA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'TURISMO E HOSPITALIDADE'),
    ('GEOGRAFIA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('GESTÃO AMBIENTAL', 'Tecnólogo', '2 ANOS', 'Semipresencial', 'CIÊNCIAS EXATAS E DA NATUREZA'),
    ('GESTÃO COMERCIAL', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('GESTÃO DA PRODUÇÃO INDUSTRIAL', 'Tecnólogo', '2,5 ANOS', 'EAD', 'ENGENHARIAS E PRODUÇÃO'),
    ('GESTÃO DA QUALIDADE', 'Tecnólogo', '1,5 ANOS', 'EAD', 'ENGENHARIAS E PRODUÇÃO'),
    ('GESTÃO DE NEGÓCIOS IMOBILIÁRIOS', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('GESTÃO DE RECURSOS HUMANOS', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('GESTÃO DE SEGURANÇA PRIVADA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'SEGURANÇA E SERVIÇOS'),
    ('GESTÃO DO AGRONEGÓCIO', 'Tecnólogo', '2,5 ANOS', 'EAD', 'CIÊNCIAS AGRÁRIAS'),
    ('GESTÃO FINANCEIRA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('GESTÃO HOSPITALAR', 'Tecnólogo', '3 ANOS', 'EAD', 'SAÚDE E BEM-ESTAR'),
    ('GESTÃO PÚBLICA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('HISTÓRIA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('HOTELARIA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'TURISMO E HOSPITALIDADE'),
    ('INTELIGÊNCIA ARTIFICIAL E MACHINE LEARNING', 'Tecnólogo', '2 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('INVESTIGAÇÃO FORENSE E PERÍCIA CRIMINAL', 'Tecnólogo', '2,5 ANOS', 'EAD', 'SEGURANÇA E SERVIÇOS'),
    ('JOGOS DIGITAIS', 'Tecnólogo', '2 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('JORNALISMO', 'Bacharelado', '4 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('LETRAS - LÍNGUA PORTUGUESA E LIBRAS', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('LETRAS - PORTUGUÊS E INGLÊS', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('LOGÍSTICA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('MARKETING', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('MATEMÁTICA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('MÚSICA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('NUTRIÇÃO', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('PEDAGOGIA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('PODOLOGIA', 'Tecnólogo', '2,5 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('PROCESSOS ESCOLARES', 'Tecnólogo', '2,5 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('PROCESSOS GERENCIAIS', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('PROCESSOS QUÍMICOS', 'Tecnólogo', '3 ANOS', 'Semipresencial', 'ENGENHARIAS E PRODUÇÃO'),
    ('PRODUÇÃO PUBLICITÁRIA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('PSICOPEDAGOGIA', 'Bacharelado', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('PUBLICIDADE E PROPAGANDA', 'Bacharelado', '4 ANOS', 'EAD', 'COMUNICAÇÃO E DESIGN'),
    ('QUÍMICA', 'Bacharelado', '3,5 ANOS', 'Semipresencial', 'CIÊNCIAS EXATAS E DA NATUREZA'),
    ('RADIOLOGIA', 'Tecnólogo', '3 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('SECRETARIADO', 'Tecnólogo', '1,5 ANOS', 'EAD', 'NEGÓCIOS E GESTÃO'),
    ('SEGURANÇA DA INFORMAÇÃO', 'Tecnólogo', '2 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('SEGURANÇA DO TRABALHO', 'Tecnólogo', '2,5 ANOS', 'EAD', 'ENGENHARIAS E PRODUÇÃO'),
    ('SEGURANÇA NO TRÂNSITO', 'Tecnólogo', '1,5 ANOS', 'EAD', 'SEGURANÇA E SERVIÇOS'),
    ('SEGURANÇA PÚBLICA', 'Tecnólogo', '1,5 ANOS', 'EAD', 'SEGURANÇA E SERVIÇOS'),
    ('SERVIÇO SOCIAL', 'Bacharelado', '4 ANOS', 'Semipresencial', 'CIÊNCIAS HUMANAS E SOCIAIS'),
    ('SISTEMAS DE INFORMAÇÃO', 'Bacharelado', '4 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('SISTEMAS PARA INTERNET', 'Tecnólogo', '2 ANOS', 'EAD', 'TECNOLOGIA DA INFORMAÇÃO'),
    ('SOCIOLOGIA', 'Licenciatura', '4 ANOS', 'Semipresencial', 'EDUCAÇÃO E LICENCIATURAS'),
    ('TEOLOGIA', 'Bacharelado', '3 ANOS', 'EAD', 'CIÊNCIAS HUMANAS E SOCIAIS'),
    ('TERAPIA OCUPACIONAL', 'Bacharelado', '4 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR'),
    ('TERAPIAS INTEGRATIVAS E COMPLEMENTARES', 'Tecnólogo', '2,5 ANOS', 'Semipresencial', 'SAÚDE E BEM-ESTAR')
  ) as v(nome, formacao, duracao, modalidade, area)
on conflict (nome) do update
   set tipo_formacao     = excluded.tipo_formacao,
       duracao           = excluded.duracao,
       modalidade        = excluded.modalidade,
       area_conhecimento = excluded.area_conhecimento,
       ativo             = true;


-- ---------------------------------------------------------------------------
-- 3. O que não está na oferta sai da lista
--
-- DIREITO, ODONTOLOGIA e PSICOLOGIA não constam da planilha do ProUni. Ficam
-- INATIVOS em vez de apagados: há candidato apontando para eles, e apagar
-- quebraria a ficha dele.
-- ---------------------------------------------------------------------------
update cursos set ativo = false
 where nome not in (select v.nome from (values
    ('ADMINISTRAÇÃO'),
    ('AGENTE COMUNITÁRIO'),
    ('ANÁLISE E DESENVOLVIMENTO DE SISTEMAS'),
    ('ARQUITETURA E URBANISMO'),
    ('ARTES'),
    ('ARTES VISUAIS'),
    ('BIBLIOTECONOMIA'),
    ('BIOMEDICINA'),
    ('CIÊNCIAS BIOLÓGICAS - BACHARELADO'),
    ('CIÊNCIAS BIOLÓGICAS - LICENCIATURA'),
    ('CIÊNCIAS CONTÁBEIS'),
    ('CIÊNCIAS DO FUTURO'),
    ('CIÊNCIAS ECONÔMICAS'),
    ('COMÉRCIO EXTERIOR'),
    ('DESIGN DE INTERIORES'),
    ('DESIGN DE MODA'),
    ('DESIGN DE PRODUTO'),
    ('DESIGN GRÁFICO'),
    ('EDUCAÇÃO ESPECIAL'),
    ('EDUCAÇÃO FÍSICA - BACHARELADO'),
    ('EDUCAÇÃO FÍSICA - LICENCIATURA'),
    ('ENGENHARIA AGRONÔMICA'),
    ('ENGENHARIA AMBIENTAL E SANITÁRIA'),
    ('ENGENHARIA CIVIL'),
    ('ENGENHARIA DE COMPUTAÇÃO'),
    ('ENGENHARIA DE PRODUÇÃO'),
    ('ENGENHARIA DE SOFTWARE'),
    ('ENGENHARIA ELÉTRICA'),
    ('ENGENHARIA MECÂNICA'),
    ('ESTÉTICA E COSMÉTICA'),
    ('ESTUDOS TEÓRICOS PSICANALÍTICOS E SOCIAIS'),
    ('FARMÁCIA'),
    ('FILOSOFIA'),
    ('FISIOTERAPIA'),
    ('FONOAUDIOLOGIA'),
    ('GASTRONOMIA'),
    ('GEOGRAFIA'),
    ('GESTÃO AMBIENTAL'),
    ('GESTÃO COMERCIAL'),
    ('GESTÃO DA PRODUÇÃO INDUSTRIAL'),
    ('GESTÃO DA QUALIDADE'),
    ('GESTÃO DE NEGÓCIOS IMOBILIÁRIOS'),
    ('GESTÃO DE RECURSOS HUMANOS'),
    ('GESTÃO DE SEGURANÇA PRIVADA'),
    ('GESTÃO DO AGRONEGÓCIO'),
    ('GESTÃO FINANCEIRA'),
    ('GESTÃO HOSPITALAR'),
    ('GESTÃO PÚBLICA'),
    ('HISTÓRIA'),
    ('HOTELARIA'),
    ('INTELIGÊNCIA ARTIFICIAL E MACHINE LEARNING'),
    ('INVESTIGAÇÃO FORENSE E PERÍCIA CRIMINAL'),
    ('JOGOS DIGITAIS'),
    ('JORNALISMO'),
    ('LETRAS - LÍNGUA PORTUGUESA E LIBRAS'),
    ('LETRAS - PORTUGUÊS E INGLÊS'),
    ('LOGÍSTICA'),
    ('MARKETING'),
    ('MATEMÁTICA'),
    ('MÚSICA'),
    ('NUTRIÇÃO'),
    ('PEDAGOGIA'),
    ('PODOLOGIA'),
    ('PROCESSOS ESCOLARES'),
    ('PROCESSOS GERENCIAIS'),
    ('PROCESSOS QUÍMICOS'),
    ('PRODUÇÃO PUBLICITÁRIA'),
    ('PSICOPEDAGOGIA'),
    ('PUBLICIDADE E PROPAGANDA'),
    ('QUÍMICA'),
    ('RADIOLOGIA'),
    ('SECRETARIADO'),
    ('SEGURANÇA DA INFORMAÇÃO'),
    ('SEGURANÇA DO TRABALHO'),
    ('SEGURANÇA NO TRÂNSITO'),
    ('SEGURANÇA PÚBLICA'),
    ('SERVIÇO SOCIAL'),
    ('SISTEMAS DE INFORMAÇÃO'),
    ('SISTEMAS PARA INTERNET'),
    ('SOCIOLOGIA'),
    ('TEOLOGIA'),
    ('TERAPIA OCUPACIONAL'),
    ('TERAPIAS INTEGRATIVAS E COMPLEMENTARES')
  ) as v(nome));


-- ---------------------------------------------------------------------------
-- 4. Buscar o curso pelo nome
--
-- A landing mandava "código – NOME" e o banco achava o curso por
-- `split_part(curso, ' ', 1)`. Sem código na maioria, isso quebraria.
-- ---------------------------------------------------------------------------
create or replace function curso_por_rotulo(p_rotulo text)
returns uuid
language sql stable security definer set search_path = public as $fn$
  -- Aceita o nome puro e também o formato antigo "código – NOME", para não
  -- quebrar o que ainda esteja mandando do jeito velho.
  select c.id from cursos c
   where c.nome = btrim(regexp_replace(p_rotulo,
           '^[[:space:]]*[0-9]+[[:space:]]*[^[:alnum:]][[:space:]]*', ''))
   limit 1;
$fn$;

revoke all on function curso_por_rotulo(text) from public;


-- ---------------------------------------------------------------------------
-- 5. A inscrição passa a achar o curso pelo nome
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
-- 6. As telas passam a exibir o nome, com o código só quando existe
-- ---------------------------------------------------------------------------
create or replace function rotulo_do_curso(p_curso_id uuid)
returns text
language sql stable security definer set search_path = public as $fn$
  select case when c.codigo_mec is null then c.nome
              else c.codigo_mec || ' – ' || c.nome end
    from cursos c where c.id = p_curso_id;
$fn$;

create or replace function erp_listar_candidatos()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nome), '[]'::jsonb)
    from (
      select c.id, c.protocolo, c.nome, c.cpf, c.email,
             c.created_at                              as inscricao,
             rotulo_do_curso(c.curso_id)               as curso,
             po.nome                                   as filial_captacao,
             po.cidade || ', ' || po.uf                as cidade_filial,
             po.tipo                                   as tipo_filial,
             i.status::text                            as status,
             cc.nome                                   as concurso,
             ps.nome                                   as processo_seletivo,
             i.modalidade_concorrencia                 as cota
        from candidatos c
        left join inscricoes i  on i.candidato_id = c.id
        left join concursos cc  on cc.id = i.concurso_id
        left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
        left join polos po      on po.id = c.polo_id
    ) x;
$fn$;

create or replace function erp_candidato(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select to_jsonb(x) from (
    select c.id, c.protocolo, c.nome, c.cpf, c.rg, c.nascimento, c.sexo,
           r.nome as raca, c.email, c.ddd, c.telefone,
           c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
           c.uf_naturalidade, c.municipio_naturalidade,
           e.nome as escolaridade, c.ano_conclusao_em,
           rotulo_do_curso(c.curso_id) as curso,
           cu.area_conhecimento, cu.tipo_formacao, cu.modalidade, cu.duracao,
           po.nome as polo, po.cidade as polo_cidade, po.uf as polo_uf, po.tipo as polo_tipo,
           pl.nome as plano_pagamento,
           c.aceite_cota, c.created_at, c.updated_at,
           i.status::text as status, i.modalidade_concorrencia as cota, i.chamada,
           cc.nome as concurso, ps.nome as processo_seletivo,
           (select count(*) from membros_grupo_familiar m where m.candidato_id = c.id) as familiares
      from candidatos c
      left join racas r on r.codigo = c.raca_codigo
      left join escolaridades e on e.codigo = c.escolaridade_codigo
      left join cursos cu on cu.id = c.curso_id
      left join polos po on po.id = c.polo_id
      left join planos_pagamento pl on pl.id = c.plano_pagamento_id
      left join inscricoes i on i.candidato_id = c.id
      left join concursos cc on cc.id = i.concurso_id
      left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
     where c.id = p_id
  ) x;
$fn$;

revoke all on function rotulo_do_curso(uuid) from public;


-- ---------------------------------------------------------------------------
-- 7. Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare v_ativos int; v_sem_area int; v_com_mec int; v_areas int; v_teste text;
begin
  select count(*) into v_ativos from cursos where ativo;
  select count(*) into v_sem_area from cursos where ativo and area_conhecimento is null;
  select count(*) into v_com_mec from cursos where ativo and codigo_mec is not null;
  select count(distinct area_conhecimento) into v_areas from cursos where ativo;

  if v_ativos <> 83 then
    raise exception 'Esperado 83 cursos ativos, ha %', v_ativos;
  end if;
  if v_sem_area > 0 then
    raise exception '% curso(s) sem area de conhecimento', v_sem_area;
  end if;

  -- O formato antigo "codigo – NOME" tem de continuar resolvendo.
  if curso_por_rotulo('1178816 – ADMINISTRAÇÃO') is null then
    raise exception 'curso_por_rotulo nao resolveu o formato antigo';
  end if;
  if curso_por_rotulo('PEDAGOGIA') is null then
    raise exception 'curso_por_rotulo nao resolveu o nome puro';
  end if;

  raise notice '83 cursos ativos, % areas, % com codigo e-MEC real', v_areas, v_com_mec;
end;
$blk$;
