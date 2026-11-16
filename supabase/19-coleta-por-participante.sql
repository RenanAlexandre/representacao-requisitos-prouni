-- ============================================================================
-- 19 — O candidato abre também a coleta dos familiares
--
-- Rode depois do 18.
--
-- `portal_coleta(token, slug)` resolve o participante com `and pp.titular` —
-- servia enquanto o familiar dividia o módulo com o titular. Agora o familiar
-- tem módulo próprio, e por aquele caminho a coleta dele não aparece para
-- ninguém: o titular abriria o link e receberia nulo.
--
-- Entram duas portas por PARTICIPANTE. Elas não afrouxam nada: exigem sessão
-- válida e conferem que a pessoa pertence ao grupo de quem está logado — a
-- mesma checagem que `portal_anexar_documento` já fazia para os anexos.
-- ============================================================================

create or replace function participante_do_grupo(p_token uuid, p_participante_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  return exists (
    select 1 from gendocs_participantes p
      join gendocs_grupos g on g.id = p.grupo_id
     where p.id = p_participante_id and g.candidato_id = v_id);
end;
$$;

create or replace function portal_coleta_de(p_token uuid, p_participante_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not participante_do_grupo(p_token, p_participante_id) then
    raise exception 'Esta coleta não é do seu grupo' using errcode = '42501';
  end if;
  return coleta_como_json(p_participante_id);
end;
$$;

create or replace function portal_enviar_para_analise_de(p_token uuid, p_participante_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_coleta   uuid;
  v_faltando int;
  v_nomes    text[];
  v_recursos int;
begin
  if not participante_do_grupo(p_token, p_participante_id) then
    raise exception 'Esta coleta não é do seu grupo' using errcode = '42501';
  end if;

  select ct.id into v_coleta
    from gendocs_coletas ct where ct.participante_id = p_participante_id;

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
     set status = 'recebida', recebida_em = now(),
         requer_verificacao_manual = (v_recursos > 0)
   where id = v_coleta;

  return jsonb_build_object('ok', true, 'faltando', 0,
                            'verificacao_manual', v_recursos > 0, 'recursos', v_recursos);
end;
$$;

revoke all on function participante_do_grupo(uuid, uuid) from public;
revoke all on function portal_coleta_de(uuid, uuid) from public;
revoke all on function portal_enviar_para_analise_de(uuid, uuid) from public;
grant execute on function portal_coleta_de(uuid, uuid)              to anon;
grant execute on function portal_enviar_para_analise_de(uuid, uuid) to anon;
