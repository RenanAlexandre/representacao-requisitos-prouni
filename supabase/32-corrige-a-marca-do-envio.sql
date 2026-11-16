-- ============================================================================
-- 32 — Conserta a marca que a 31 usou errado
--
-- Rode logo depois do 31. NÃO deixe o banco parado no 31.
--
-- O ERRO
-- ------
-- A migração 31 precisava de "esta coleta já foi enviada para análise ao menos
-- uma vez" e reaproveitou `gendocs_coletas.primeiro_envio_em` achando que era
-- isso. Não é. Essa coluna existe desde o `01-schema.sql` e é carimbada por
-- `portal_anexar_documento` no PRIMEIRO ANEXO — é o marco de SLA da passagem
-- de "aberta" para "em progresso".
--
-- Com a regra da 31 lendo essa coluna, o efeito era o oposto do pretendido:
-- ao subir o primeiro documento, o candidato travava todos os outros e só
-- conseguiria mexer no que estivesse indeferido — ou seja, ficaria impedido de
-- terminar a própria coleta.
--
-- O CONSERTO
-- ----------
-- Coluna própria, `primeira_analise_em`, com um nome que não se confunde com a
-- outra. `primeiro_envio_em` volta a ser só o que sempre foi, e ninguém além
-- de `portal_anexar_documento` escreve nela.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. A marca certa
-- ---------------------------------------------------------------------------
alter table gendocs_coletas add column if not exists primeira_analise_em timestamptz;

comment on column gendocs_coletas.primeira_analise_em is
  'Primeiro "Enviar para Análise" desta coleta. Nunca é limpo — ao contrário de recebida_em, que o indeferimento zera para reabrir. NÃO confundir com primeiro_envio_em, que é o primeiro anexo (marco de SLA).';

-- Reconstrução do histórico, na ordem do que é mais confiável:
--   1. `recebida_em`   — a coleta está com o analista agora.
--   2. `finalizada_em` — foi encerrada, logo foi enviada antes.
--   3. o primeiro parecer dado em qualquer documento — um analista só age
--      depois do envio, então isto prova que houve envio mesmo quando o
--      indeferimento já apagou `recebida_em`.
-- Coleta sem nenhum dos três nunca foi enviada, e fica nula de propósito.
update gendocs_coletas ct
   set primeira_analise_em = coalesce(
         ct.recebida_em,
         ct.finalizada_em,
         (select min(dc.analisado_em) from gendocs_documentos_coleta dc
           where dc.coleta_id = ct.id))
 where ct.primeira_analise_em is null;


-- ---------------------------------------------------------------------------
-- 2. A trava passa a ler a coluna certa
-- ---------------------------------------------------------------------------
create or replace function coleta_editavel(p_documento_coleta_id uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select case
           -- Coleta na mão do analista, ou encerrada: nada se mexe.
           when ct.status in ('recebida', 'finalizada') then false
           -- Nunca foi enviada para análise: o candidato ainda está montando.
           when ct.primeira_analise_em is null then true
           -- Já foi analisada e voltou: só o que foi indeferido.
           else dc.status in ('reprovado', 'reprovado_ia')
         end
    from gendocs_documentos_coleta dc
    join gendocs_coletas ct on ct.id = dc.coleta_id
   where dc.id = p_documento_coleta_id;
$fn$;


-- ---------------------------------------------------------------------------
-- 3. O envio carimba a coluna certa, e devolve a outra ao dono
-- ---------------------------------------------------------------------------
create or replace function portal_enviar_para_analise_de(p_token uuid, p_participante_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
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
         primeira_analise_em = coalesce(primeira_analise_em, now()),
         requer_verificacao_manual = (v_recursos > 0)
   where id = v_coleta;

  return jsonb_build_object('ok', true, 'faltando', 0,
                            'verificacao_manual', v_recursos > 0, 'recursos', v_recursos);
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 4. A tela lê a coluna certa
-- ---------------------------------------------------------------------------
create or replace function coleta_como_json(p_participante_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare v_limite int := demo_recusas_para_recurso();
begin
  return (
    select jsonb_build_object(
      'candidato', pp.nome,
      'candidato_id', g.candidato_id,
      'modulo', jsonb_build_object(
        'slug', mm.slug, 'nome', mm.nome, 'descricao', mm.descricao,
        'envio_inicio', mm.envio_inicio, 'envio_fim', mm.envio_fim),
      'ia_ativa', demo_ia_ativa(),
      'recusas_para_recurso', v_limite,
      'requer_verificacao_manual', ct.requer_verificacao_manual,
      'participante_id', pp.id,
      'status_coleta', ct.status::text,
      'primeira_analise_em', ct.primeira_analise_em,
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
                   (dc.recusas_ia >= v_limite and dc.status = 'reprovado_ia') as pode_recorrer,
                   documento_resolvido(dc.id) as resolvido,
                   coleta_editavel(dc.id) as editavel,
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
    from gendocs_participantes pp
    join modulos_gendocs mm on mm.id = pp.modulo_id
    join gendocs_grupos g on g.id = pp.grupo_id
    join gendocs_coletas ct on ct.participante_id = pp.id
   where pp.id = p_participante_id
  );
end;
$fn$;


-- ---------------------------------------------------------------------------
-- Conferência
--
-- O teste que importa: uma coleta que NUNCA foi para análise tem de estar com
-- todos os itens editáveis. Era exatamente isso que a 31 quebrava.
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_travadas int;
  v_ct       record;
begin
  select count(*) into v_travadas
    from gendocs_documentos_coleta dc
    join gendocs_coletas ct on ct.id = dc.coleta_id
   where ct.primeira_analise_em is null
     and ct.status not in ('recebida', 'finalizada')
     and not coleta_editavel(dc.id);

  if v_travadas > 0 then
    raise exception '% item(ns) travados em coleta que nunca foi enviada', v_travadas;
  end if;

  for v_ct in
    select gp.nome, ct.status::text as st,
           ct.primeiro_envio_em is not null as tem_1o_anexo,
           ct.primeira_analise_em is not null as ja_analisada
      from gendocs_coletas ct join gendocs_participantes gp on gp.id = ct.participante_id
     order by gp.nome
  loop
    raise notice '% | % | 1o anexo: % | já enviada: %',
      rpad(v_ct.nome, 16), rpad(v_ct.st, 11), v_ct.tem_1o_anexo, v_ct.ja_analisada;
  end loop;
end;
$blk$;
