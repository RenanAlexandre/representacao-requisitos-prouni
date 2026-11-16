-- ============================================================================
-- 23 — Remover um anexo devolve TODOS os caminhos do Storage
--
-- Rode depois do 22.
--
-- O VAZAMENTO
-- -----------
-- Cada "Trocar" grava uma versão nova em `gendocs_arquivos` e deixa a anterior
-- no Storage — de propósito, é o histórico de uploads. Mas `portal_remover_anexo`
-- apaga TODAS as versões do banco, enquanto a tela só apagava do Storage o
-- arquivo vigente (`doc.storage_path`). Trocar N vezes e depois remover deixava
-- N-1 objetos órfãos, para sempre.
--
-- Encontrado varrendo o Storage depois de limpar os candidatos de teste: quatro
-- arquivos sem dono nenhum no banco.
--
-- A função passa a DEVOLVER os caminhos que apagou, e a tela apaga todos.
-- Quem sabe quais arquivos existiam é o banco, não a tela.
-- ============================================================================

drop function if exists portal_remover_anexo(uuid, uuid);

create or replace function portal_remover_anexo(p_token uuid, p_documento_coleta_id uuid)
returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := sessao_candidato(p_token);
  v_coleta   uuid;
  v_caminhos text[];
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

  -- Todas as versões, não só a vigente. O `returning` dentro do CTE é o que
  -- permite apagar e recolher os caminhos numa passada só.
  with apagados as (
    delete from gendocs_arquivos
     where documento_coleta_id = p_documento_coleta_id
    returning storage_path
  )
  select array_agg(storage_path) into v_caminhos from apagados;

  perform recalcular_verificacao_manual(v_coleta);

  return coalesce(v_caminhos, '{}');
end;
$$;

revoke all on function portal_remover_anexo(uuid, uuid) from public;
grant execute on function portal_remover_anexo(uuid, uuid) to anon;
