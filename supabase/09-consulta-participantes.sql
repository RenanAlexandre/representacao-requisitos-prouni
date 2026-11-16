-- ============================================================================
-- 09 — Consulta de Participantes e Coletas
--
-- Rode depois do 08.
--
-- A tela inicial do GenDocs tinha duas abas (Módulos Ativos / Inativos), que
-- olham para MÓDULOS. Esta terceira olha para PESSOAS: todos os participantes
-- de todos os módulos numa lista só, que é o que a Secretaria precisa quando
-- procura alguém sem saber em qual módulo ele caiu.
-- ============================================================================

create or replace function gendocs_consultar_coletas()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nome, x.modulo), '[]'::jsonb)
    from (
      select gp.id                        as participante_id,
             gp.nome,
             gp.email,
             gp.titular,
             gp.parentesco,
             gp.identificador_externo,
             g.protocolo,
             m.nome                       as modulo,
             m.slug                       as modulo_slug,
             m.ativo                      as modulo_ativo,
             ct.status::text              as status,
             ct.recebida_em,
             ct.prazo_em,
             -- SLA em horas configurado para o status corrente da coleta.
             sla.horas                    as sla_horas,
             -- Vencido é o que passou do prazo sem ter sido recebido. Coleta
             -- já recebida ou finalizada não vence mais.
             (ct.prazo_em is not null
              and ct.prazo_em < now()
              and ct.status not in ('recebida', 'finalizada')) as vencido,
             count(dc.*)                                          as documentos,
             count(dc.*) filter (where documento_resolvido(dc.id)) as resolvidos
        from gendocs_participantes gp
        join gendocs_grupos g   on g.id = gp.grupo_id
        join modulos_gendocs m  on m.id = gp.modulo_id
        join gendocs_coletas ct on ct.participante_id = gp.id
        left join modulos_sla sla on sla.modulo_id = m.id and sla.status = ct.status
        left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
       group by gp.id, gp.nome, gp.email, gp.titular, gp.parentesco,
                gp.identificador_externo, g.protocolo, m.nome, m.slug, m.ativo,
                ct.status, ct.recebida_em, ct.prazo_em, sla.horas
    ) x;
$$;

comment on function gendocs_consultar_coletas is
  'Aba "Consulta de Participantes e Coletas" da tela inicial do GenDocs: todos os participantes de todos os módulos, com status, prazo e progresso documental.';

revoke all on function gendocs_consultar_coletas() from public;
grant execute on function gendocs_consultar_coletas() to anon;
