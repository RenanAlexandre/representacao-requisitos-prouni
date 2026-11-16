-- ============================================================================
-- 16 — Levar quem já existe para o módulo combinado
--
-- Rode depois do 15.
--
-- Os candidatos cadastrados estão espalhados: o titular no módulo PROUNI e
-- mais um participante em cada módulo condicional que ele marcou. Aqui cada
-- grupo passa a ter uma coleta só, no módulo da combinação dele.
--
-- POR QUE MOVER EM VEZ DE RECRIAR
-- -------------------------------
-- Recriar seria uma linha de SQL, mas jogaria fora os anexos já enviados e o
-- histórico de análise. Como os 14 documentos base têm o MESMO NOME em todos
-- os 16 módulos, dá para mover o participante e reapontar cada linha da coleta
-- para o documento homônimo do módulo de destino — arquivo, status, revisor e
-- histórico seguem junto.
-- ============================================================================

do $$
declare
  g          record;
  v_destino  uuid;
  v_movidos  int := 0;
  v_apagados int := 0;
  v_novos    int := 0;
  n          int;
begin
  for g in
    select gr.id as grupo_id, gr.candidato_id, c.nome
      from gendocs_grupos gr
      join candidatos c on c.id = gr.candidato_id
  loop
    v_destino := modulo_do_candidato(g.candidato_id);

    -- 1. Fora os participantes dos módulos condicionais antigos: o que eles
    --    cobriam vira documento dentro do módulo de destino.
    with mortos as (
      select p.id from gendocs_participantes p
        join modulos_gendocs m on m.id = p.modulo_id
       where p.grupo_id = g.grupo_id
         and m.slug in ('prouni-raca-e-cor', 'prouni-encerramento-matricula',
                        'prouni-encerramento-beneficio')
    )
    delete from gendocs_participantes where id in (select id from mortos);
    get diagnostics n = row_count;
    v_apagados := v_apagados + n;

    -- 2. O titular e os familiares vão para o módulo de destino.
    update gendocs_participantes
       set modulo_id = v_destino
     where grupo_id = g.grupo_id and modulo_id <> v_destino;
    get diagnostics n = row_count;
    v_movidos := v_movidos + n;

    -- 3. Cada linha da coleta reaponta para o documento homônimo do destino.
    update gendocs_documentos_coleta dc
       set documento_id = novo.id
      from documentos_exigidos velho, documentos_exigidos novo,
           gendocs_coletas ct, gendocs_participantes p
     where velho.id = dc.documento_id
       and ct.id = dc.coleta_id and p.id = ct.participante_id
       and p.grupo_id = g.grupo_id
       and novo.modulo_id = v_destino
       and novo.nome = velho.nome
       and novo.id <> velho.id;

    -- 4. Os comprovantes das declarações ainda não têm linha: entram agora,
    --    respeitando o `aplica_a` (os condicionais são só do titular).
    insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
    select ct.id, d.id, 'pendente'
      from gendocs_participantes p
      join gendocs_coletas ct on ct.participante_id = p.id
      join documentos_exigidos d on d.modulo_id = v_destino
     where p.grupo_id = g.grupo_id
       and (d.aplica_a = 'todos' or (d.aplica_a = 'titular' and p.titular))
       and not exists (select 1 from gendocs_documentos_coleta x
                        where x.coleta_id = ct.id and x.documento_id = d.id);
    get diagnostics n = row_count;
    v_novos := v_novos + n;

    -- 5. O identificador perde o sufixo de módulo: cada pessoa está em um só.
    update gendocs_participantes p
       set identificador_externo = split_part(p.identificador_externo, '@', 1)
     where p.grupo_id = g.grupo_id and p.identificador_externo like '%@%';
  end loop;

  raise notice 'participantes movidos: %, condicionais apagados: %, linhas de documento criadas: %',
    v_movidos, v_apagados, v_novos;
end;
$$;


-- ---------------------------------------------------------------------------
-- Os três módulos condicionais saem de cena
--
-- A ordem importa (mesma pegadinha do 04): `modulos_gendocs` cascateia por
-- dois caminhos que se cruzam, e apagar os participantes primeiro desfaz o
-- lado que referencia.
-- ---------------------------------------------------------------------------
delete from gendocs_participantes
 where modulo_id in (select id from modulos_gendocs
                      where slug in ('prouni-raca-e-cor',
                                     'prouni-encerramento-matricula',
                                     'prouni-encerramento-beneficio'));

delete from modulos_gendocs
 where slug in ('prouni-raca-e-cor', 'prouni-encerramento-matricula',
                'prouni-encerramento-beneficio');


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_grupos_multi int;
  v_orfaos       int;
  v_faltando     int;
begin
  -- Ninguém pode ter participante em mais de um módulo.
  select count(*) into v_grupos_multi
    from (select grupo_id from gendocs_participantes
           group by grupo_id having count(distinct modulo_id) > 1) x;

  -- Nenhuma linha de coleta pode apontar para documento de outro módulo.
  select count(*) into v_orfaos
    from gendocs_documentos_coleta dc
    join documentos_exigidos d on d.id = dc.documento_id
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes p on p.id = ct.participante_id
   where d.modulo_id <> p.modulo_id;

  -- Nenhum documento exigido do módulo pode ficar sem linha na coleta.
  select count(*) into v_faltando
    from gendocs_participantes p
    join gendocs_coletas ct on ct.participante_id = p.id
    join documentos_exigidos d on d.modulo_id = p.modulo_id
   where (d.aplica_a = 'todos' or (d.aplica_a = 'titular' and p.titular))
     and not exists (select 1 from gendocs_documentos_coleta x
                      where x.coleta_id = ct.id and x.documento_id = d.id);

  if v_grupos_multi > 0 then
    raise exception 'Ainda há % grupo(s) com participantes em módulos diferentes', v_grupos_multi;
  end if;
  if v_orfaos > 0 then
    raise exception '% linha(s) de coleta apontando para documento de outro módulo', v_orfaos;
  end if;
  if v_faltando > 0 then
    raise exception '% documento(s) exigido(s) sem linha na coleta', v_faltando;
  end if;

  raise notice 'migração consistente: um módulo por grupo, documentos alinhados';
end;
$$;
