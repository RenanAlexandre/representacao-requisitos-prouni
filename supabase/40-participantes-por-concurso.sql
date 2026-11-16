-- ============================================================================
-- 40 — A contagem de participantes é do concurso, não do módulo
--
-- Rode depois do 39.
--
-- O QUE ESTAVA ERRADO
-- -------------------
-- `erp_modulos_do_concurso` contava toda a gente do módulo. Como os três
-- concursos compartilham os mesmos 19 módulos (decisão da 39), a tela mostrava
-- os MESMOS 9 participantes na 1ª chamada, na 2ª e na lista de espera — sendo
-- que só a 1ª tem inscrito. O número estava certo sobre o módulo e errado
-- sobre a tela onde aparece.
--
-- Agora a contagem atravessa o caminho inteiro:
--   participante -> grupo -> candidato -> inscrição -> concurso
--
-- Vale tanto para o titular quanto para o familiar: o familiar não tem
-- inscrição própria, ele pertence ao grupo do candidato, e é a inscrição DESSE
-- candidato que diz em qual chamada a coleta dele está sendo feita.
-- ============================================================================

create or replace function erp_modulos_do_concurso(p_concurso_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.ordem_grupo, x.ordem, x.nome), '[]'::jsonb)
    from (
      select m.id,
             m.slug,
             m.nome,
             m.combinacao,
             m.situacao,
             m.ativo,
             m.envio_inicio,
             m.envio_fim,
             -- Titular primeiro (combinação, da mais simples para a mais
             -- composta), familiares depois.
             case when m.combinacao is null then 1 else 0 end as ordem_grupo,
             coalesce(length(m.combinacao), 9) as ordem,
             (select count(*) from documentos_exigidos d where d.modulo_id = m.id) as documentos,
             (select count(*) from documentos_exigidos d
               where d.modulo_id = m.id and d.obrigatorio)                          as obrigatorios,
             -- Só quem está neste módulo E cujo candidato está neste concurso.
             (select count(*)
                from gendocs_participantes p
                join gendocs_grupos g   on g.id = p.grupo_id
                join inscricoes i       on i.candidato_id = g.candidato_id
               where p.modulo_id = m.id
                 and i.concurso_id = p_concurso_id)                                 as participantes
        from concursos_modulos_gendocs cm
        join modulos_gendocs m on m.id = cm.modulo_gendocs_id
       where cm.concurso_id = p_concurso_id
    ) x;
$fn$;

revoke all on function erp_modulos_do_concurso(uuid) from public;
grant execute on function erp_modulos_do_concurso(uuid) to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  r        record;
  v_soma   int;
  v_total  int;
  v_geral  int := 0;
begin
  select count(*) into v_total from gendocs_participantes;

  for r in select id, nome from concursos order by inicio loop
    select coalesce(sum((e->>'participantes')::int), 0) into v_soma
      from jsonb_array_elements(erp_modulos_do_concurso(r.id)) e;
    v_geral := v_geral + v_soma;
    raise notice '% -> % participante(s)', rpad(r.nome, 24), v_soma;
  end loop;

  -- A soma das três chamadas tem de dar exatamente o total: cada participante
  -- pertence a um candidato, que tem uma inscrição, que está em um concurso.
  if v_geral <> v_total then
    raise exception 'Soma por concurso deu %, mas há % participantes', v_geral, v_total;
  end if;

  raise notice 'soma bate com o total de participantes: %', v_total;
end;
$blk$;
