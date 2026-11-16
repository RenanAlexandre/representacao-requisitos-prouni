-- ============================================================================
-- 22 — A marca de conferência manual deixa de grudar
--
-- Rode depois do 21.
--
-- O BUG
-- -----
-- `requer_verificacao_manual` era ligada quando um anexo entrava por recurso e
-- nunca mais desligava. Se o candidato removia esse anexo e mandava o
-- documento correto, a coleta continuava marcada — o analista via "tem
-- documento sem conferência" numa coleta em que não havia mais nenhum. No
-- teste apareceu como `recursos: 0` junto de `verificacao_manual: true`.
--
-- A marca passa a ser DERIVADA da contagem de anexos com `bypass_ia`, sempre.
-- Estado que se calcula não desincroniza.
-- ============================================================================

create or replace function recalcular_verificacao_manual(p_coleta_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_recursos int;
begin
  select count(*) into v_recursos
    from gendocs_documentos_coleta where coleta_id = p_coleta_id and bypass_ia;

  update gendocs_coletas
     set requer_verificacao_manual = (v_recursos > 0)
   where id = p_coleta_id;

  return v_recursos > 0;
end;
$$;

-- Remover o anexo por recurso tem de apagar a marca junto.
create or replace function portal_remover_anexo(p_token uuid, p_documento_coleta_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid := sessao_candidato(p_token);
  v_coleta uuid;
begin
  select dc.coleta_id into v_coleta
    from gendocs_documentos_coleta dc
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes p on p.id = ct.participante_id
    join gendocs_grupos g on g.id = p.grupo_id
   where dc.id = p_documento_coleta_id and g.candidato_id = v_id
     and dc.status <> 'aprovado';

  if v_coleta is null then
    raise exception 'Documento fora do seu grupo ou já aprovado pelo analista'
      using errcode = '42501';
  end if;

  if not coleta_editavel(p_documento_coleta_id) then
    raise exception 'A coleta já foi enviada para análise e não pode mais ser alterada'
      using errcode = '42501';
  end if;

  update gendocs_documentos_coleta
     set arquivo_id = null, enviado_em = null, status = 'pendente',
         motivo_recusa = null, ia_status = null, ia_motivo = null,
         ia_confianca = null, ia_extraido = null, ia_analisado_em = null,
         ia_aplicada = false, bypass_ia = false, bypass_em = null
   where id = p_documento_coleta_id;

  delete from gendocs_arquivos where documento_coleta_id = p_documento_coleta_id;

  perform recalcular_verificacao_manual(v_coleta);
end;
$$;

-- E o envio por slug passa a ser um apelido do envio por participante, em vez
-- de uma segunda implementação que já tinha divergido desta forma.
create or replace function portal_enviar_para_analise(p_token uuid, p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token); v_pp uuid;
begin
  select p.id into v_pp
    from gendocs_participantes p
    join gendocs_grupos g on g.id = p.grupo_id
    join modulos_gendocs m on m.id = p.modulo_id
   where m.slug = p_slug and g.candidato_id = v_id and p.titular;

  if v_pp is null then
    raise exception 'Coleta não encontrada' using errcode = 'P0002';
  end if;
  return portal_enviar_para_analise_de(p_token, v_pp);
end;
$$;

-- Conserta as coletas que já ficaram com a marca grudada.
do $$
declare n int;
begin
  update gendocs_coletas ct
     set requer_verificacao_manual = exists (
           select 1 from gendocs_documentos_coleta dc
            where dc.coleta_id = ct.id and dc.bypass_ia)
   where ct.requer_verificacao_manual <> exists (
           select 1 from gendocs_documentos_coleta dc
            where dc.coleta_id = ct.id and dc.bypass_ia);
  get diagnostics n = row_count;
  raise notice 'coletas com a marca corrigida: %', n;
end;
$$;

revoke all on function recalcular_verificacao_manual(uuid) from public;
grant execute on function portal_remover_anexo(uuid, uuid) to anon;
grant execute on function portal_enviar_para_analise(uuid, text) to anon;
