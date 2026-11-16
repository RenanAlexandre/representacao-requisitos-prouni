-- ============================================================================
-- 07 — Os quatro módulos do ProUni, anexo de documentos e a camada de IA
--
-- Rode DEPOIS do 06, em execução separada.
--
-- O QUE MUDA DE CONCEITO
-- ----------------------
-- Antes os módulos eram por perfil de pessoa (titular cotista / sem cota /
-- familiar). Agora são por CATEGORIA DOCUMENTAL: todo candidato entra no
-- módulo PROUNI, e entra também em cada módulo condicional que ele marcou
-- "Sim" na inscrição — os mesmos "Sim" que ele declarou no Sispro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Estrutura
-- ---------------------------------------------------------------------------

-- As três declarações condicionais da inscrição. `aceite_cota` já existia e
-- continua sendo a de raça/cor.
alter table candidatos
  add column if not exists declara_encerramento_matricula boolean not null default false,
  add column if not exists declara_encerramento_beneficio boolean not null default false;

comment on column candidatos.aceite_cota is
  'Declarou-se cotista PPI no Sispro. Entra no módulo "ProUni: Declaração de Raça e Cor".';
comment on column candidatos.declara_encerramento_matricula is
  'Declarou vínculo a encerrar com outra instituição. Entra no módulo de Encerramento de Matrícula.';
comment on column candidatos.declara_encerramento_beneficio is
  'Declarou bolsa ProUni ou FIES a encerrar. Entra no módulo de Encerramento do Usufruto.';

-- Descrição por documento (o "Descrição que é pra CLT'S" da lista) e a relação
-- de substituição entre documentos, que antes era só um array de nomes soltos.
alter table documentos_exigidos
  add column if not exists descricao text,
  add column if not exists substitui_id uuid references documentos_exigidos(id) on delete set null;

comment on column documentos_exigidos.substitui_id is
  'Aponta para o documento que este substitui. Ex.: CONTRACHEQUE substitui HOLERITES; CNH substitui RG e CPF.';

-- `aplica_a` ganha 'titular': na lista do ProUni, Ficha de Inscrição e
-- Histórico Escolar são só do candidato — o familiar entrega identificação e
-- renda, não o histórico escolar dele.
alter table documentos_exigidos drop constraint if exists documentos_exigidos_aplica_a_check;
alter table documentos_exigidos
  add constraint documentos_exigidos_aplica_a_check
  check (aplica_a in ('todos', 'titular', 'maiores', 'menores'));

-- ----- A camada de IA -----
--
-- A IA lê o arquivo anexado e responde duas coisas: se ele é mesmo o documento
-- alegado, e o que conseguiu extrair dele. O que ela aprova segue para o
-- analista; o que ela reprova volta para o candidato sem consumir tempo de
-- análise humana.
alter table gendocs_documentos_coleta
  add column if not exists ia_status      status_documento,
  add column if not exists ia_motivo      text,
  add column if not exists ia_confianca   numeric(4,3) check (ia_confianca between 0 and 1),
  add column if not exists ia_extraido    jsonb,
  add column if not exists ia_analisado_em timestamptz,
  -- Falso quando a IA estava desligada no momento do envio — o documento foi
  -- aprovado sem passar por ela. Sem isto, não dá para distinguir depois o que
  -- a IA aprovou de fato do que só passou direto.
  add column if not exists ia_aplicada    boolean not null default false;

-- Parâmetros do ambiente. Hoje só a chave da IA.
create table if not exists configuracoes (
  chave       text primary key,
  valor       jsonb not null,
  descricao   text,
  updated_at  timestamptz not null default now()
);

insert into configuracoes (chave, valor, descricao) values
  ('ia_ativa', 'true'::jsonb,
   'Liga a verificação por IA no anexo de documentos. DESLIGADA, todo anexo é aprovado direto — atalho de desenvolvimento, não comportamento de produção.')
on conflict (chave) do nothing;

alter table configuracoes enable row level security;
-- Sem policy: só as funções abaixo leem e escrevem.


-- ---------------------------------------------------------------------------
-- 2. Os quatro módulos
--
-- Os anteriores saem. Como no 04, os participantes têm de sair antes do
-- módulo: `modulos_gendocs` cascateia por dois caminhos que se cruzam.
-- ---------------------------------------------------------------------------

delete from gendocs_participantes
 where modulo_id in (select id from modulos_gendocs where chamada = 'ProUni 2027.1');
delete from modulos_gendocs where chamada = 'ProUni 2027.1';
delete from gendocs_grupos
 where not exists (select 1 from gendocs_participantes p where p.grupo_id = gendocs_grupos.id);

insert into modulos_gendocs
  (slug, nome, descricao, perfil, chamada, envio_inicio, envio_fim,
   situacao, ativo, destaque, link_preenchimento)
values
  ('prouni', 'PROUNI',
   'Coleta documental dos candidatos pré-selecionados no ProUni. Reúne identificação, comprovação de renda e escolaridade do candidato e do grupo familiar.',
   'prouni', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A'),

  ('prouni-raca-e-cor', 'PROUNI: Declaração de Raça e Cor',
   'Comprovação da autodeclaração de raça e cor. Só entram aqui os candidatos que se declararam cotistas PPI no Sispro.',
   'raca_cor', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A'),

  ('prouni-encerramento-matricula', 'PROUNI: Declaração de Encerramento de Matrícula',
   'Comprovação do encerramento de vínculo com outra instituição de ensino. Só entram aqui os candidatos que declararam esse vínculo no Sispro.',
   'encerramento_matricula', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A'),

  ('prouni-encerramento-beneficio', 'PROUNI: Encerramento do Usufruto de Benefício',
   'Comprovação do encerramento do usufruto de bolsa ProUni ou do FIES. Só entram aqui os candidatos que declararam esse benefício no Sispro.',
   'encerramento_beneficio', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A');

insert into modulos_sla (modulo_id, status, horas)
select m.id, s.status, s.horas
  from modulos_gendocs m,
  (values ('nova'::status_coleta, 24), ('aberta', 72), ('progresso', 72),
          ('recebida', 48), ('finalizada', 0)) as s(status, horas)
 where m.chamada = 'ProUni 2027.1'
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 3. Lista documental do módulo PROUNI
-- ---------------------------------------------------------------------------

insert into documentos_exigidos
  (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a)
select m.id, d.seq, d.nome, d.obrig, d.descricao, d.aplica
  from modulos_gendocs m,
  (values
    (1,  'Ficha de Inscrição', true,
         'As duas páginas da ficha emitida pelo Sispro.', 'titular'),
    (2,  'CNH', false,
         'Substitui o RG e o CPF quando enviada.', 'todos'),
    (3,  'RG', true,
         'Frente e verso no mesmo arquivo.', 'todos'),
    (4,  'CPF', true, null, 'todos'),
    (5,  'Estado Civil', true,
         'Certidão de nascimento, casamento, união estável, averbação de divórcio ou certidão de óbito.', 'todos'),
    (6,  'Histórico do Ensino Médio + Certificado', true,
         'Se a escola ainda não emitiu, vale declaração assinada, carimbada e em papel timbrado.', 'titular'),
    (7,  'Carteira de Trabalho - CTPS', true,
         'Se não tiver, enviar declaração de esclarecimento.', 'todos'),
    (8,  'Declaração de Imposto de Renda', true,
         'Declaração completa com o recibo de entrega. Quem não é obrigado a declarar envia a Certidão Negativa da Receita.', 'todos'),
    (9,  'Comprovante de renda - HOLERITES', true,
         'Para quem trabalha com carteira assinada (CLT).', 'todos'),
    (10, 'Comprovante de renda - CONTRACHEQUE', false,
         'Para funcionários públicos. Substitui os holerites.', 'todos'),
    (11, 'Comprovante de renda - SIMEI, DECORE, DECLARAÇÃO DE RENDIMENTOS', false,
         'Para trabalhadores autônomos. Substitui os holerites.', 'todos'),
    (12, 'Comprovante de renda - CONTRATO SOCIAL + DECORE', false,
         'Para proprietários de empresa. Substitui os holerites.', 'todos'),
    (13, 'Comprovante de renda - EXTRATOS PREVIDÊNCIA/INSS', false,
         'Para aposentados ou pensionistas. Substitui os holerites.', 'todos'),
    (14, 'Comprovante de renda - NOTA DE PRODUTOR', false,
         'Últimos 12 meses. Para agricultores. Substitui os holerites.', 'todos'),
    (15, 'Comprovante de renda - RECIBOS DE ALUGUEL', false,
         'Últimos 12 meses. Para quem é locador de imóveis ou itens. Substitui os holerites.', 'todos')
  ) as d(seq, nome, obrig, descricao, aplica)
 where m.slug = 'prouni';

-- Os condicionais: um documento cada.
insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, descricao)
select m.id, 1,
       'Documento comprobatório de Raça e Cor - PPI', true,
       'Autodeclaração de raça e cor assinada, conforme o modelo da Secretaria.'
  from modulos_gendocs m where m.slug = 'prouni-raca-e-cor';

insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, descricao)
select m.id, 1,
       'Documento comprobatório de encerramento de vínculo com outra instituição', true,
       'Declaração da instituição anterior confirmando o encerramento da matrícula.'
  from modulos_gendocs m where m.slug = 'prouni-encerramento-matricula';

insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, descricao)
select m.id, 1,
       'Documento comprobatório de encerramento do usufruto da bolsa ProUni ou do FIES', true,
       'Declaração de encerramento emitida pela instituição que concedeu o benefício.'
  from modulos_gendocs m where m.slug = 'prouni-encerramento-beneficio';

-- Substituições: CNH cobre RG e CPF; cada comprovante alternativo cobre o
-- holerite. Fica como FK, não como texto solto — assim a tela sabe qual campo
-- destravar quando o substituto é enviado.
update documentos_exigidos d
   set substitui_id = alvo.id
  from documentos_exigidos alvo, modulos_gendocs m
 where d.modulo_id = m.id and alvo.modulo_id = m.id and m.slug = 'prouni'
   and (
     (d.nome = 'CNH' and alvo.nome = 'RG')
     or (d.nome like 'Comprovante de renda - %'
         and d.nome <> 'Comprovante de renda - HOLERITES'
         and alvo.nome = 'Comprovante de renda - HOLERITES')
   );


-- ---------------------------------------------------------------------------
-- 4. Distribuição do candidato pelos módulos
-- ---------------------------------------------------------------------------

-- Abre a coleta do candidato no módulo PROUNI e em cada condicional que ele
-- marcou "Sim". Idempotente: rodar de novo não duplica participante.
create or replace function gendocs_distribuir_candidato(p_candidato_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_grupo   uuid;
  v_nome    text;
  v_email   text;
  v_prot    text;
  v_chamada text;
  v_perfis  perfil_modulo[];
  v_perfil  perfil_modulo;
  v_abertas int := 0;
begin
  select c.nome, c.email, c.protocolo,
         array_remove(array[
           'prouni'::perfil_modulo,
           case when c.aceite_cota                    then 'raca_cor'::perfil_modulo end,
           case when c.declara_encerramento_matricula then 'encerramento_matricula'::perfil_modulo end,
           case when c.declara_encerramento_beneficio then 'encerramento_beneficio'::perfil_modulo end
         ], null)
    into v_nome, v_email, v_prot, v_perfis
    from candidatos c where c.id = p_candidato_id;

  if v_nome is null then
    raise exception 'Candidato % não encontrado', p_candidato_id using errcode = 'P0002';
  end if;

  select m.chamada into v_chamada
    from modulos_gendocs m where m.perfil = 'prouni' and m.ativo limit 1;
  if v_chamada is null then
    raise exception 'Não há módulo PROUNI ativo' using errcode = 'P0002';
  end if;

  select g.id into v_grupo from gendocs_grupos g where g.candidato_id = p_candidato_id limit 1;
  if v_grupo is null then
    insert into gendocs_grupos (candidato_id, chamada, protocolo)
    values (p_candidato_id, v_chamada, v_prot)
    returning id into v_grupo;
  end if;

  foreach v_perfil in array v_perfis loop
    if not exists (
      select 1 from gendocs_participantes p
        join modulos_gendocs m on m.id = p.modulo_id
       where p.grupo_id = v_grupo and p.titular and m.perfil = v_perfil
    ) then
      perform gendocs_abrir_coleta(v_grupo, v_perfil, true, p_candidato_id, null,
                                   v_nome, v_email, null, true);
      v_abertas := v_abertas + 1;
    end if;
  end loop;

  return v_abertas;
end;
$$;

-- `gendocs_abrir_coleta` ganha o identificador por módulo: o mesmo titular
-- agora aparece em vários módulos, e `<protocolo>-T` colidiria.
create or replace function gendocs_abrir_coleta(
  p_grupo_id       uuid,
  p_perfil         perfil_modulo,
  p_titular        boolean,
  p_candidato_id   uuid,
  p_membro_id      uuid,
  p_nome           text,
  p_email          text,
  p_parentesco     text,
  p_maior_de_idade boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_modulo_id    uuid;
  v_participante uuid;
  v_coleta       uuid;
  v_protocolo    text;
  v_sufixo       text;
  v_seq          int;
  v_sla          int;
begin
  select m.id into v_modulo_id
    from modulos_gendocs m
    join gendocs_grupos g on g.chamada = m.chamada
   where g.id = p_grupo_id and m.perfil = p_perfil and m.ativo;

  if v_modulo_id is null then
    raise exception 'Não há módulo ativo com o perfil % para esta chamada', p_perfil
      using errcode = 'P0002';
  end if;

  select protocolo into v_protocolo from gendocs_grupos where id = p_grupo_id;

  if p_titular then
    v_sufixo := '-T';
  else
    select count(*) + 1 into v_seq
      from gendocs_participantes p
     where p.grupo_id = p_grupo_id and not p.titular and p.modulo_id = v_modulo_id;
    v_sufixo := '-F' || v_seq;
  end if;

  -- O identificador precisa ser único por MÓDULO, não por grupo: o titular
  -- entra em até quatro módulos com o mesmo protocolo.
  insert into gendocs_participantes
    (modulo_id, grupo_id, titular, candidato_id, membro_id,
     nome, email, parentesco, identificador_externo)
  values
    (v_modulo_id, p_grupo_id, p_titular, p_candidato_id, p_membro_id,
     p_nome, p_email, p_parentesco,
     v_protocolo || v_sufixo || '@' || p_perfil::text)
  returning id into v_participante;

  select horas into v_sla
    from modulos_sla where modulo_id = v_modulo_id and status = 'aberta';

  insert into gendocs_coletas (participante_id, status, aberta_em, prazo_em)
  values (v_participante, 'aberta', now(),
          now() + (coalesce(v_sla, 72) || ' hours')::interval)
  returning id into v_coleta;

  insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
  select v_coleta, d.id, 'pendente'
    from documentos_exigidos d
   where d.modulo_id = v_modulo_id
     and (d.aplica_a = 'todos'
          or (d.aplica_a = 'titular'  and p_titular)
          or (d.aplica_a = 'maiores'  and (p_titular or p_maior_de_idade))
          or (d.aplica_a = 'menores'  and not p_titular and not p_maior_de_idade));

  return v_coleta;
end;
$$;

-- Familiar continua entrando no módulo PROUNI (identificação e renda dele
-- fazem parte da comprovação do grupo). `garantir_grupo` passa a delegar a
-- distribuição, para não duplicar a regra.
create or replace function garantir_grupo(p_candidato_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_grupo uuid;
begin
  perform gendocs_distribuir_candidato(p_candidato_id);
  select g.id into v_grupo from gendocs_grupos g where g.candidato_id = p_candidato_id limit 1;
  return v_grupo;
end;
$$;

create or replace function portal_inserir_familiar(
  p_token      uuid,
  p_nome       text,
  p_nascimento date,
  p_parentesco text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid := sessao_candidato(p_token);
  v_membro uuid;
  v_grupo  uuid;
  v_codigo text;
  v_email  text;
  v_maior  boolean := maior_de_idade(p_nascimento);
begin
  select codigo into v_codigo from parentescos where nome = p_parentesco;
  if v_codigo is null then
    raise exception 'Parentesco inválido: %', p_parentesco using errcode = '22023';
  end if;

  insert into membros_grupo_familiar (candidato_id, nome, nascimento, parentesco_codigo)
  values (v_id, p_nome, p_nascimento, v_codigo)
  returning id into v_membro;

  v_grupo := garantir_grupo(v_id);
  select c.email into v_email from candidatos c where c.id = v_id;

  -- Só no módulo PROUNI: os condicionais são declarações do candidato, não do
  -- familiar.
  perform gendocs_abrir_coleta(v_grupo, 'prouni', false, null, v_membro,
                               p_nome, v_email, p_parentesco, v_maior);

  return jsonb_build_object(
    'membro_id', v_membro,
    'maior_de_idade', v_maior,
    'email_notificacao', v_email);
end;
$$;

-- A inscrição passa a gravar as três declarações e a delegar a distribuição.
create or replace function lp_criar_candidato(p_dados jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_cpf       text := regexp_replace(p_dados->>'cpf', '\D', '', 'g');
  v_cota      boolean := coalesce((p_dados->>'aceite_cota')::boolean, false);
  v_matricula boolean := coalesce((p_dados->>'declara_encerramento_matricula')::boolean, false);
  v_beneficio boolean := coalesce((p_dados->>'declara_encerramento_beneficio')::boolean, false);
  v_cand      uuid;
  v_protocolo text;
  v_concurso  uuid;
  v_token     uuid;
  v_ps_nome   text;
  v_modulos   int;
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
    declara_encerramento_matricula, declara_encerramento_beneficio
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
    v_matricula, v_beneficio
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

  insert into sessoes_portal (candidato_id) values (v_cand) returning token into v_token;

  return jsonb_build_object(
    'candidato_id', v_cand, 'protocolo', v_protocolo, 'token', v_token,
    'processo', v_ps_nome, 'cotista', v_cota, 'modulos', v_modulos);
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Anexo de documentos e a verificação por IA
-- ---------------------------------------------------------------------------

create or replace function demo_ia_ativa() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (valor)::boolean from configuracoes where chave = 'ia_ativa'), true);
$$;

create or replace function demo_definir_ia(p_ativa boolean) returns boolean
language sql security definer set search_path = public as $$
  insert into configuracoes (chave, valor, updated_at)
       values ('ia_ativa', to_jsonb(p_ativa), now())
  on conflict (chave) do update set valor = to_jsonb(p_ativa), updated_at = now()
  returning (valor)::boolean;
$$;

/*
 * Registra um anexo e devolve o veredito.
 *
 * O parecer da IA chega de fora (`p_ia_status`, `p_ia_motivo`,
 * `p_ia_confianca`, `p_ia_extraido`) porque quem lê o arquivo é o cliente ou,
 * no futuro, um worker — o banco não faz OCR. Esta função é a fronteira: ela
 * grava o arquivo, o parecer, e decide o status resultante.
 *
 * Com a IA desligada o documento entra como `aprovado_ia` com
 * `ia_aplicada = false` — assim continua dando para separar depois o que a IA
 * aprovou de fato do que só passou direto no ambiente de teste.
 */
create or replace function portal_anexar_documento(
  p_token          uuid,
  p_documento_coleta_id uuid,
  p_storage_path   text,
  p_nome_original  text,
  p_mime           text,
  p_tamanho        bigint,
  p_hash           text default null,
  p_ia_status      text default null,
  p_ia_motivo      text default null,
  p_ia_confianca   numeric default null,
  p_ia_extraido    jsonb default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid := sessao_candidato(p_token);
  v_versao  int;
  v_arquivo uuid;
  v_ia      boolean := demo_ia_ativa();
  v_status  status_documento;
  v_motivo  text;
begin
  -- O documento tem de ser do grupo de quem está pedindo.
  if not exists (
    select 1 from gendocs_documentos_coleta dc
      join gendocs_coletas ct on ct.id = dc.coleta_id
      join gendocs_participantes p on p.id = ct.participante_id
      join gendocs_grupos g on g.id = p.grupo_id
      join modulos_gendocs m on m.id = p.modulo_id
     where dc.id = p_documento_coleta_id
       and g.candidato_id = v_id
       and current_date between m.envio_inicio and m.envio_fim
       and dc.status <> 'aprovado'
  ) then
    raise exception 'Documento fora do seu grupo, fora do prazo, ou já aprovado pelo analista'
      using errcode = '42501';
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao
    from gendocs_arquivos where documento_coleta_id = p_documento_coleta_id;

  insert into gendocs_arquivos
    (documento_coleta_id, versao, storage_path, nome_original, mime, tamanho_bytes,
     hash_sha256, enviado_por)
  values
    (p_documento_coleta_id, v_versao, p_storage_path, p_nome_original, p_mime, p_tamanho,
     p_hash, 'candidato')
  returning id into v_arquivo;

  if v_ia then
    v_status := coalesce(nullif(p_ia_status, '')::status_documento, 'aprovado_ia');
    v_motivo := p_ia_motivo;
  else
    -- IA desligada: passa direto, e o motivo diz por quê.
    v_status := 'aprovado_ia';
    v_motivo := 'Verificação por IA desligada no ambiente — anexo aceito sem análise automática.';
  end if;

  update gendocs_documentos_coleta
     set arquivo_id      = v_arquivo,
         enviado_em      = now(),
         status          = v_status,
         motivo_recusa   = case when v_status = 'reprovado_ia' then v_motivo end,
         ia_status       = v_status,
         ia_motivo       = v_motivo,
         ia_confianca    = case when v_ia then p_ia_confianca end,
         ia_extraido     = case when v_ia then p_ia_extraido end,
         ia_analisado_em = now(),
         ia_aplicada     = v_ia,
         tentativas      = tentativas + 1
   where id = p_documento_coleta_id;

  -- A coleta anda para "em progresso" no primeiro anexo.
  update gendocs_coletas ct
     set status = 'progresso',
         primeiro_envio_em = coalesce(ct.primeiro_envio_em, now())
    from gendocs_documentos_coleta dc
   where dc.id = p_documento_coleta_id and ct.id = dc.coleta_id
     and ct.status in ('nova', 'aberta');

  return jsonb_build_object(
    'arquivo_id', v_arquivo, 'versao', v_versao,
    'status', v_status, 'motivo', v_motivo, 'ia_aplicada', v_ia);
end;
$$;

create or replace function portal_remover_anexo(p_token uuid, p_documento_coleta_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  if not exists (
    select 1 from gendocs_documentos_coleta dc
      join gendocs_coletas ct on ct.id = dc.coleta_id
      join gendocs_participantes p on p.id = ct.participante_id
      join gendocs_grupos g on g.id = p.grupo_id
     where dc.id = p_documento_coleta_id and g.candidato_id = v_id
       and dc.status <> 'aprovado'
  ) then
    raise exception 'Documento fora do seu grupo ou já aprovado pelo analista'
      using errcode = '42501';
  end if;

  update gendocs_documentos_coleta
     set arquivo_id = null, enviado_em = null, status = 'pendente',
         motivo_recusa = null, ia_status = null, ia_motivo = null,
         ia_confianca = null, ia_extraido = null, ia_analisado_em = null,
         ia_aplicada = false
   where id = p_documento_coleta_id;

  delete from gendocs_arquivos where documento_coleta_id = p_documento_coleta_id;
end;
$$;

-- A coleta de um participante, com tudo o que a tela do aluno precisa.
create or replace function portal_coleta(p_token uuid, p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := sessao_candidato(p_token);
begin
  return (
    select jsonb_build_object(
      'candidato', (select c.nome from candidatos c where c.id = v_id),
      'modulo', to_jsonb(mm),
      'ia_ativa', demo_ia_ativa(),
      'participante_id', pp.id,
      'status_coleta', ct.status::text,
      'documentos', coalesce((
        select jsonb_agg(to_jsonb(x) order by x.sequencia)
          from (
            select de.id as documento_id, dc.id as documento_coleta_id,
                   de.sequencia, de.nome, de.obrigatorio, de.descricao,
                   sub.nome as substitui,
                   dc.status::text as status, dc.motivo_recusa, dc.enviado_em,
                   dc.ia_aplicada, dc.ia_confianca,
                   a.nome_original, a.tamanho_bytes, a.storage_path
              from gendocs_documentos_coleta dc
              join documentos_exigidos de on de.id = dc.documento_id
              left join documentos_exigidos sub on sub.id = de.substitui_id
              left join gendocs_arquivos a on a.id = dc.arquivo_id
             where dc.coleta_id = ct.id
          ) x
      ), '[]'::jsonb))
    from modulos_gendocs mm
    join gendocs_participantes pp on pp.modulo_id = mm.id
    join gendocs_grupos g on g.id = pp.grupo_id
    join gendocs_coletas ct on ct.participante_id = pp.id
   where mm.slug = p_slug and g.candidato_id = v_id and pp.titular
   limit 1
  );
end;
$$;

-- Finaliza a coleta — o "Enviar para Análise". Só passa com os obrigatórios
-- resolvidos, direto ou por substituto.
create or replace function portal_enviar_para_analise(p_token uuid, p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := sessao_candidato(p_token);
  v_coleta   uuid;
  v_faltando int;
begin
  select ct.id into v_coleta
    from gendocs_coletas ct
    join gendocs_participantes p on p.id = ct.participante_id
    join gendocs_grupos g on g.id = p.grupo_id
    join modulos_gendocs m on m.id = p.modulo_id
   where m.slug = p_slug and g.candidato_id = v_id and p.titular;

  if v_coleta is null then
    raise exception 'Coleta não encontrada' using errcode = 'P0002';
  end if;

  -- Obrigatório pendente só conta se nenhum documento que o substitui foi
  -- enviado (holerite coberto por contracheque, RG coberto por CNH).
  select count(*) into v_faltando
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
   where dc.coleta_id = v_coleta
     and de.obrigatorio
     and dc.status in ('pendente', 'reprovado', 'reprovado_ia')
     and not exists (
       select 1 from gendocs_documentos_coleta d2
         join documentos_exigidos e2 on e2.id = d2.documento_id
        where d2.coleta_id = v_coleta and e2.substitui_id = de.id
          and d2.status not in ('pendente', 'reprovado', 'reprovado_ia')
     );

  if v_faltando > 0 then
    return jsonb_build_object('ok', false, 'faltando', v_faltando);
  end if;

  update gendocs_coletas
     set status = 'recebida', recebida_em = now()
   where id = v_coleta;

  return jsonb_build_object('ok', true, 'faltando', 0);
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Permissões
-- ---------------------------------------------------------------------------

do $$
declare f text;
begin
  for f in
    select 'gendocs_distribuir_candidato(uuid)'
    union all select 'demo_ia_ativa()'
    union all select 'demo_definir_ia(boolean)'
    union all select 'portal_anexar_documento(uuid,uuid,text,text,text,bigint,text,text,text,numeric,jsonb)'
    union all select 'portal_remover_anexo(uuid,uuid)'
    union all select 'portal_coleta(uuid,text)'
    union all select 'portal_enviar_para_analise(uuid,text)'
  loop
    execute format('revoke all on function %s from public', f);
  end loop;
end;
$$;

grant execute on function demo_ia_ativa()                    to anon;
grant execute on function demo_definir_ia(boolean)           to anon;
grant execute on function portal_coleta(uuid, text)          to anon;
grant execute on function portal_remover_anexo(uuid, uuid)   to anon;
grant execute on function portal_enviar_para_analise(uuid, text) to anon;
grant execute on function portal_anexar_documento(
  uuid, uuid, text, text, text, bigint, text, text, text, numeric, jsonb) to anon;

-- `gendocs_distribuir_candidato` fica interna: quem chama é a inscrição.
