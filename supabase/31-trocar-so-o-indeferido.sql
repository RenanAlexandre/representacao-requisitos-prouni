-- ============================================================================
-- 31 — Depois do primeiro envio, o candidato só mexe no que foi indeferido
--
-- Rode depois do 30.
--
-- O PROBLEMA
-- ----------
-- Indeferir um documento reabre a coleta (migração 13) — precisa reabrir,
-- senão o candidato não teria como corrigir o que voltou. Mas reabrir liberava
-- a coleta INTEIRA: dava para trocar também o que já tinha sido aprovado, ou o
-- que ainda estava esperando parecer. O analista voltaria a uma coleta
-- diferente daquela que ele tinha começado a julgar.
--
-- A REGRA NOVA
-- ------------
-- Antes do primeiro envio: tudo aberto, como sempre foi.
-- Depois do primeiro envio: só o que está INDEFERIDO pode ser trocado ou
-- removido. O resto fica travado — inclusive o que ainda não tem parecer.
--
-- Não dá para usar `recebida_em` como marca de "já foi enviada": indeferir
-- limpa esse campo justamente para reabrir. Daí a coluna nova, que registra o
-- PRIMEIRO envio e nunca é apagada.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. A marca de "esta coleta já passou pela análise ao menos uma vez"
-- ---------------------------------------------------------------------------
alter table gendocs_coletas add column if not exists primeiro_envio_em timestamptz;

comment on column gendocs_coletas.primeiro_envio_em is
  'Instante do primeiro "Enviar para Análise". Nunca é limpo — ao contrário de recebida_em, que o indeferimento zera para reabrir a coleta.';

-- Coletas que já foram enviadas antes desta migração: a melhor aproximação é
-- o que o banco tem. `recebida_em` para as que estão paradas com o analista,
-- `finalizada_em` para as encerradas. As que foram reabertas por
-- indeferimento perderam os dois — para essas fica NULL, e elas seguem com a
-- regra antiga até o próximo envio. Não invento data que não existe.
update gendocs_coletas
   set primeiro_envio_em = coalesce(recebida_em, finalizada_em)
 where primeiro_envio_em is null
   and coalesce(recebida_em, finalizada_em) is not null;


-- ---------------------------------------------------------------------------
-- 2. Enviar para análise carimba o primeiro envio
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
         primeiro_envio_em = coalesce(primeiro_envio_em, now()),
         requer_verificacao_manual = (v_recursos > 0)
   where id = v_coleta;

  return jsonb_build_object('ok', true, 'faltando', 0,
                            'verificacao_manual', v_recursos > 0, 'recursos', v_recursos);
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 3. A trava
--
-- Continua sendo a mesma função que o anexo e a remoção consultam, então as
-- duas ações passam a obedecer à regra sem que nada mais mude.
-- ---------------------------------------------------------------------------
create or replace function coleta_editavel(p_documento_coleta_id uuid)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select case
           -- Coleta na mão do analista, ou encerrada: nada se mexe.
           when ct.status in ('recebida', 'finalizada') then false
           -- Nunca foi enviada: o candidato ainda está montando, tudo aberto.
           when ct.primeiro_envio_em is null then true
           -- Já foi analisada e voltou: só o que foi indeferido.
           else dc.status in ('reprovado', 'reprovado_ia')
         end
    from gendocs_documentos_coleta dc
    join gendocs_coletas ct on ct.id = dc.coleta_id
   where dc.id = p_documento_coleta_id;
$fn$;

comment on function coleta_editavel is
  'Este item pode ser trocado ou removido pelo candidato agora? Depois do primeiro envio, só os indeferidos.';


-- ---------------------------------------------------------------------------
-- 4. A tela do candidato precisa saber disso item a item
--
-- Sem devolver o campo, a tela teria de adivinhar a regra — e duas cópias da
-- mesma regra divergem. `coleta_como_json` é o corpo que serve tanto a porta
-- do candidato quanto a prévia do analista (migração 14), então basta aqui.
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
      'primeiro_envio_em', ct.primeiro_envio_em,
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
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_coluna    int;
  v_carimbadas int;
  v_amostra   jsonb;
  v_pp        uuid;
begin
  select count(*) into v_coluna from information_schema.columns
   where table_name = 'gendocs_coletas' and column_name = 'primeiro_envio_em';
  if v_coluna <> 1 then
    raise exception 'A coluna primeiro_envio_em não foi criada';
  end if;

  select count(*) into v_carimbadas from gendocs_coletas where primeiro_envio_em is not null;

  select pp.id into v_pp from gendocs_participantes pp limit 1;
  if v_pp is not null then
    v_amostra := coleta_como_json(v_pp);
    if v_amostra->'documentos'->0 ? 'editavel' then
      raise notice 'coleta_como_json devolve "editavel" por documento';
    else
      raise exception 'coleta_como_json não devolveu o campo editavel';
    end if;
  end if;

  raise notice 'coletas com primeiro envio carimbado: %', v_carimbadas;
end;
$blk$;
