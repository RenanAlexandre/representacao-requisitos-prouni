-- ============================================================================
-- 10 — Documentos isentos de verificação + recurso após 3 recusas da IA
--
-- Rode depois do 09.
--
-- Duas regras novas, por motivos opostos:
--
-- 1. ISENÇÃO — imposto de renda e comprovantes de renda não passam pela
--    verificação. Não é falta de rigor: esses documentos variam demais em
--    forma (holerite de empresa, DECORE de contador, extrato do INSS, nota de
--    produtor) para uma checagem automática decidir. O controle deles é
--    declaratório e a conferência é humana, na análise.
--
-- 2. RECURSO — a verificação pode errar. Depois de 3 recusas no mesmo
--    documento, o candidato pode enviar assim mesmo, e a coleta inteira é
--    marcada para verificação manual. Antes disso não havia saída: um falso
--    negativo travava a inscrição.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Isenção por documento
-- ---------------------------------------------------------------------------

alter table documentos_exigidos
  add column if not exists verifica_ia boolean not null default true;

comment on column documentos_exigidos.verifica_ia is
  'Falso = o anexo entra sem verificação automática, seja qual for o arquivo. Vale para os documentos declaratórios (renda), cuja conferência é humana.';

update documentos_exigidos
   set verifica_ia = false
 where nome = 'Declaração de Imposto de Renda'
    or nome like 'Comprovante de renda - %';

-- O aviso vai no descritivo, que é o que o candidato lê na tela.
update documentos_exigidos
   set descricao = coalesce(descricao || ' ', '') ||
       'O sistema aceita este anexo sem conferência automática — a responsabilidade pelo conteúdo é sua. ' ||
       'O documento deve representar a realidade: documento incorreto ou que não corresponda à sua situação ' ||
       'gera indeferimento desta etapa do processo.'
 where verifica_ia = false;


-- ---------------------------------------------------------------------------
-- 2. Recurso ao envio sem verificação
-- ---------------------------------------------------------------------------

alter table gendocs_documentos_coleta
  -- Quantas vezes a verificação recusou ESTE documento. Zera quando passa.
  add column if not exists recusas_ia int not null default 0,
  -- O candidato recorreu e enviou sem verificação.
  add column if not exists bypass_ia boolean not null default false,
  add column if not exists bypass_em timestamptz;

comment on column gendocs_documentos_coleta.bypass_ia is
  'O candidato recorreu depois de 3 recusas e enviou sem verificação. A coleta inteira passa a exigir conferência manual.';

alter table gendocs_coletas
  add column if not exists requer_verificacao_manual boolean not null default false;

comment on column gendocs_coletas.requer_verificacao_manual is
  'Há ao menos um documento enviado por recurso, sem verificação automática. O analista precisa olhar item a item.';

-- Quantas recusas até liberar o recurso. Parametrizado junto da chave da IA.
insert into configuracoes (chave, valor, descricao) values
  ('recusas_ia_para_recurso', '3'::jsonb,
   'Quantas recusas da verificação automática no mesmo documento liberam o envio sem verificação.')
on conflict (chave) do nothing;

create or replace function demo_recusas_para_recurso() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (valor)::int from configuracoes where chave = 'recusas_ia_para_recurso'), 3);
$$;


-- ---------------------------------------------------------------------------
-- 3. O anexo, com as duas regras
-- ---------------------------------------------------------------------------

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
  p_ia_extraido    jsonb default null,
  -- O candidato está recorrendo: enviar sem passar pela verificação.
  p_bypass         boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id        uuid := sessao_candidato(p_token);
  v_versao    int;
  v_arquivo   uuid;
  v_ia_ligada boolean := demo_ia_ativa();
  v_verifica  boolean;
  v_recusas   int;
  v_limite    int := demo_recusas_para_recurso();
  v_status    status_documento;
  v_motivo    text;
  v_aplicada  boolean := false;
  v_bypass    boolean := false;
begin
  select de.verifica_ia, dc.recusas_ia
    into v_verifica, v_recusas
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes p on p.id = ct.participante_id
    join gendocs_grupos g on g.id = p.grupo_id
    join modulos_gendocs m on m.id = p.modulo_id
   where dc.id = p_documento_coleta_id
     and g.candidato_id = v_id
     and current_date between m.envio_inicio and m.envio_fim
     and dc.status <> 'aprovado';

  if v_verifica is null then
    raise exception 'Documento fora do seu grupo, fora do prazo, ou já aprovado pelo analista'
      using errcode = '42501';
  end if;

  -- O recurso só existe depois do limite de recusas. Sem isso, qualquer um
  -- pularia a verificação já no primeiro envio.
  if p_bypass and v_recusas < v_limite then
    raise exception 'O envio sem verificação só é liberado após % recusas (há % até agora)',
      v_limite, v_recusas using errcode = '42501';
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

  if not v_verifica then
    -- Documento declaratório: entra sem conferência, por desenho.
    v_status := 'enviado';
    v_motivo := 'Documento declaratório — aceito sem conferência automática. A verificação é feita na análise da Secretaria.';
  elsif p_bypass then
    -- Recurso do candidato depois de insistir.
    v_status := 'enviado';
    v_bypass  := true;
    v_motivo  := format('Enviado por recurso, após %s recusas da verificação automática. Marcado para conferência manual.', v_recusas);
  elsif not v_ia_ligada then
    v_status := 'aprovado_ia';
    v_motivo := 'Verificação automática desligada no ambiente — anexo aceito sem análise.';
  else
    v_status   := coalesce(nullif(p_ia_status, '')::status_documento, 'aprovado_ia');
    v_motivo   := p_ia_motivo;
    v_aplicada := true;
  end if;

  update gendocs_documentos_coleta
     set arquivo_id      = v_arquivo,
         enviado_em      = now(),
         status          = v_status,
         motivo_recusa   = case when v_status = 'reprovado_ia' then v_motivo end,
         ia_status       = v_status,
         ia_motivo       = v_motivo,
         ia_confianca    = case when v_aplicada then p_ia_confianca end,
         ia_extraido     = case when v_aplicada then p_ia_extraido end,
         ia_analisado_em = now(),
         ia_aplicada     = v_aplicada,
         -- Conta as recusas; uma aprovação zera o contador.
         recusas_ia      = case when v_status = 'reprovado_ia' then recusas_ia + 1 else 0 end,
         bypass_ia       = v_bypass,
         bypass_em       = case when v_bypass then now() end,
         tentativas      = tentativas + 1
   where id = p_documento_coleta_id;

  -- Um recurso contamina a coleta inteira: o analista precisa olhar item a item.
  if v_bypass then
    update gendocs_coletas ct
       set requer_verificacao_manual = true
      from gendocs_documentos_coleta dc
     where dc.id = p_documento_coleta_id and ct.id = dc.coleta_id;
  end if;

  update gendocs_coletas ct
     set status = 'progresso',
         primeiro_envio_em = coalesce(ct.primeiro_envio_em, now())
    from gendocs_documentos_coleta dc
   where dc.id = p_documento_coleta_id and ct.id = dc.coleta_id
     and ct.status in ('nova', 'aberta');

  select recusas_ia into v_recusas
    from gendocs_documentos_coleta where id = p_documento_coleta_id;

  return jsonb_build_object(
    'arquivo_id', v_arquivo,
    'versao', v_versao,
    'status', v_status,
    'motivo', v_motivo,
    'ia_aplicada', v_aplicada,
    'bypass', v_bypass,
    'recusas', v_recusas,
    'pode_recorrer', v_recusas >= v_limite);
end;
$$;

-- Remover o anexo devolve o documento ao início, mas NÃO zera as recusas: o
-- candidato já provou que a verificação não está reconhecendo o arquivo dele,
-- e apagar o contador tiraria o recurso que ele já conquistou.
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
         ia_aplicada = false, bypass_ia = false, bypass_em = null
   where id = p_documento_coleta_id;

  delete from gendocs_arquivos where documento_coleta_id = p_documento_coleta_id;

  -- A coleta deixa de exigir conferência manual se nenhum recurso sobrou.
  update gendocs_coletas ct
     set requer_verificacao_manual = exists (
           select 1 from gendocs_documentos_coleta d2
            where d2.coleta_id = ct.id and d2.bypass_ia)
    from gendocs_documentos_coleta dc
   where dc.id = p_documento_coleta_id and ct.id = dc.coleta_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. A tela precisa saber quem é isento, quantas recusas há e se pode recorrer
-- ---------------------------------------------------------------------------

create or replace function portal_coleta(p_token uuid, p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id     uuid := sessao_candidato(p_token);
  v_limite int  := demo_recusas_para_recurso();
begin
  return (
    select jsonb_build_object(
      'candidato', (select c.nome from candidatos c where c.id = v_id),
      'candidato_id', v_id,
      'modulo', jsonb_build_object(
        'slug', mm.slug, 'nome', mm.nome, 'descricao', mm.descricao,
        'envio_inicio', mm.envio_inicio, 'envio_fim', mm.envio_fim),
      'ia_ativa', demo_ia_ativa(),
      'recusas_para_recurso', v_limite,
      'requer_verificacao_manual', ct.requer_verificacao_manual,
      'participante_id', pp.id,
      'status_coleta', ct.status::text,
      'documentos', coalesce((
        select jsonb_agg(to_jsonb(x) order by x.sequencia)
          from (
            select dc.id as documento_coleta_id,
                   de.id as documento_id,
                   de.sequencia, de.nome, de.obrigatorio, de.descricao,
                   de.verifica_ia,
                   dc.status::text as status, dc.motivo_recusa, dc.enviado_em,
                   dc.ia_aplicada, dc.ia_confianca,
                   dc.recusas_ia, dc.bypass_ia,
                   -- Recurso liberado: já bateu o limite e o item está recusado.
                   (dc.recusas_ia >= v_limite and dc.status = 'reprovado_ia') as pode_recorrer,
                   documento_resolvido(dc.id) as resolvido,
                   a.nome_original, a.tamanho_bytes, a.storage_path,
                   coalesce((select array_agg(alvo.nome order by alvo.sequencia)
                               from documentos_substituicao s
                               join documentos_exigidos alvo on alvo.id = s.substituido_id
                              where s.documento_id = de.id), '{}') as substitui,
                   coalesce((select array_agg(outro.nome order by outro.sequencia)
                               from documentos_substituicao s
                               join documentos_exigidos outro on outro.id = s.documento_id
                              where s.substituido_id = de.id), '{}') as dispensado_por
              from gendocs_documentos_coleta dc
              join documentos_exigidos de on de.id = dc.documento_id
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

-- "Enviar para Análise" já aceitava `enviado` como resolvido (é o que
-- `documento_resolvido` faz: só `pendente`, `reprovado` e `reprovado_ia`
-- barram). Com isso, isentos e recursos passam — que é o comportamento novo.
-- O retorno agora avisa se a coleta vai com conferência manual pendente.
create or replace function portal_enviar_para_analise(p_token uuid, p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := sessao_candidato(p_token);
  v_coleta   uuid;
  v_faltando int;
  v_nomes    text[];
  v_manual   boolean;
  v_recursos int;
begin
  select ct.id, ct.requer_verificacao_manual into v_coleta, v_manual
    from gendocs_coletas ct
    join gendocs_participantes p on p.id = ct.participante_id
    join gendocs_grupos g on g.id = p.grupo_id
    join modulos_gendocs m on m.id = p.modulo_id
   where m.slug = p_slug and g.candidato_id = v_id and p.titular;

  if v_coleta is null then
    raise exception 'Coleta não encontrada' using errcode = 'P0002';
  end if;

  select count(*), array_agg(de.nome order by de.sequencia)
    into v_faltando, v_nomes
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
   where dc.coleta_id = v_coleta
     and de.obrigatorio
     and not documento_resolvido(dc.id);

  if v_faltando > 0 then
    return jsonb_build_object('ok', false, 'faltando', v_faltando, 'documentos', v_nomes);
  end if;

  select count(*) into v_recursos
    from gendocs_documentos_coleta where coleta_id = v_coleta and bypass_ia;

  update gendocs_coletas
     set status = 'recebida', recebida_em = now()
   where id = v_coleta;

  return jsonb_build_object(
    'ok', true, 'faltando', 0,
    'verificacao_manual', coalesce(v_manual, false),
    'recursos', v_recursos);
end;
$$;

-- A Secretaria precisa ver na consulta quais coletas vieram com recurso.
create or replace function gendocs_consultar_coletas()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nome, x.modulo), '[]'::jsonb)
    from (
      select gp.id                        as participante_id,
             gp.nome, gp.email, gp.titular, gp.parentesco,
             gp.identificador_externo,
             g.protocolo,
             m.nome                       as modulo,
             m.slug                       as modulo_slug,
             m.ativo                      as modulo_ativo,
             ct.status::text              as status,
             ct.recebida_em,
             ct.prazo_em,
             ct.requer_verificacao_manual,
             sla.horas                    as sla_horas,
             (ct.prazo_em is not null
              and ct.prazo_em < now()
              and ct.status not in ('recebida', 'finalizada')) as vencido,
             count(dc.*)                                          as documentos,
             count(dc.*) filter (where documento_resolvido(dc.id)) as resolvidos,
             count(dc.*) filter (where dc.bypass_ia)               as recursos
        from gendocs_participantes gp
        join gendocs_grupos g   on g.id = gp.grupo_id
        join modulos_gendocs m  on m.id = gp.modulo_id
        join gendocs_coletas ct on ct.participante_id = gp.id
        left join modulos_sla sla on sla.modulo_id = m.id and sla.status = ct.status
        left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
       group by gp.id, gp.nome, gp.email, gp.titular, gp.parentesco,
                gp.identificador_externo, g.protocolo, m.nome, m.slug, m.ativo,
                ct.status, ct.recebida_em, ct.prazo_em, ct.requer_verificacao_manual, sla.horas
    ) x;
$$;

revoke all on function demo_recusas_para_recurso() from public;
grant execute on function demo_recusas_para_recurso() to anon;
revoke all on function portal_anexar_documento(
  uuid, uuid, text, text, text, bigint, text, text, text, numeric, jsonb, boolean) from public;
grant execute on function portal_anexar_documento(
  uuid, uuid, text, text, text, bigint, text, text, text, numeric, jsonb, boolean) to anon;
