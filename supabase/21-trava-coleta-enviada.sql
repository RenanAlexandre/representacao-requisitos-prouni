-- ============================================================================
-- 21 — Coleta enviada não aceita mais anexo
--
-- Rode depois do 20.
--
-- A migração 20 trancou a REMOÇÃO depois do envio, mas não o ANEXO: dava para
-- trocar um arquivo de uma coleta que já estava na fila da análise, e o
-- analista veria um documento diferente do que recebeu. Mesma trava, agora do
-- outro lado.
-- ============================================================================

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

  -- Coleta enviada é coleta fechada: nada entra, nada troca, até o analista
  -- deferir ou indeferir. Indeferir um documento reabre a coleta (migração 13)
  -- e só então aquele item volta a aceitar arquivo.
  if not coleta_editavel(p_documento_coleta_id) then
    raise exception 'A coleta já foi enviada para análise e não pode mais ser alterada'
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
revoke all on function portal_anexar_documento(
  uuid, uuid, text, text, text, bigint, text, text, text, numeric, jsonb, boolean) from public;
grant execute on function portal_anexar_documento(
  uuid, uuid, text, text, text, bigint, text, text, text, numeric, jsonb, boolean) to anon;
