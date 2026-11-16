-- ============================================================================
-- 11 — Holerite e contracheque viram um documento só
--
-- Rode depois do 10.
--
-- POR QUE
-- -------
-- Holerite e contracheque são o mesmo comprovante com dois nomes: o primeiro
-- é como a iniciativa privada chama, o segundo é como o serviço público
-- chama. Manter os dois como campos separados obrigava o candidato a decidir
-- qual dos dois o contracheque dele "é" — decisão que não muda nada na
-- análise, porque o analista confere o mesmo documento nos dois casos.
--
-- O CONTRACHEQUE some da lista e o HOLERITES vira HOLERITE/CONTRACHEQUES.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trava: se o contracheque de alguém já tem arquivo, apagar o documento
-- apagaria o envio junto. Nesse caso a migração para e o arquivo é movido à
-- mão para o holerite antes de rodar de novo.
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
   where de.nome = 'Comprovante de renda - CONTRACHEQUE'
     and dc.arquivo_id is not null;

  if n > 0 then
    raise exception
      'Há % anexo(s) no campo CONTRACHEQUE. Mova-os para o holerite antes de fundir os campos.', n;
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 1. O holerite absorve o contracheque
--
-- A descrição é reescrita inteira, então o aviso de isenção que o 10
-- acrescentou precisa vir junto — senão sumiria o texto que diz que documento
-- incorreto gera indeferimento. Fica igual, palavra por palavra.
-- ---------------------------------------------------------------------------
update documentos_exigidos de
   set nome = 'Comprovante de renda - HOLERITE/CONTRACHEQUES',
       descricao =
         'Para quem trabalha com carteira assinada (CLT) ou é funcionário público — ' ||
         'holerite e contracheque valem o mesmo aqui. ' ||
         'O sistema aceita este anexo sem conferência automática — a responsabilidade pelo conteúdo é sua. ' ||
         'O documento deve representar a realidade: documento incorreto ou que não corresponda à sua situação ' ||
         'gera indeferimento desta etapa do processo.'
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni'
   and de.nome = 'Comprovante de renda - HOLERITES';

-- As outras alternativas se descreviam apontando para "os holerites".
update documentos_exigidos de
   set descricao = replace(de.descricao, 'Substitui os holerites.',
                           'Substitui o holerite/contracheque.')
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni'
   and de.descricao like '%Substitui os holerites.%';


-- ---------------------------------------------------------------------------
-- 2. O contracheque sai da lista
--
-- `gendocs_documentos_coleta.documento_id` não tem ON DELETE, então as linhas
-- das coletas abertas têm de sair primeiro, na mão. As de
-- `documentos_substituicao` caem por cascade.
-- ---------------------------------------------------------------------------
delete from gendocs_documentos_coleta dc
 using documentos_exigidos de, modulos_gendocs m
 where de.id = dc.documento_id and m.id = de.modulo_id
   and m.slug = 'prouni' and de.nome = 'Comprovante de renda - CONTRACHEQUE';

delete from documentos_exigidos de
 using modulos_gendocs m
 where m.id = de.modulo_id
   and m.slug = 'prouni' and de.nome = 'Comprovante de renda - CONTRACHEQUE';


-- ---------------------------------------------------------------------------
-- 3. Fecha o buraco na numeração
--
-- (modulo_id, sequencia) é único, e o índice é conferido linha a linha — um
-- `sequencia - 1` direto pode esbarrar numa linha ainda não movida. Sobe todo
-- mundo para uma faixa livre e desce depois.
-- ---------------------------------------------------------------------------
update documentos_exigidos de set sequencia = de.sequencia + 100
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni' and de.sequencia > 10;

update documentos_exigidos de set sequencia = de.sequencia - 101
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni' and de.sequencia > 100;


-- ---------------------------------------------------------------------------
-- 4. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_total int;
  v_seq   int[];
  v_nome  text;
begin
  select count(*), array_agg(de.sequencia order by de.sequencia)
    into v_total, v_seq
    from documentos_exigidos de join modulos_gendocs m on m.id = de.modulo_id
   where m.slug = 'prouni';

  select de.nome into v_nome
    from documentos_exigidos de join modulos_gendocs m on m.id = de.modulo_id
   where m.slug = 'prouni' and de.sequencia = 9;

  if v_total <> 14 then
    raise exception 'Esperado 14 documentos no PROUNI, encontrado %', v_total;
  end if;
  if v_seq <> array(select generate_series(1, 14)) then
    raise exception 'Numeração com buraco: %', v_seq;
  end if;
  if v_nome <> 'Comprovante de renda - HOLERITE/CONTRACHEQUES' then
    raise exception 'Documento 9 deveria ser o holerite/contracheque, é "%"', v_nome;
  end if;

  raise notice 'PROUNI: 14 documentos, numeração 1..14, nº 9 = %', v_nome;
end;
$$;
