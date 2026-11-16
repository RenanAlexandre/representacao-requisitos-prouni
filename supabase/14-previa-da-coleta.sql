-- ============================================================================
-- 14 — Prévia da coleta para o analista
--
-- Rode depois do 13.
--
-- O segundo botão redondo da tela de análise é o link da coleta: o analista
-- quer abrir a tela que o candidato vê. Só que aquela tela exige sessão do
-- portal, e o analista não tem uma — ele cairia no "Entre no Portal do
-- Candidato" e o botão morreria ali.
--
-- A saída é uma prévia: mesma tela, mesmos dados, sem sessão e sem ação. O
-- corpo do `portal_coleta` sai para uma função só, e as duas portas de
-- entrada — a do candidato (com token) e a do analista (com participante) —
-- chamam a mesma coisa. Assim a prévia não pode divergir da tela real, que é
-- o defeito clássico de "tela de visualização" duplicada.
-- ============================================================================

create or replace function coleta_como_json(p_participante_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_limite int := demo_recusas_para_recurso();
begin
  return (
    select jsonb_build_object(
      -- Quem está preenchendo: o titular ou o familiar. Para o titular é o
      -- mesmo nome do candidato.
      'candidato', pp.nome,
      -- O id do candidato manda no caminho do Storage, então é sempre o do
      -- titular do grupo, mesmo quando quem preenche é um familiar.
      'candidato_id', g.candidato_id,
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
    from gendocs_participantes pp
    join modulos_gendocs mm on mm.id = pp.modulo_id
    join gendocs_grupos g on g.id = pp.grupo_id
    join gendocs_coletas ct on ct.participante_id = pp.id
   where pp.id = p_participante_id
  );
end;
$$;

comment on function coleta_como_json is
  'Corpo compartilhado da tela de coleta. Não conceder ao anon direto: as portas são portal_coleta (candidato) e gendocs_previa_coleta (analista).';

-- Porta do candidato: resolve o participante pela sessão e pelo módulo.
create or replace function portal_coleta(p_token uuid, p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id  uuid := sessao_candidato(p_token);
  v_pp  uuid;
begin
  select pp.id into v_pp
    from gendocs_participantes pp
    join modulos_gendocs mm on mm.id = pp.modulo_id
    join gendocs_grupos g on g.id = pp.grupo_id
   where mm.slug = p_slug and g.candidato_id = v_id and pp.titular
   limit 1;

  if v_pp is null then return null; end if;
  return coleta_como_json(v_pp);
end;
$$;

-- Porta do analista: sem sessão, e a tela que consome sabe que é só leitura.
create or replace function gendocs_previa_coleta(p_participante_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coleta_como_json(p_participante_id);
$$;

comment on function gendocs_previa_coleta is
  'A tela de coleta como o participante a vê, para o analista conferir. Somente leitura — nenhuma ação de anexo passa por aqui.';

revoke all on function coleta_como_json(uuid) from public;
revoke all on function gendocs_previa_coleta(uuid) from public;
grant execute on function gendocs_previa_coleta(uuid) to anon;
