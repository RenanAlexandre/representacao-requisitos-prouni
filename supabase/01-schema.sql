-- ============================================================================
-- Processo Seletivo ProUni — UniFatecie
-- Esquema do banco (PostgreSQL / Supabase)
--
-- Ordem de execução:  01-schema.sql  →  02-seed.sql
--
-- Cada tabela abaixo existe para alimentar uma tela que já está construída na
-- representação (`src/`). Onde o campo veio de um arquivo real do ProUni ou de
-- um print do ERP, o comentário diz de onde.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid() e crypt()
create extension if not exists unaccent;   -- busca por nome sem acento

-- No Supabase o pgcrypto é instalado no schema `extensions`, não em `public`
-- (unaccent fica em `public`). Toda função que chama crypt()/gen_salt() tem
-- que enxergar esse schema — ou qualificando a chamada (extensions.crypt(...))
-- ou incluindo "extensions" no `search_path` da função. Sem isso a função
-- falha com "function crypt(text, text) does not exist" pra qualquer role,
-- inclusive o dono. Ver preparar_candidato() e autenticar_candidato() abaixo.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Status do candidato no ERP (coluna Status do grid de Candidatos).
create type status_candidato as enum ('Inscrito', 'Em análise', 'Matriculado', 'Desistente');

-- Status da coleta no GenDocs (tela de Participantes e Coletas).
create type status_coleta as enum ('nova', 'aberta', 'progresso', 'recebida', 'finalizada');

-- Análise item a item — requisitos, seção 3.5.
create type status_documento as enum ('pendente', 'enviado', 'analise', 'aprovado', 'reprovado');

-- Fluxo pós-análise — requisitos, seção 3.6 (cruzamento com o WAE).
create type fluxo_pos_analise as enum ('nao_definido', 'aluno_novo', 'ja_matriculado');

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ===========================================================================
-- 1. TABELAS DE DOMÍNIO
--    Listas que hoje são arrays fixos em src/data/lp.ts e que a Secretaria
--    precisa manter sem mexer em código.
-- ===========================================================================

-- Locais de oferta do ProUni. O candidato escolhe um na landing page e ele
-- precisa bater com o que ele selecionou no Sispro.
create table polos (
  id             uuid primary key default gen_random_uuid(),
  codigo_sispro  text not null unique,          -- ex.: '1061130'
  nome           text not null,                 -- ex.: 'CAMPUS SANEPAR'
  cidade         text,
  uf             char(2),
  tipo           text default 'Polo',           -- Polo | Megapolo | Sede (nomenclatura do ERP)
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table polos is
  'Locais de oferta do ProUni. Origem: cabeçalho "Local de Oferta" do RELATÓRIO PROUNI e colunas CODIGO/NOME CAMPUS da LISTA DE ESPERA.';

-- Curso na nomenclatura do MEC/ProUni. Alimenta o "Curso Pretendido" da landing
-- e os campos Curso, Área de Conhecimento, Tipo de Formação e Modalidade da
-- ficha do candidato no ERP.
create table cursos (
  id                 uuid primary key default gen_random_uuid(),
  codigo_mec         text not null unique,      -- ex.: '1178816'
  nome               text not null,             -- ex.: 'ADMINISTRAÇÃO'
  tipo_formacao      text,                      -- Bacharelado | Licenciatura | Tecnólogo | Especialização
  modalidade         text,                      -- Presencial | EAD | Semipresencial
  area_conhecimento  text,                      -- ex.: 'SAÚDE E BEM-ESTAR'
  ativo              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table racas (
  codigo  text primary key,                     -- 'parda'
  nome    text not null,                        -- 'Parda'
  -- Caracteriza cota PPI, que torna a Declaração de Raça e Cor obrigatória
  -- (requisitos, seção 3.3.1).
  ppi     boolean not null default false,
  ordem   int not null default 0
);

create table parentescos (
  codigo  text primary key,                     -- 'mae'
  nome    text not null,                        -- 'Mãe'
  ordem   int not null default 0
);

create table escolaridades (
  codigo  text primary key,
  nome    text not null,
  ordem   int not null default 0
);

create table planos_pagamento (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  tipo_bolsa   text not null,                   -- 'BOLSA INTEGRAL' | 'BOLSA PARCIAL'
  percentual   int  not null check (percentual between 0 and 100),
  parcelas     int,
  forma        text,                            -- Boleto | Cartão recorrente | Pix
  dia_vencimento int check (dia_vencimento between 1 and 31),
  ativo        boolean not null default true,
  -- Sem isto o select da landing não tem como ordenar de forma estável — id é
  -- uuid aleatório. Mesmo padrão de racas/escolaridades/parentescos.
  ordem        int not null default 0
);


-- ===========================================================================
-- 2. GENDOCS — módulos e lista documental
--
--    Estrutura igual à do sistema:  módulo → participantes → coleta do
--    participante → documentos da coleta.  (Participantes e coletas ficam na
--    seção 6, porque dependem de `candidatos`.)
--
--    O ERP referencia o módulo pelo campo "Módulo do GenDocs" do concurso,
--    então esta tabela precisa existir antes de `concursos`.
-- ===========================================================================

-- Perfil de quem entra no módulo. É o que separa os quatro módulos do ProUni:
-- a lista documental de um titular cotista não é a de um familiar menor, e no
-- GenDocs cada lista é um módulo próprio.
create type perfil_modulo as enum (
  'titular_cotista',
  'titular_sem_cota',
  'familiar_maior',
  'familiar_menor'
);

create table modulos_gendocs (
  id                  uuid primary key default gen_random_uuid(),
  codigo_externo      text unique,               -- o '34534' que o ERP guarda
  slug                text not null unique,      -- 'prouni-2026-1-titular-cotista'
  nome                text not null,
  descricao           text,
  -- Quem este módulo coleta. Um mesmo grupo familiar se espalha por vários.
  perfil              perfil_modulo not null,
  -- Chamada a que o módulo pertence, para agrupar os quatro perfis.
  chamada             text not null,             -- '2026.1 — 1ª Chamada'
  -- Janela temporal: requisito CRÍTICO da seção 3.4, não existe nos demais
  -- processos do GenDocs. É ela que libera e bloqueia envios e reenvios.
  envio_inicio        date not null,
  envio_fim           date not null,
  situacao            text not null default 'Não iniciado'
                      check (situacao in ('Iniciado', 'Não iniciado', 'Finalizado')),
  ativo               boolean not null default true,
  link_preenchimento  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint janela_valida check (envio_fim >= envio_inicio),
  -- Um módulo por perfil em cada chamada.
  unique (chamada, perfil)
);

comment on table modulos_gendocs is
  'Tela "Dados do Módulo" do GenDocs. Um módulo por perfil de participante, por chamada.';

-- SLA por status, em horas. É a tabela que a tela de Documentos e Regras mostra.
create table modulos_sla (
  modulo_id  uuid not null references modulos_gendocs(id) on delete cascade,
  status     status_coleta not null,
  horas      int not null default 0 check (horas >= 0),
  primary key (modulo_id, status)
);

-- Lista documental do módulo. Como o perfil já é o do módulo, aqui não há mais
-- condicional: o que está listado é o que aquele perfil precisa entregar.
create table documentos_exigidos (
  id            uuid primary key default gen_random_uuid(),
  modulo_id     uuid not null references modulos_gendocs(id) on delete cascade,
  sequencia     int  not null,
  nome          text not null,
  obrigatorio   boolean not null default true,
  -- Documentos que substituem este (ex.: CNH no lugar de RG).
  substituicoes text[] not null default '{}',
  orientacao    text,                            -- texto do "ⓘ" (requisitos, 3.3.3)
  formatos      text[] not null default '{pdf,jpg,jpeg,png}',
  tamanho_max_mb int not null default 10,
  unique (modulo_id, sequencia)
);


-- ===========================================================================
-- 3. PROCESSO SELETIVO (ERP)
-- ===========================================================================

create table processos_seletivos (
  id              uuid primary key default gen_random_uuid(),
  codigo_erp      text unique,                   -- o id numérico do ERP ('654')
  nome            text not null,                 -- 'TESTEGRAD'
  codigo          text not null,                 -- 'TESGRAD'
  periodo_letivo  text not null,                 -- '2027.1'
  nivel_ensino    text not null default 'Graduação',
  edital          text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table concursos (
  id                  uuid primary key default gen_random_uuid(),
  codigo_erp          text unique,               -- '112'
  processo_seletivo_id uuid not null references processos_seletivos(id) on delete cascade,
  nome                text not null,             -- 'CENTRO EDUCACIONAL FATECIE LTDA'
  tipo                text,                      -- 'Vestibular'
  origem              text,                      -- 'Sede'
  inicio              timestamptz,
  fim                 timestamptz,
  requer_prova        boolean not null default false,
  -- O elo com o GenDocs: é este campo que a tela de Concurso mostra.
  modulo_gendocs_id   uuid references modulos_gendocs(id) on delete set null,
  taxa_inscricao      numeric(10,2),
  tipo_classificacao  text,
  data_vestibular     timestamptz,
  vagas               int,
  provas_publicadas   boolean not null default false,
  resultado_publicado boolean not null default false,
  exibir_requerimento boolean not null default false,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Oferta: é o cruzamento curso × polo × concurso que carrega turno, tipo de
-- bolsa e VALOR DE OFERTA. Sem ela o "Valor de Oferta" da ficha do candidato
-- não tem de onde sair, e o mesmo curso não poderia custar diferente por polo.
create table ofertas (
  id             uuid primary key default gen_random_uuid(),
  concurso_id    uuid not null references concursos(id) on delete cascade,
  curso_id       uuid not null references cursos(id),
  polo_id        uuid not null references polos(id),
  turno          text not null check (turno in ('MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL', 'EAD')),
  tipo_bolsa     text not null,                  -- 'BOLSA INTEGRAL' | 'BOLSA PARCIAL'
  valor_oferta   numeric(10,2),
  vagas          int,
  ativo          boolean not null default true,
  unique (concurso_id, curso_id, polo_id, turno, tipo_bolsa)
);

create table turmas (
  id                   uuid primary key default gen_random_uuid(),
  codigo_erp           text unique,
  processo_seletivo_id uuid not null references processos_seletivos(id) on delete cascade,
  nome                 text not null,
  periodo_letivo       text,
  curso_id             uuid references cursos(id),
  curriculo            text,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);


-- ===========================================================================
-- 4. CANDIDATOS — o cadastro que a landing page captura
-- ===========================================================================

-- Protocolo no formato PRU-2026-00001, um por candidato, sequencial por ano.
create table contador_protocolo (
  ano     int primary key,
  ultimo  int not null default 0
);

create or replace function proximo_protocolo(p_ano int) returns text
language plpgsql as $$
declare
  n int;
begin
  insert into contador_protocolo (ano, ultimo)
       values (p_ano, 1)
  on conflict (ano) do update set ultimo = contador_protocolo.ultimo + 1
    returning ultimo into n;

  return 'PRU-' || p_ano || '-' || lpad(n::text, 5, '0');
end;
$$;

create table candidatos (
  id                       uuid primary key default gen_random_uuid(),

  -- Protocolo único. Preenchido pelo trigger quando vem nulo.
  protocolo                text not null unique,

  -- ----- Acesso ao Portal do Candidato -----
  -- Usuário = CPF (só dígitos). Senha = data de nascimento, guardada como
  -- hash bcrypt. Ver a nota sobre este esquema em supabase/README.md.
  cpf                      char(11) not null unique check (cpf ~ '^[0-9]{11}$'),
  senha_hash               text not null,
  -- Preenchido se e quando o portal migrar para o Supabase Auth; é o que as
  -- policies de RLS usam para o candidato enxergar só o próprio cadastro.
  auth_user_id             uuid unique references auth.users(id) on delete set null,
  ultimo_acesso            timestamptz,

  -- ----- Etapa 1: identificação -----
  nome                     text not null,
  rg                       text not null,
  nascimento               date not null,
  sexo                     text not null,
  raca_codigo              text not null references racas(codigo),
  uf_naturalidade          char(2) not null,
  municipio_naturalidade   text not null,

  -- ----- Etapa 1: contato -----
  email                    text not null,
  ddd                      char(2) not null,
  telefone                 text not null,

  -- ----- Etapa 2: endereço (preenchido pelo ViaCEP, sempre editável) -----
  cep                      char(8) not null,
  logradouro               text not null,
  numero                   text not null,
  complemento              text,
  bairro                   text not null,
  cidade                   text not null,
  uf                       char(2) not null,

  -- ----- Etapa 3: formação e curso -----
  escolaridade_codigo      text references escolaridades(codigo),
  ano_conclusao_em         int check (ano_conclusao_em between 1950 and 2100),
  curso_id                 uuid references cursos(id),
  -- Deve ser o MESMO polo selecionado no Sispro; a divergência é o motivo do
  -- aviso na landing page e da checagem abaixo, na conferência da pré-seleção.
  polo_id                  uuid references polos(id),
  plano_pagamento_id       uuid references planos_pagamento(id),

  -- ----- Aceites, com o instante de cada um -----
  aceite_contrato          boolean not null default false,
  aceite_contrato_em       timestamptz,
  aceite_contato           boolean not null default false,
  aceite_contato_em        timestamptz,
  -- Declaração de cotista, feita junto do campo de raça na etapa 1.
  aceite_cota              boolean not null default false,
  aceite_cota_em           timestamptz,
  -- Termo de responsabilidade da seção 3.3.2, marcado no GenDocs antes do
  -- envio final. Sem ele o envio não é habilitado.
  aceite_responsabilidade  boolean not null default false,
  aceite_responsabilidade_em timestamptz,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint contrato_obrigatorio check (aceite_contrato is true)
);

comment on column candidatos.protocolo is 'PRU-<ano>-<5 dígitos>, sequencial por ano, um por candidato.';
comment on column candidatos.senha_hash is 'bcrypt da data de nascimento no formato ddmmaaaa. Ver a ressalva de segurança no README.';

create index on candidatos (nome);
create index on candidatos (email);
create index on candidatos (curso_id);
create index on candidatos (polo_id);

-- Protocolo e senha preenchidos na inserção quando não vierem informados.
create or replace function preparar_candidato() returns trigger
language plpgsql as $$
begin
  if new.protocolo is null or new.protocolo = '' then
    new.protocolo := proximo_protocolo(extract(year from now())::int);
  end if;

  if new.senha_hash is null or new.senha_hash = '' then
    new.senha_hash := extensions.crypt(to_char(new.nascimento, 'DDMMYYYY'), extensions.gen_salt('bf'));
  end if;

  return new;
end;
$$;

create trigger trg_preparar_candidato
  before insert on candidatos
  for each row execute function preparar_candidato();

-- Login do portal: CPF + data de nascimento.
create or replace function autenticar_candidato(p_cpf text, p_nascimento date)
returns table (id uuid, protocolo text, nome text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
    update candidatos c
       set ultimo_acesso = now()
     where c.cpf = regexp_replace(p_cpf, '\D', '', 'g')
       and c.senha_hash = crypt(to_char(p_nascimento, 'DDMMYYYY'), c.senha_hash)
    returning c.id, c.protocolo, c.nome;
end;
$$;


-- ---------------------------------------------------------------------------
-- Grupo familiar — inserido pelo próprio candidato no portal
-- ---------------------------------------------------------------------------

create table membros_grupo_familiar (
  id            uuid primary key default gen_random_uuid(),
  candidato_id  uuid not null references candidatos(id) on delete cascade,
  nome          text not null,
  nascimento    date not null,
  parentesco_codigo text not null references parentescos(codigo),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint nascimento_plausivel check (nascimento >= date '1900-01-01')
);

create index on membros_grupo_familiar (candidato_id);

comment on table membros_grupo_familiar is
  'Quem mora na mesma casa varia por família, então o grupo é montado pelo candidato no portal — não vem pré-carregado.';

-- A maioridade decide qual lista documental o membro precisa entregar, e ela
-- muda com o tempo — então é derivada na leitura, nunca gravada. (Uma coluna
-- gerada não serviria: `current_date` não é imutável, e o valor congelaria no
-- dia da inserção.)
create or replace function maior_de_idade(p_nascimento date) returns boolean
language sql stable as $$
  select p_nascimento <= (current_date - interval '18 years');
$$;

create or replace view vw_membros_grupo_familiar as
  select g.*,
         extract(year from age(current_date, g.nascimento))::int as idade,
         maior_de_idade(g.nascimento)                            as maior_de_idade,
         p.nome as parentesco
    from membros_grupo_familiar g
    join parentescos p on p.codigo = g.parentesco_codigo;


-- ===========================================================================
-- 5. INSCRIÇÕES — o grid de Candidatos do ERP
--    Um candidato pode se inscrever em mais de um concurso (o print do ERP
--    tem o mesmo CPF em duas linhas), por isso a inscrição é tabela própria.
-- ===========================================================================

create table inscricoes (
  id                uuid primary key default gen_random_uuid(),
  codigo_erp        text unique,                 -- o id da linha no ERP ('25823')
  candidato_id      uuid not null references candidatos(id) on delete cascade,
  concurso_id       uuid not null references concursos(id),
  oferta_id         uuid references ofertas(id),

  status            status_candidato not null default 'Inscrito',
  inscrito_em       timestamptz not null default now(),

  -- ----- Dados da pré-seleção no ProUni (vêm do arquivo do Sispro) -----
  inscricao_enem    text,
  nota_media        numeric(6,2),
  nota_redacao      numeric(6,2),
  tipo_bolsa        text,                        -- 'BOLSA INTEGRAL' | 'BOLSA PARCIAL'
  modalidade_concorrencia text default 'Ampla',  -- 'Ampla' | 'PPI' | 'PcD'
  chamada           text,                        -- '1ª Chamada' | '2ª Chamada' | 'Lista de Espera'
  -- Polo declarado no Sispro. Divergir do `candidatos.polo_id` é justamente o
  -- erro que o aviso da landing page tenta evitar.
  polo_sispro_id    uuid references polos(id),

  -- ----- Pós-análise (requisitos, seção 3.6) -----
  fluxo             fluxo_pos_analise not null default 'nao_definido',
  matriculado_wae   boolean,                     -- resultado do cruzamento por CPF
  turma_id          uuid references turmas(id),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (candidato_id, concurso_id)
);

create index on inscricoes (concurso_id, status);
create index on inscricoes (candidato_id);

-- O polo escolhido na landing precisa bater com o do Sispro. A divergência não
-- é bloqueada aqui — ela é sinalizada, para a Secretaria tratar caso a caso.
create or replace view inscricoes_com_divergencia_de_polo as
  select i.id, i.codigo_erp, c.protocolo, c.nome,
         pc.nome as polo_informado, ps.nome as polo_sispro
    from inscricoes i
    join candidatos c on c.id = i.candidato_id
    left join polos pc on pc.id = c.polo_id
    left join polos ps on ps.id = i.polo_sispro_id
   where i.polo_sispro_id is not null
     and c.polo_id is distinct from i.polo_sispro_id;


-- ===========================================================================
-- 6. COLETA DOCUMENTAL — a estrutura do GenDocs
--
--    grupo → participantes (espalhados por vários módulos) → coleta de cada
--    participante → documentos da coleta → arquivos enviados.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Grupo: o núcleo familiar dentro de uma chamada
--
-- É a peça que hoje não existe no GenDocs. Sem ela, o titular está num módulo
-- e os familiares em outros, sem nada os ligando — o analista abriria a coleta
-- da mãe sem saber de quem ela é mãe. O grupo é o que costura os quatro
-- módulos de volta numa família só.
-- ---------------------------------------------------------------------------
create table gendocs_grupos (
  id            uuid primary key default gen_random_uuid(),
  candidato_id  uuid not null references candidatos(id) on delete cascade,
  chamada       text not null,                   -- casa com modulos_gendocs.chamada
  -- Repetido aqui de propósito: é por ele que o analista procura o grupo, e
  -- ele não muda nunca.
  protocolo     text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (candidato_id, chamada)
);

create index on gendocs_grupos (protocolo);

comment on table gendocs_grupos is
  'Titular + familiares de uma mesma chamada. Existe para relacionar participantes que estão em módulos diferentes.';

-- ---------------------------------------------------------------------------
-- Participante: uma linha da tela "Participantes e Coletas"
--
-- O participante existe DENTRO de um módulo. A mesma pessoa física aparece
-- uma vez só, no módulo do perfil dela.
-- ---------------------------------------------------------------------------
create table gendocs_participantes (
  id           uuid primary key default gen_random_uuid(),
  modulo_id    uuid not null references modulos_gendocs(id) on delete cascade,
  grupo_id     uuid not null references gendocs_grupos(id) on delete cascade,

  -- Papel dentro do grupo. Um grupo tem exatamente um titular.
  titular      boolean not null default false,

  -- De onde a pessoa veio. Titular aponta para `candidatos`; familiar aponta
  -- para `membros_grupo_familiar`. Exatamente um dos dois.
  candidato_id uuid references candidatos(id) on delete cascade,
  membro_id    uuid references membros_grupo_familiar(id) on delete cascade,

  -- Cópia dos dados de contato no momento da importação. O GenDocs dispara
  -- e-mail para este endereço, e ele não deve mudar sozinho se o cadastro mudar.
  nome         text not null,
  email        text not null,
  parentesco   text,                              -- nulo no titular

  importado_em timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint origem_exclusiva check (
    (titular is true  and candidato_id is not null and membro_id is null) or
    (titular is false and membro_id  is not null and candidato_id is null)
  ),
  unique (modulo_id, grupo_id, membro_id)
);

create index on gendocs_participantes (grupo_id);
create index on gendocs_participantes (modulo_id);
create unique index um_titular_por_grupo
    on gendocs_participantes (grupo_id) where titular;

comment on table gendocs_participantes is
  'Linha da tela "Participantes e Coletas". A mesma pessoa aparece uma vez, no módulo do perfil dela.';

-- ---------------------------------------------------------------------------
-- Coleta: o estado do participante dentro do módulo
--
-- É o que a coluna Status da tela mostra, e o que os SLAs medem.
-- ---------------------------------------------------------------------------
create table gendocs_coletas (
  id               uuid primary key default gen_random_uuid(),
  participante_id  uuid not null unique references gendocs_participantes(id) on delete cascade,
  status           status_coleta not null default 'nova',
  -- Momento em que cada status foi atingido — é daqui que sai o SLA.
  aberta_em        timestamptz,
  primeiro_envio_em timestamptz,
  recebida_em      timestamptz,
  finalizada_em    timestamptz,
  -- Prazo calculado a partir do SLA do status corrente.
  prazo_em         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index on gendocs_coletas (status);

-- ---------------------------------------------------------------------------
-- Documento da coleta: a exigência, com a decisão do analista
-- ---------------------------------------------------------------------------
create table gendocs_documentos_coleta (
  id              uuid primary key default gen_random_uuid(),
  coleta_id       uuid not null references gendocs_coletas(id) on delete cascade,
  documento_id    uuid not null references documentos_exigidos(id),
  status          status_documento not null default 'pendente',

  -- Arquivo vigente. O histórico completo fica em `gendocs_arquivos`.
  arquivo_id      uuid,
  enviado_em      timestamptz,

  -- Decisão do analista — item a item, não do participante como um todo
  -- (requisitos, seção 3.5).
  analisado_em    timestamptz,
  analisado_por   text,
  -- O que a Secretaria escreveu ao reprovar. Fica visível ao lado do campo de
  -- reenvio; o portal do candidato só sinaliza que o item precisa voltar.
  motivo_recusa   text,
  -- Quantas vezes o item já foi reenviado.
  tentativas      int not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (coleta_id, documento_id),
  constraint recusa_tem_motivo
    check (status <> 'reprovado' or motivo_recusa is not null),
  constraint aprovado_tem_arquivo
    check (status <> 'aprovado' or arquivo_id is not null)
);

create index on gendocs_documentos_coleta (coleta_id, status);

-- ---------------------------------------------------------------------------
-- Arquivos: o recolhimento de fato
--
-- Uma linha por upload, versionada. Reprovado um item, o candidato reenvia e
-- entra uma versão nova — o arquivo recusado continua no banco, junto do
-- motivo, que é o que sustenta a auditoria da análise.
-- ---------------------------------------------------------------------------
create table gendocs_arquivos (
  id                   uuid primary key default gen_random_uuid(),
  documento_coleta_id  uuid not null references gendocs_documentos_coleta(id) on delete cascade,
  versao               int  not null default 1,
  -- Caminho no Storage do Supabase (bucket privado).
  storage_path         text not null,
  nome_original        text not null,
  mime                 text not null,
  tamanho_bytes        bigint not null check (tamanho_bytes > 0),
  -- SHA-256 do conteúdo: detecta reenvio do mesmo arquivo sem correção.
  hash_sha256          text,
  enviado_em           timestamptz not null default now(),
  enviado_por          text,                      -- 'candidato' | 'secretaria'
  unique (documento_coleta_id, versao)
);

alter table gendocs_documentos_coleta
  add constraint fk_arquivo_vigente
  foreign key (arquivo_id) references gendocs_arquivos(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Visões de trabalho
-- ---------------------------------------------------------------------------

-- O grupo familiar inteiro, atravessando os quatro módulos. É esta consulta
-- que o analista precisa e que hoje não existe.
create or replace view vw_grupo_completo as
  select g.protocolo,
         g.chamada,
         c.nome            as titular,
         c.cpf,
         p.titular         as e_titular,
         p.nome            as participante,
         p.parentesco,
         m.nome            as modulo,
         m.perfil,
         ct.status         as status_coleta,
         ct.prazo_em,
         count(*) filter (where dc.status = 'aprovado')  as aprovados,
         count(*) filter (where dc.status = 'reprovado') as reprovados,
         count(*) filter (where dc.status = 'pendente')  as pendentes,
         count(*)                                        as total_documentos
    from gendocs_grupos g
    join candidatos c            on c.id = g.candidato_id
    join gendocs_participantes p on p.grupo_id = g.id
    join modulos_gendocs m       on m.id = p.modulo_id
    join gendocs_coletas ct      on ct.participante_id = p.id
    left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
   group by g.protocolo, g.chamada, c.nome, c.cpf, p.titular, p.nome,
            p.parentesco, m.nome, m.perfil, ct.status, ct.prazo_em;

-- Um grupo só está pronto quando TODOS os participantes estão — o titular não
-- pode ser aprovado com a documentação da mãe pendente.
create or replace view vw_grupos_prontos as
  select g.id, g.protocolo, c.nome as titular,
         count(*)                                              as participantes,
         count(*) filter (where ct.status = 'finalizada')       as finalizados,
         bool_and(ct.status = 'finalizada')                     as grupo_completo
    from gendocs_grupos g
    join candidatos c            on c.id = g.candidato_id
    join gendocs_participantes p on p.grupo_id = g.id
    join gendocs_coletas ct      on ct.participante_id = p.id
   group by g.id, g.protocolo, c.nome;


-- ===========================================================================
-- 7. updated_at em todas as tabelas que têm a coluna
-- ===========================================================================

-- Só tabelas de verdade: as views herdam `updated_at` do `select *` e o
-- Postgres não aceita trigger BEFORE ... FOR EACH ROW em view.
do $$
declare t text;
begin
  for t in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables tb
        on tb.table_schema = c.table_schema
       and tb.table_name   = c.table_name
     where c.table_schema = 'public'
       and c.column_name  = 'updated_at'
       and tb.table_type  = 'BASE TABLE'
  loop
    execute format(
      'create trigger trg_updated_at before update on %I
         for each row execute function set_updated_at()', t);
  end loop;
end;
$$;


-- ===========================================================================
-- 8. RLS
--
-- Regra geral: nada é legível pelo `anon`. A Secretaria e o ERP acessam pela
-- service_role, que ignora RLS. O candidato autenticado enxerga apenas o
-- próprio cadastro, o próprio grupo familiar e as próprias coletas.
-- ===========================================================================

alter table candidatos                 enable row level security;
alter table membros_grupo_familiar     enable row level security;
alter table inscricoes                 enable row level security;
alter table gendocs_grupos             enable row level security;
alter table gendocs_participantes      enable row level security;
alter table gendocs_coletas            enable row level security;
alter table gendocs_documentos_coleta  enable row level security;
alter table gendocs_arquivos           enable row level security;

-- Tabelas de domínio: leitura liberada para quem está autenticado (a landing
-- precisa das listas de polos, cursos, raças e planos para montar os campos).
alter table polos              enable row level security;
alter table cursos             enable row level security;
alter table racas              enable row level security;
alter table parentescos        enable row level security;
alter table escolaridades      enable row level security;
alter table planos_pagamento   enable row level security;

create policy dominio_leitura on polos            for select using (true);
create policy dominio_leitura on cursos           for select using (true);
create policy dominio_leitura on racas            for select using (true);
create policy dominio_leitura on parentescos      for select using (true);
create policy dominio_leitura on escolaridades    for select using (true);
create policy dominio_leitura on planos_pagamento for select using (true);

create policy candidato_le_o_proprio on candidatos
  for select to authenticated
  using (auth_user_id = auth.uid());

-- Sem policy de UPDATE: o cadastro é somente leitura para o candidato, porque
-- ele já seguiu para o GenDocs e para o ERP. Correção passa pela Secretaria,
-- que trabalha pela service_role. É a mesma regra que a tela de Dados
-- Cadastrais do portal comunica.

create policy candidato_gerencia_familiares on membros_grupo_familiar
  for all to authenticated
  using (
    exists (select 1 from candidatos c
             where c.id = membros_grupo_familiar.candidato_id
               and c.auth_user_id = auth.uid())
  )
  with check (
    exists (select 1 from candidatos c
             where c.id = membros_grupo_familiar.candidato_id
               and c.auth_user_id = auth.uid())
  );

create policy candidato_le_as_proprias_inscricoes on inscricoes
  for select to authenticated
  using (
    exists (select 1 from candidatos c
             where c.id = inscricoes.candidato_id
               and c.auth_user_id = auth.uid())
  );

-- ----- Coleta: o candidato enxerga o grupo inteiro, não só a coleta dele -----
-- É ele quem responde pela documentação dos familiares, então precisa ver o
-- que falta de cada um.

create policy candidato_le_o_proprio_grupo on gendocs_grupos
  for select to authenticated
  using (
    exists (select 1 from candidatos c
             where c.id = gendocs_grupos.candidato_id
               and c.auth_user_id = auth.uid())
  );

create policy candidato_le_os_participantes_do_grupo on gendocs_participantes
  for select to authenticated
  using (
    exists (select 1 from gendocs_grupos g
             join candidatos c on c.id = g.candidato_id
            where g.id = gendocs_participantes.grupo_id
              and c.auth_user_id = auth.uid())
  );

create policy candidato_le_as_coletas_do_grupo on gendocs_coletas
  for select to authenticated
  using (
    exists (select 1 from gendocs_participantes p
             join gendocs_grupos g on g.id = p.grupo_id
             join candidatos c on c.id = g.candidato_id
            where p.id = gendocs_coletas.participante_id
              and c.auth_user_id = auth.uid())
  );

create policy candidato_le_os_documentos_do_grupo on gendocs_documentos_coleta
  for select to authenticated
  using (
    exists (select 1 from gendocs_coletas ct
             join gendocs_participantes p on p.id = ct.participante_id
             join gendocs_grupos g on g.id = p.grupo_id
             join candidatos c on c.id = g.candidato_id
            where ct.id = gendocs_documentos_coleta.coleta_id
              and c.auth_user_id = auth.uid())
  );

-- Arquivos: o candidato lê os do próprio grupo e pode enviar novos enquanto a
-- janela do módulo estiver aberta. A aprovação é só da service_role.
create policy candidato_le_os_arquivos_do_grupo on gendocs_arquivos
  for select to authenticated
  using (
    exists (select 1 from gendocs_documentos_coleta dc
             join gendocs_coletas ct on ct.id = dc.coleta_id
             join gendocs_participantes p on p.id = ct.participante_id
             join gendocs_grupos g on g.id = p.grupo_id
             join candidatos c on c.id = g.candidato_id
            where dc.id = gendocs_arquivos.documento_coleta_id
              and c.auth_user_id = auth.uid())
  );

create policy candidato_envia_arquivo_no_prazo on gendocs_arquivos
  for insert to authenticated
  with check (
    exists (select 1 from gendocs_documentos_coleta dc
             join gendocs_coletas ct on ct.id = dc.coleta_id
             join gendocs_participantes p on p.id = ct.participante_id
             join modulos_gendocs m on m.id = p.modulo_id
             join gendocs_grupos g on g.id = p.grupo_id
             join candidatos c on c.id = g.candidato_id
            where dc.id = gendocs_arquivos.documento_coleta_id
              and c.auth_user_id = auth.uid()
              -- Fora da janela o envio é bloqueado (requisitos, seção 3.4).
              and current_date between m.envio_inicio and m.envio_fim
              -- Item já aprovado não aceita reenvio.
              and dc.status <> 'aprovado')
  );

-- ----- Backoffice: ERP e GenDocs, só service_role -----
-- Estas tabelas não têm nenhuma policy de propósito: RLS ligada + zero
-- policies nega tudo pra qualquer role, inclusive `anon` e `authenticated` —
-- só o dono (postgres) e a service_role (que ignora RLS) enxergam. É o modo
-- correto de expressar "só a Secretaria/ERP mexe aqui": deixar a tabela SEM
-- RLS faria o oposto do pretendido, porque o Supabase concede select/insert/
-- update/delete a `anon` e `authenticated` por padrão em toda tabela nova do
-- schema public — a RLS é o único freio disso.
alter table processos_seletivos    enable row level security;
alter table concursos              enable row level security;
alter table turmas                 enable row level security;
alter table modulos_gendocs        enable row level security;
alter table modulos_sla            enable row level security;
alter table documentos_exigidos    enable row level security;
alter table contador_protocolo     enable row level security;
alter table ofertas                enable row level security;

-- Exceção deliberada: as telas /erp/processos-seletivos do protótipo rodam
-- com a chave anon (não há login de Secretaria neste app ainda), então
-- precisam ler `processos_seletivos`, `concursos` e `turmas` de verdade.
-- É catálogo/operacional (nome, código, datas do processo/concurso) — não é
-- dado de candidato. Confirmado com o usuário. Continuam sem policy de
-- insert/update/delete: escrita nessas três tabelas segue só por
-- service_role, igual às demais desta seção.
create policy leitura_publica_erp on processos_seletivos for select using (true);
create policy leitura_publica_erp on concursos            for select using (true);
create policy leitura_publica_erp on turmas                for select using (true);

-- Views rodam com os privilégios de quem as criou (postgres) por padrão, o
-- que contorna a RLS das tabelas de base mesmo com elas travadas acima.
-- `security_invoker` faz a view herdar a RLS da role que consulta; o revoke
-- fecha o acesso direto por quem não tem select nas tabelas de base.
--
-- vw_grupo_completo e vw_grupos_prontos são ferramenta da Secretaria (o
-- README chama de "a consulta que o analista precisa") — mesmo tratamento
-- das tabelas de backoffice acima: fechadas pra anon e authenticated.
alter view inscricoes_com_divergencia_de_polo set (security_invoker = true);
revoke all on inscricoes_com_divergencia_de_polo from anon, authenticated, public;

alter view vw_grupo_completo set (security_invoker = true);
revoke all on vw_grupo_completo from anon, authenticated, public;

alter view vw_grupos_prontos set (security_invoker = true);
revoke all on vw_grupos_prontos from anon, authenticated, public;

-- vw_membros_grupo_familiar é diferente: é autosserviço do candidato logado
-- no portal (seção 7 do README). Mantém o grant de `authenticated` — quem
-- realmente restringe é a policy candidato_gerencia_familiares, herdada via
-- security_invoker. Só tira anon e o role `public`.
alter view vw_membros_grupo_familiar set (security_invoker = true);
revoke all on vw_membros_grupo_familiar from anon, public;
