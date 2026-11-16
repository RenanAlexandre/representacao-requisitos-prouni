-- ============================================================================
-- 12 — Seção GenDocs na ficha do candidato do ERP
--
-- Rode depois do 11.
--
-- A ficha do candidato mostra a oferta dele: curso, filiais, plano de
-- pagamento. Faltava o que já existe do outro lado da integração — as coletas
-- que a inscrição abriu no GenDocs. Sem isso, quem atende no ERP tem de sair
-- da tela e procurar a pessoa no GenDocs pelo nome.
--
-- Devolve uma linha por COLETA, não por pessoa: o titular tem uma no módulo
-- PROUNI e mais uma por declaração que marcou "Sim" na inscrição, e cada
-- familiar do grupo tem a dele no PROUNI. Familiar não tem e-mail próprio —
-- o `email` que vem aqui é o do titular, que é para onde as comunicações vão.
-- ============================================================================

create or replace function erp_coletas_do_candidato(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.titular desc, x.ordem, x.nome), '[]'::jsonb)
    from (
      select gp.id                      as participante_id,
             gp.nome,
             gp.email,
             gp.titular,
             gp.parentesco,
             gp.identificador_externo,
             g.protocolo,
             m.slug                     as modulo_slug,
             m.nome                     as modulo,
             coalesce(m.link_preenchimento, 'N/A') as link_preenchimento,
             -- PROUNI primeiro; as declarações condicionais depois.
             case m.perfil when 'prouni' then 1 else 2 end as ordem,
             ct.status::text            as status,
             ct.prazo_em,
             ct.recebida_em,
             ct.requer_verificacao_manual,
             count(dc.*)                                           as documentos,
             count(dc.*) filter (where documento_resolvido(dc.id))  as resolvidos
        from gendocs_grupos g
        join gendocs_participantes gp on gp.grupo_id = g.id
        join modulos_gendocs m        on m.id = gp.modulo_id
        join gendocs_coletas ct       on ct.participante_id = gp.id
        left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
       where g.candidato_id = p_id
       group by gp.id, gp.nome, gp.email, gp.titular, gp.parentesco,
                gp.identificador_externo, g.protocolo, m.slug, m.nome,
                m.link_preenchimento, m.perfil, ct.status, ct.prazo_em,
                ct.recebida_em, ct.requer_verificacao_manual
    ) x;
$$;

comment on function erp_coletas_do_candidato is
  'Seção GenDocs da ficha do candidato no ERP: uma linha por coleta do grupo — do titular e dos familiares.';

revoke all on function erp_coletas_do_candidato(uuid) from public;
grant execute on function erp_coletas_do_candidato(uuid) to anon;
