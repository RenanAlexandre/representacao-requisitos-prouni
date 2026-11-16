-- ============================================================================
-- 04 — A API do protótipo: inscrição, portal, GenDocs e ERP
--
-- Rode DEPOIS do 03 (que adiciona o valor 'familiar' ao enum), em execução
-- separada.
--
-- POR QUE FUNÇÕES E NÃO TABELAS ABERTAS
-- -------------------------------------
-- As policies de RLS escritas no 01 keyam em `auth.uid()`, que pressupõe o
-- Supabase Auth. O login combinado é outro: CPF + data de nascimento, por
-- função própria. Resultado: para o role `anon` aquelas policies nunca
-- concedem nada — o portal simplesmente não leria os dados dele.
--
-- A saída é esta: nenhuma tabela de dado pessoal é aberta ao `anon`. Tudo
-- passa por funções `security definer` que exigem um token de sessão e só
-- devolvem as linhas daquele candidato. A superfície exposta é estreita,
-- nomeada e auditável, em vez de um `grant select` na tabela inteira.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ajustes de estrutura
-- ---------------------------------------------------------------------------

-- Com um módulo único de familiares, a lista documental precisa distinguir
-- quem é maior de quem é menor (um menor não tem CTPS). Volta a coluna que
-- existia quando os familiares tinham dois módulos.
alter table documentos_exigidos
  add column if not exists aplica_a text not null default 'todos'
  check (aplica_a in ('todos', 'maiores', 'menores'));

-- Destaque visual do módulo na tela inicial do GenDocs: borda laranja e tag
-- "Novo". É configuração do módulo, não estado derivado — a Secretaria liga e
-- desliga quando quiser.
alter table modulos_gendocs
  add column if not exists destaque boolean not null default false;

-- No GenDocs o participante é identificado pelo e-mail. Aqui isso não fecha:
-- os familiares usam o e-mail DO TITULAR de propósito (é ele quem acompanha o
-- processo e recebe as comunicações). Sem uma chave própria, quatro pessoas do
-- mesmo grupo seriam indistinguíveis para o GenDocs. Este é o identificador
-- estável que a integração usa no lugar do e-mail.
alter table gendocs_participantes
  add column if not exists identificador_externo text;

create unique index if not exists gendocs_participantes_ident_uk
  on gendocs_participantes (identificador_externo)
  where identificador_externo is not null;

comment on column gendocs_participantes.email is
  'E-mail de CONTATO, não identificador. Familiares carregam o e-mail do titular — as comunicações da coleta vão todas para ele. Para identificar, use identificador_externo.';


-- ---------------------------------------------------------------------------
-- 2. Sessão do portal
-- ---------------------------------------------------------------------------

create table if not exists sessoes_portal (
  token         uuid primary key default gen_random_uuid(),
  candidato_id  uuid not null references candidatos(id) on delete cascade,
  criada_em     timestamptz not null default now(),
  expira_em     timestamptz not null default now() + interval '12 hours'
);

create index if not exists sessoes_portal_candidato_ix
  on sessoes_portal (candidato_id);

alter table sessoes_portal enable row level security;
-- Sem policy: ninguém lê a tabela direto. Só as funções abaixo, que rodam
-- como dono.

-- Resolve o candidato a partir do token. Levanta erro se o token não existe
-- ou expirou — é o guarda de todas as funções do portal.
create or replace function sessao_candidato(p_token uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select candidato_id into v_id
    from sessoes_portal
   where token = p_token and expira_em > now();

  if v_id is null then
    raise exception 'Sessão inválida ou expirada' using errcode = '28000';
  end if;

  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. A integração com o GenDocs
--
-- Esta função É a representação da API. Quando o GenDocs de verdade entrar,
-- ela vira uma chamada HTTP para o endpoint de criação de participante — a
-- assinatura e o efeito são os mesmos: entra uma pessoa, sai uma coleta
-- aberta com a lista documental do módulo já montada.
-- ---------------------------------------------------------------------------

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
  v_modulo_id      uuid;
  v_participante   uuid;
  v_coleta         uuid;
  v_protocolo      text;
  v_seq            int;
  v_sla            int;
begin
  -- Módulo que recebe esta pessoa, dentro da chamada do grupo.
  select m.id into v_modulo_id
    from modulos_gendocs m
    join gendocs_grupos g on g.chamada = m.chamada
   where g.id = p_grupo_id and m.perfil = p_perfil and m.ativo;

  if v_modulo_id is null then
    raise exception 'Não há módulo ativo com o perfil % para esta chamada', p_perfil
      using errcode = 'P0002';
  end if;

  -- Identificador estável para o GenDocs, já que o e-mail é compartilhado
  -- dentro do grupo: <protocolo>-T para o titular, -F1, -F2… para familiares.
  select protocolo into v_protocolo from gendocs_grupos where id = p_grupo_id;

  if p_titular then
    v_seq := 0;
  else
    select count(*) + 1 into v_seq
      from gendocs_participantes
     where grupo_id = p_grupo_id and not titular;
  end if;

  insert into gendocs_participantes
    (modulo_id, grupo_id, titular, candidato_id, membro_id,
     nome, email, parentesco, identificador_externo)
  values
    (v_modulo_id, p_grupo_id, p_titular, p_candidato_id, p_membro_id,
     p_nome, p_email, p_parentesco,
     v_protocolo || case when p_titular then '-T' else '-F' || v_seq end)
  returning id into v_participante;

  -- SLA do status inicial define o prazo da coleta.
  select horas into v_sla
    from modulos_sla where modulo_id = v_modulo_id and status = 'aberta';

  insert into gendocs_coletas (participante_id, status, aberta_em, prazo_em)
  values (v_participante, 'aberta', now(),
          now() + (coalesce(v_sla, 72) || ' hours')::interval)
  returning id into v_coleta;

  -- A lista documental do módulo, filtrada pela idade quando o módulo mistura
  -- maiores e menores (é o caso de PROUNI FAMILIARES).
  insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
  select v_coleta, d.id, 'pendente'
    from documentos_exigidos d
   where d.modulo_id = v_modulo_id
     and (d.aplica_a = 'todos'
          or (d.aplica_a = 'maiores' and p_maior_de_idade)
          or (d.aplica_a = 'menores' and not p_maior_de_idade));

  return v_coleta;
end;
$$;

comment on function gendocs_abrir_coleta is
  'Representa o endpoint de criação de participante do GenDocs. Chamada pela inscrição da landing e pela inserção de familiar no portal.';


-- ---------------------------------------------------------------------------
-- 4. Inscrição na landing page
--
-- Faz tudo numa transação: candidato → inscrição no processo certo (cota ou
-- sem cota) → grupo no GenDocs → coleta do titular.
-- ---------------------------------------------------------------------------

-- Devolve jsonb, e não `returns table`, de propósito: nomes de coluna de saída
-- em plpgsql colidem com nomes de coluna das tabelas consultadas
-- ("column reference is ambiguous"), e aqui haveria colisão em `protocolo` e
-- `token`. Com jsonb o problema não existe.
create or replace function lp_criar_candidato(p_dados jsonb)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_cpf        text := regexp_replace(p_dados->>'cpf', '\D', '', 'g');
  v_cota       boolean := coalesce((p_dados->>'aceite_cota')::boolean, false);
  v_perfil     perfil_modulo := case when v_cota then 'titular_cotista' else 'titular_sem_cota' end;
  v_codigo_ps  text := case when v_cota then 'PROUNICOTA' else 'PROUNISCOTA' end;
  v_cand       uuid;
  v_protocolo  text;
  v_concurso   uuid;
  v_grupo      uuid;
  v_chamada    text;
  v_token      uuid;
  v_ps_nome    text;
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
    escolaridade_codigo, ano_conclusao_em, curso_id, polo_id, plano_pagamento_id,
    aceite_contrato, aceite_contrato_em,
    aceite_contato,  aceite_contato_em,
    aceite_cota,     aceite_cota_em
  )
  select
    v_cpf,
    p_dados->>'nome',
    p_dados->>'rg',
    (p_dados->>'nascimento')::date,
    p_dados->>'sexo',
    r.codigo,
    p_dados->>'uf_naturalidade',
    p_dados->>'municipio_naturalidade',
    p_dados->>'email',
    p_dados->>'ddd',
    p_dados->>'telefone',
    regexp_replace(p_dados->>'cep', '\D', '', 'g'),
    p_dados->>'logradouro',
    p_dados->>'numero',
    nullif(p_dados->>'complemento', ''),
    p_dados->>'bairro',
    p_dados->>'cidade',
    p_dados->>'uf',
    e.codigo,
    (p_dados->>'ano_conclusao')::int,
    c.id,
    po.id,
    pl.id,
    true, now(),
    coalesce((p_dados->>'aceite_contato')::boolean, false),
    case when coalesce((p_dados->>'aceite_contato')::boolean, false) then now() end,
    v_cota,
    case when v_cota then now() end
  from racas r
  left join escolaridades e on e.nome = p_dados->>'escolaridade'
  left join cursos c        on c.codigo_mec = split_part(p_dados->>'curso', ' ', 1)
  left join polos po        on po.codigo_sispro = split_part(p_dados->>'polo', ' ', 1)
  left join planos_pagamento pl on pl.nome = p_dados->>'plano'
  where r.nome = p_dados->>'raca'
  returning id, protocolo into v_cand, v_protocolo;

  if v_cand is null then
    raise exception 'Não foi possível montar o cadastro — confira raça, curso, polo e plano'
      using errcode = '22023';
  end if;

  -- Processo seletivo pela declaração de cota.
  select cc.id, ps.nome into v_concurso, v_ps_nome
    from processos_seletivos ps
    join concursos cc on cc.processo_seletivo_id = ps.id
   where ps.codigo = v_codigo_ps and ps.ativo
   order by cc.created_at
   limit 1;

  if v_concurso is null then
    raise exception 'Processo seletivo % não encontrado ou sem concurso', v_codigo_ps
      using errcode = 'P0002';
  end if;

  insert into inscricoes
    (candidato_id, concurso_id, status, modalidade_concorrencia, chamada, polo_sispro_id)
  select v_cand, v_concurso, 'Inscrito',
         case when v_cota then 'PPI' else 'Ampla' end,
         '1ª Chamada',
         (select polo_id from candidatos where id = v_cand);

  -- Grupo e coleta no GenDocs.
  select chamada into v_chamada
    from modulos_gendocs where perfil = v_perfil and ativo limit 1;

  if v_chamada is null then
    raise exception 'Não há módulo ativo para o perfil %', v_perfil using errcode = 'P0002';
  end if;

  insert into gendocs_grupos (candidato_id, chamada, protocolo)
  values (v_cand, v_chamada, v_protocolo)
  returning id into v_grupo;

  perform gendocs_abrir_coleta(
    v_grupo, v_perfil, true, v_cand, null,
    p_dados->>'nome', p_dados->>'email', null, true);

  -- Já entra logado no portal.
  insert into sessoes_portal (candidato_id) values (v_cand) returning token into v_token;

  return jsonb_build_object(
    'candidato_id', v_cand,
    'protocolo',    v_protocolo,
    'token',        v_token,
    'processo',     v_ps_nome,
    'cotista',      v_cota);
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Portal do Candidato
-- ---------------------------------------------------------------------------

create or replace function portal_entrar(p_cpf text, p_nascimento date)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id    uuid;
  v_token uuid;
begin
  select c.id into v_id
    from candidatos c
   where c.cpf = regexp_replace(p_cpf, '\D', '', 'g')
     and c.senha_hash = extensions.crypt(to_char(p_nascimento, 'DDMMYYYY'), c.senha_hash);

  if v_id is null then
    raise exception 'CPF ou data de nascimento não conferem' using errcode = '28P01';
  end if;

  update candidatos set ultimo_acesso = now() where id = v_id;

  insert into sessoes_portal (candidato_id) values (v_id) returning token into v_token;

  return (select jsonb_build_object(
            'token', v_token, 'protocolo', c.protocolo, 'nome', c.nome)
            from candidatos c where c.id = v_id);
end;
$$;

create or replace function portal_sair(p_token uuid) returns void
language sql security definer set search_path = public as $$
  delete from sessoes_portal where token = p_token;
$$;

-- Cadastro completo, já com os nomes legíveis de curso, polo, plano e raça.
create or replace function portal_meus_dados(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := sessao_candidato(p_token);
  v_out jsonb;
begin
  select to_jsonb(x) into v_out from (
    select c.protocolo, c.nome, c.cpf, c.rg, c.nascimento, c.sexo,
           r.nome as raca, c.uf_naturalidade, c.municipio_naturalidade,
           c.email, c.ddd, c.telefone,
           c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
           e.nome as escolaridade, c.ano_conclusao_em,
           cu.codigo_mec || ' – ' || cu.nome as curso,
           po.codigo_sispro || ' – ' || po.nome as polo,
           pl.nome as plano,
           c.aceite_contrato, c.aceite_contato, c.aceite_cota,
           c.created_at as inscrito_em,
           i.modalidade_concorrencia as cota,
           i.chamada,
           ps.nome as processo_seletivo,
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
$$;

-- Titular + familiares, cada um com a coleta e a contagem por status.
create or replace function portal_meu_grupo(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := sessao_candidato(p_token);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.titular desc, x.nome)
      from (
        select gp.id            as participante_id,
               gp.membro_id,
               gp.titular,
               gp.nome,
               gp.parentesco,
               gp.email,
               mf.nascimento,
               case when gp.titular then true
                    else maior_de_idade(mf.nascimento) end as maior_de_idade,
               m.nome           as modulo,
               m.perfil::text   as perfil,
               ct.status::text  as status_coleta,
               ct.prazo_em,
               coalesce(d.total, 0)      as total_documentos,
               coalesce(d.aprovados, 0)  as aprovados,
               coalesce(d.analise, 0)    as em_analise,
               coalesce(d.reprovados, 0) as reprovados,
               coalesce(d.pendentes, 0)  as pendentes
          from gendocs_grupos g
          join gendocs_participantes gp on gp.grupo_id = g.id
          join modulos_gendocs m        on m.id = gp.modulo_id
          join gendocs_coletas ct       on ct.participante_id = gp.id
          left join membros_grupo_familiar mf on mf.id = gp.membro_id
          left join lateral (
            select count(*)                                        as total,
                   count(*) filter (where status = 'aprovado')     as aprovados,
                   count(*) filter (where status = 'analise')      as analise,
                   count(*) filter (where status = 'reprovado')    as reprovados,
                   count(*) filter (where status = 'pendente')     as pendentes
              from gendocs_documentos_coleta where coleta_id = ct.id
          ) d on true
         where g.candidato_id = v_id
      ) x
  ), '[]'::jsonb);
end;
$$;

-- Documentos de um participante do meu grupo (para a tela de coletas).
create or replace function portal_documentos(p_token uuid, p_participante_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := sessao_candidato(p_token);
begin
  if not exists (
    select 1 from gendocs_participantes gp
      join gendocs_grupos g on g.id = gp.grupo_id
     where gp.id = p_participante_id and g.candidato_id = v_id
  ) then
    raise exception 'Participante não pertence ao seu grupo' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sequencia)
      from (
        select de.sequencia, de.nome, de.obrigatorio,
               dc.status::text as status, dc.enviado_em, dc.motivo_recusa
          from gendocs_documentos_coleta dc
          join documentos_exigidos de on de.id = dc.documento_id
          join gendocs_coletas ct     on ct.id = dc.coleta_id
         where ct.participante_id = p_participante_id
      ) x
  ), '[]'::jsonb);
end;
$$;

-- Devolve o grupo do candidato na chamada corrente, criando se não existir.
--
-- A criação preguiçosa cobre dois casos reais: o candidato que foi cadastrado
-- antes destes módulos existirem, e o titular cujo módulo mudou de chamada.
-- Sem isso, inserir um familiar gravaria o membro e não abriria coleta nenhuma
-- — falha silenciosa, o pior tipo.
create or replace function garantir_grupo(p_candidato_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_grupo   uuid;
  v_chamada text;
  v_perfil  perfil_modulo;
  v_cota    boolean;
  v_nome    text;
  v_email   text;
  v_prot    text;
begin
  select g.id into v_grupo from gendocs_grupos g where g.candidato_id = p_candidato_id limit 1;
  if v_grupo is not null then
    return v_grupo;
  end if;

  select c.aceite_cota, c.nome, c.email, c.protocolo
    into v_cota, v_nome, v_email, v_prot
    from candidatos c where c.id = p_candidato_id;

  v_perfil := case when v_cota then 'titular_cotista' else 'titular_sem_cota' end;

  select m.chamada into v_chamada
    from modulos_gendocs m where m.perfil = v_perfil and m.ativo limit 1;

  if v_chamada is null then
    raise exception 'Não há módulo ativo para o perfil %', v_perfil using errcode = 'P0002';
  end if;

  insert into gendocs_grupos (candidato_id, chamada, protocolo)
  values (p_candidato_id, v_chamada, v_prot)
  returning id into v_grupo;

  -- O titular também precisa da coleta dele.
  perform gendocs_abrir_coleta(v_grupo, v_perfil, true, p_candidato_id, null,
                               v_nome, v_email, null, true);

  return v_grupo;
end;
$$;

-- Inserir familiar: grava o membro e abre a coleta dele no GenDocs.
create or replace function portal_inserir_familiar(
  p_token      uuid,
  p_nome       text,
  p_nascimento date,
  p_parentesco text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid := sessao_candidato(p_token);
  v_membro  uuid;
  v_grupo   uuid;
  v_codigo  text;
  v_email   text;
  v_maior   boolean := maior_de_idade(p_nascimento);
begin
  select codigo into v_codigo from parentescos where nome = p_parentesco;
  if v_codigo is null then
    raise exception 'Parentesco inválido: %', p_parentesco using errcode = '22023';
  end if;

  insert into membros_grupo_familiar (candidato_id, nome, nascimento, parentesco_codigo)
  values (v_id, p_nome, p_nascimento, v_codigo)
  returning id into v_membro;

  v_grupo := garantir_grupo(v_id);

  -- O familiar entra no GenDocs com o e-mail DO TITULAR: as comunicações da
  -- coleta dele são acompanhadas pelo candidato, não pelo familiar.
  select c.email into v_email from candidatos c where c.id = v_id;

  perform gendocs_abrir_coleta(
    v_grupo, 'familiar', false, null, v_membro,
    p_nome, v_email, p_parentesco, v_maior);

  return jsonb_build_object(
    'membro_id', v_membro,
    'maior_de_idade', v_maior,
    'email_notificacao', v_email);
end;
$$;

create or replace function portal_remover_familiar(p_token uuid, p_membro_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := sessao_candidato(p_token);
begin
  delete from membros_grupo_familiar
   where id = p_membro_id and candidato_id = v_id;

  if not found then
    raise exception 'Familiar não encontrado no seu grupo' using errcode = '42501';
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. ERP — grid de Candidatos
--
-- ⚠️ Sem autenticação de backoffice, esta função é chamável por qualquer
-- portador da chave anon. É a mesma exposição que abrir a tabela teria, mas
-- por uma superfície estreita: devolve só as colunas do grid e nada de
-- documento ou endereço. Quando houver login de Secretaria, troque o
-- `grant execute ... to anon` por `to authenticated` e cheque o papel aqui
-- dentro.
-- ---------------------------------------------------------------------------

create or replace function erp_listar_candidatos()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nome), '[]'::jsonb)
    from (
      select c.id,
             c.protocolo,
             c.nome,
             c.cpf,
             c.email,
             c.created_at                              as inscricao,
             cu.codigo_mec || ' – ' || cu.nome         as curso,
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
        left join cursos cu     on cu.id = c.curso_id
        left join polos po      on po.id = c.polo_id
    ) x;
$$;

-- Ficha do candidato no ERP.
create or replace function erp_candidato(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (
    select c.id, c.protocolo, c.nome, c.cpf, c.rg, c.nascimento, c.sexo,
           r.nome as raca, c.email, c.ddd, c.telefone,
           c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
           c.uf_naturalidade, c.municipio_naturalidade,
           e.nome as escolaridade, c.ano_conclusao_em,
           cu.codigo_mec || ' – ' || cu.nome as curso,
           cu.area_conhecimento, cu.tipo_formacao, cu.modalidade,
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
$$;


-- ---------------------------------------------------------------------------
-- 7. GenDocs — tela de módulos e de participantes (visão da Secretaria)
-- ---------------------------------------------------------------------------

create or replace function gendocs_listar_modulos()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.destaque desc, x.nome), '[]'::jsonb)
    from (
      select m.id, m.slug, m.nome, m.descricao, m.perfil::text as perfil,
             m.chamada, m.envio_inicio, m.envio_fim, m.situacao, m.ativo,
             m.destaque, coalesce(m.link_preenchimento, 'N/A') as link_preenchimento,
             coalesce(p.participantes, 0) as participantes,
             coalesce(p.nova, 0)       as nova,
             coalesce(p.aberta, 0)     as aberta,
             coalesce(p.progresso, 0)  as progresso,
             coalesce(p.recebida, 0)   as recebida,
             coalesce(p.finalizada, 0) as finalizada,
             case when coalesce(p.participantes, 0) = 0 then 0
                  else round(100.0 * coalesce(p.finalizada, 0) / p.participantes) end as aprovacao,
             (select count(*) from documentos_exigidos d where d.modulo_id = m.id) as documentos
        from modulos_gendocs m
        left join lateral (
          select count(*)                                          as participantes,
                 count(*) filter (where ct.status = 'nova')        as nova,
                 count(*) filter (where ct.status = 'aberta')      as aberta,
                 count(*) filter (where ct.status = 'progresso')   as progresso,
                 count(*) filter (where ct.status = 'recebida')    as recebida,
                 count(*) filter (where ct.status = 'finalizada')  as finalizada
            from gendocs_participantes gp
            join gendocs_coletas ct on ct.participante_id = gp.id
           where gp.modulo_id = m.id
        ) p on true
    ) x;
$$;

create or replace function gendocs_listar_participantes(p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nome), '[]'::jsonb)
    from (
      select gp.id, gp.nome, gp.email, gp.parentesco, gp.titular,
             gp.identificador_externo,
             g.protocolo,
             ct.status::text as status,
             ct.prazo_em,
             ct.recebida_em,
             (select count(*) from gendocs_documentos_coleta dc where dc.coleta_id = ct.id) as documentos,
             (select count(*) from gendocs_documentos_coleta dc
               where dc.coleta_id = ct.id and dc.status = 'aprovado') as aprovados
        from modulos_gendocs m
        join gendocs_participantes gp on gp.modulo_id = m.id
        join gendocs_grupos g         on g.id = gp.grupo_id
        join gendocs_coletas ct       on ct.participante_id = gp.id
       where m.slug = p_slug
    ) x;
$$;


-- ---------------------------------------------------------------------------
-- 8. Permissões
--
-- Nenhuma função fica com o EXECUTE padrão do `public`. Cada uma é liberada
-- explicitamente para o `anon`, que é o role do protótipo.
-- ---------------------------------------------------------------------------

do $$
declare f text;
begin
  for f in
    select 'sessao_candidato(uuid)'
    union all select 'gendocs_abrir_coleta(uuid,perfil_modulo,boolean,uuid,uuid,text,text,text,boolean)'
    union all select 'garantir_grupo(uuid)'
    union all select 'lp_criar_candidato(jsonb)'
    union all select 'portal_entrar(text,date)'
    union all select 'portal_sair(uuid)'
    union all select 'portal_meus_dados(uuid)'
    union all select 'portal_meu_grupo(uuid)'
    union all select 'portal_documentos(uuid,uuid)'
    union all select 'portal_inserir_familiar(uuid,text,date,text)'
    union all select 'portal_remover_familiar(uuid,uuid)'
    union all select 'erp_listar_candidatos()'
    union all select 'erp_candidato(uuid)'
    union all select 'gendocs_listar_modulos()'
    union all select 'gendocs_listar_participantes(text)'
  loop
    execute format('revoke all on function %s from public', f);
  end loop;
end;
$$;

-- Chamáveis pelo protótipo.
grant execute on function lp_criar_candidato(jsonb)                     to anon;
grant execute on function portal_entrar(text, date)                     to anon;
grant execute on function portal_sair(uuid)                             to anon;
grant execute on function portal_meus_dados(uuid)                       to anon;
grant execute on function portal_meu_grupo(uuid)                        to anon;
grant execute on function portal_documentos(uuid, uuid)                 to anon;
grant execute on function portal_inserir_familiar(uuid, text, date, text) to anon;
grant execute on function portal_remover_familiar(uuid, uuid)           to anon;
grant execute on function erp_listar_candidatos()                       to anon;
grant execute on function erp_candidato(uuid)                           to anon;
grant execute on function gendocs_listar_modulos()                      to anon;
grant execute on function gendocs_listar_participantes(text)            to anon;

-- `sessao_candidato` e `gendocs_abrir_coleta` são internas: chamadas de dentro
-- das outras funções, nunca pelo cliente. Ficam sem grant de propósito.


-- ===========================================================================
-- 9. Os três módulos do ProUni
--
-- Substituem os quatro módulos fictícios do seed. Começam VAZIOS — quem os
-- popula é a inscrição da landing page, participante a participante.
-- ===========================================================================

-- Fora os módulos antigos, junto com os participantes e coletas que o seed
-- havia criado para a candidata de demonstração — os módulos novos precisam
-- nascer sem nenhum aluno. O cadastro dela, a inscrição e o grupo familiar
-- continuam intactos.
--
-- A ordem importa. `modulos_gendocs` cascateia por DOIS caminhos que se
-- cruzam: um leva a `documentos_exigidos`, o outro a
-- `participantes → coletas → documentos_coleta`, e este último referencia o
-- primeiro. O Postgres não garante qual roda antes, então um `delete` só no
-- módulo falha com violação de FK. Apagar os participantes primeiro desfaz o
-- lado que referencia, e aí o módulo sai limpo.
delete from gendocs_participantes
 where modulo_id in (
   select id from modulos_gendocs
    where chamada = '2026.1 — 1ª Chamada' or slug like 'prouni-2026-1-%'
 );

delete from modulos_gendocs
 where chamada = '2026.1 — 1ª Chamada'
    or slug like 'prouni-2026-1-%';

delete from gendocs_grupos
 where not exists (select 1 from gendocs_participantes p where p.grupo_id = gendocs_grupos.id);

insert into modulos_gendocs
  (slug, nome, descricao, perfil, chamada, envio_inicio, envio_fim,
   situacao, ativo, destaque, link_preenchimento)
values
  ('prouni-c-cota', 'PROUNI C/COTA',
   'Coleta documental dos candidatos pré-selecionados no ProUni que se declararam cotistas. Inclui a Declaração de Raça e Cor, exigida de quem declara raça preta, parda ou indígena.',
   'titular_cotista', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A'),

  ('prouni-s-cota', 'PROUNI S/COTA',
   'Coleta documental dos candidatos pré-selecionados no ProUni em ampla concorrência, sem declaração de cota.',
   'titular_sem_cota', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A'),

  ('prouni-familiares', 'PROUNI FAMILIARES',
   'Coleta documental dos membros do grupo familiar declarados pelo candidato. A lista exigida varia com a maioridade, e todas as comunicações vão para o e-mail do titular.',
   'familiar', 'ProUni 2027.1',
   current_date, date '2027-01-01', 'Iniciado', true, true, 'N/A');

-- SLAs iguais nos três.
insert into modulos_sla (modulo_id, status, horas)
select m.id, s.status, s.horas
  from modulos_gendocs m,
  (values ('nova'::status_coleta, 24), ('aberta', 72), ('progresso', 72),
          ('recebida', 48), ('finalizada', 0)) as s(status, horas)
 where m.chamada = 'ProUni 2027.1'
on conflict do nothing;

-- Lista documental dos dois módulos de titular (seção 3.3.1 dos requisitos).
insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, substituicoes)
select m.id, d.seq, d.nome, d.obrig, d.subs
  from modulos_gendocs m,
  (values
    (1,  'Ficha de Inscrição do ProUni (2 páginas)', true, '{}'::text[]),
    (2,  'RG — frente e verso no mesmo arquivo', true, '{CNH}'::text[]),
    (3,  'CPF', true, '{CNH}'::text[]),
    (4,  'Comprovante de Estado Civil', true,
         '{"Certidão de Nascimento","Certidão de Casamento","União Estável","Averbação de Divórcio","Certidão de Óbito"}'::text[]),
    (5,  'Comprovante de Residência', true, '{"Declaração de Imóvel Cedido"}'::text[]),
    (6,  'Histórico Escolar do Ensino Médio + Certificado', true, '{"Declaração da Escola"}'::text[]),
    (7,  'Carteira de Trabalho (CTPS Digital)', true, '{"Declaração de situação"}'::text[]),
    (8,  'Comprovante de Renda', true,
         '{Holerites,Contracheques,"SIMEI / DECORE","Extratos INSS","Nota de Produtor","Ausência de Renda"}'::text[]),
    (9,  'Declaração de Imposto de Renda', true, '{"Certidão Negativa da Receita"}'::text[]),
    (10, 'Declaração de Encerramento de Matrícula', false, '{}'::text[]),
    (11, 'Declaração de Encerramento de Bolsa ProUni / FIES', false, '{}'::text[]),
    (12, 'CNH', false, '{}'::text[])
  ) as d(seq, nome, obrig, subs)
 where m.chamada = 'ProUni 2027.1'
   and m.perfil in ('titular_cotista', 'titular_sem_cota');

-- O item exclusivo do módulo de cota.
insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, orientacao)
select m.id, 13, 'Declaração de Raça e Cor', true,
       'Exigida de quem declarou cota PPI (preta, parda ou indígena) na inscrição.'
  from modulos_gendocs m
 where m.chamada = 'ProUni 2027.1' and m.perfil = 'titular_cotista';

-- Lista do módulo de familiares. `aplica_a` faz a distinção de idade dentro do
-- módulo único: maiores entregam renda e trabalho, menores entregam certidão.
insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, substituicoes, aplica_a)
select m.id, d.seq, d.nome, d.obrig, d.subs, d.aplica
  from modulos_gendocs m,
  (values
    (1, 'CPF', true, '{}'::text[], 'todos'),
    (2, 'RG — frente e verso no mesmo arquivo', true, '{CNH}'::text[], 'maiores'),
    (3, 'Comprovante de Estado Civil', true,
        '{"Certidão de Nascimento","Certidão de Casamento","União Estável","Averbação de Divórcio","Certidão de Óbito"}'::text[], 'maiores'),
    (4, 'Carteira de Trabalho (CTPS Digital)', true, '{"Declaração de situação"}'::text[], 'maiores'),
    (5, 'Comprovante de Renda', true,
        '{Holerites,Contracheques,"SIMEI / DECORE","Extratos INSS","Nota de Produtor","Ausência de Renda"}'::text[], 'maiores'),
    (6, 'Declaração de Imposto de Renda', true, '{"Certidão Negativa da Receita"}'::text[], 'maiores'),
    (7, 'Certidão de Nascimento', true, '{}'::text[], 'menores'),
    (8, 'Declaração de Ausência de Renda', true, '{}'::text[], 'menores')
  ) as d(seq, nome, obrig, subs, aplica)
 where m.chamada = 'ProUni 2027.1' and m.perfil = 'familiar';
