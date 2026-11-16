-- ============================================================================
-- 30 — Residência só na coleta do candidato; imposto de renda vira comprovante
--
-- Rode depois do 29.
--
-- DUAS MUDANÇAS NA LISTA DOCUMENTAL
-- ---------------------------------
-- 1. COMPROVANTE DE RESIDÊNCIA sai dos módulos de familiar. O endereço é um
--    só — o do grupo — e a migração 20 já descreve os casos em que ele vem em
--    nome de outra pessoa da família. Pedir o mesmo papel de cada integrante
--    era pedir a mesma conta de luz três vezes.
--
-- 2. DECLARAÇÃO DE IMPOSTO DE RENDA deixa de ser um item obrigatório à parte e
--    vira "Comprovante de renda - Declaração de imposto de renda": OPCIONAL, e
--    aceito no lugar do holerite, como os outros comprovantes alternativos.
--    Vai para o fim da lista, logo acima da declaração de ausência de renda.
--
-- ⚠️ A PRIMEIRA APAGA ANEXOS. Havia 4 arquivos de residência em coletas de
-- familiares quando esta migração foi escrita. As linhas saem do banco e os
-- objetos precisam sair do Storage — o `raise notice` no fim imprime os
-- caminhos justamente para isso. Foi a lição da migração 23: quem sabe quais
-- arquivos existiam é o banco, e apagar só a linha deixa órfão para sempre.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Comprovante de residência sai dos módulos de familiar
--
-- `gendocs_documentos_coleta.documento_id` não tem ON DELETE, então as linhas
-- das coletas saem primeiro (mesma pegadinha das migrações 11, 16 e 24).
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_caminhos text[];
  v_linhas   int;
begin
  select coalesce(array_agg(a.storage_path), '{}') into v_caminhos
    from gendocs_arquivos a
    join gendocs_documentos_coleta dc on dc.id = a.documento_coleta_id
    join documentos_exigidos de on de.id = dc.documento_id
    join modulos_gendocs m on m.id = de.modulo_id
   where de.nome = 'Comprovante de Residência' and m.slug like '%familiares%';

  delete from gendocs_arquivos a
   using gendocs_documentos_coleta dc, documentos_exigidos de, modulos_gendocs m
   where dc.id = a.documento_coleta_id and de.id = dc.documento_id
     and m.id = de.modulo_id
     and de.nome = 'Comprovante de Residência' and m.slug like '%familiares%';

  delete from gendocs_documentos_coleta dc
   using documentos_exigidos de, modulos_gendocs m
   where de.id = dc.documento_id and m.id = de.modulo_id
     and de.nome = 'Comprovante de Residência' and m.slug like '%familiares%';
  get diagnostics v_linhas = row_count;

  delete from documentos_exigidos de
   using modulos_gendocs m
   where m.id = de.modulo_id
     and de.nome = 'Comprovante de Residência' and m.slug like '%familiares%';

  raise notice 'residência removida dos familiares: % linhas de coleta', v_linhas;
  raise notice 'APAGUE ESTES OBJETOS DO STORAGE: %', v_caminhos;
end;
$blk$;


-- ---------------------------------------------------------------------------
-- 2. O imposto de renda vira um comprovante de renda alternativo
--
-- Renomear preserva o `id`, e com ele os anexos que já existem: quem enviou a
-- declaração continua com o arquivo, agora contando como comprovante de renda.
-- ---------------------------------------------------------------------------
update documentos_exigidos
   set nome = 'Comprovante de renda - Declaração de imposto de renda',
       obrigatorio = false,
       descricao = 'Declaração completa do último exercício, com o recibo de entrega. '
                || 'Vale como comprovante de renda no lugar do holerite — envie um dos '
                || 'comprovantes da lista, não todos. Quem é isento de declarar não '
                || 'precisa deste documento.'
 where nome = 'Declaração de Imposto de Renda';

-- Passa a valer no lugar do holerite, como os outros alternativos.
insert into documentos_substituicao (documento_id, substituido_id)
select ir.id, hol.id
  from documentos_exigidos ir
  join documentos_exigidos hol
    on hol.modulo_id = ir.modulo_id
   and hol.nome = 'Comprovante de renda - HOLERITE/CONTRACHEQUES'
 where ir.nome = 'Comprovante de renda - Declaração de imposto de renda'
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 3. Ele desce para logo acima da declaração de ausência de renda
--
-- A chave de ordenação é NUMÉRICA de propósito: o imposto de renda recebe
-- "sequência da ausência de renda menos meio", que é a única forma de cair
-- ENTRE dois inteiros consecutivos. Com chave inteira ele empataria com o
-- documento anterior e o desempate o jogaria para o lugar errado.
--
-- A ordem é resolvida ANTES de qualquer update: renumerar enquanto se percorre
-- a mesma consulta que ordena por `sequencia` é pedir para o cursor ver os
-- valores novos no meio do caminho.
-- ---------------------------------------------------------------------------
do $blk$
declare
  m       record;
  v_ordem uuid[];
  i       int;
begin
  for m in select id from modulos_gendocs loop
    if not exists (select 1 from documentos_exigidos
                    where modulo_id = m.id
                      and nome = 'Comprovante de renda - Declaração de imposto de renda')
    then
      continue;
    end if;

    select array_agg(t.id order by t.chave) into v_ordem
      from (
        select d.id,
               case d.nome
                 when 'Comprovante de renda - Declaração de imposto de renda' then
                   coalesce((select a.sequencia - 0.5
                               from documentos_exigidos a
                              where a.modulo_id = m.id
                                and a.nome = 'Declaração de ausência de renda'),
                            100000)
                 else d.sequencia::numeric
               end as chave
          from documentos_exigidos d
         where d.modulo_id = m.id
      ) t;

    -- Faixa livre: o índice único (modulo_id, sequencia) é conferido linha a
    -- linha, então não dá para descer todo mundo direto.
    update documentos_exigidos set sequencia = sequencia + 1000 where modulo_id = m.id;

    for i in 1 .. array_length(v_ordem, 1) loop
      update documentos_exigidos set sequencia = i where id = v_ordem[i];
    end loop;
  end loop;
end;
$blk$;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_res_fam int;
  v_ir_obr  int;
  v_buracos int;
begin
  select count(*) into v_res_fam
    from documentos_exigidos de join modulos_gendocs m on m.id = de.modulo_id
   where de.nome = 'Comprovante de Residência' and m.slug like '%familiares%';

  select count(*) into v_ir_obr from documentos_exigidos
   where nome = 'Comprovante de renda - Declaração de imposto de renda' and obrigatorio;

  select count(*) into v_buracos from (
    select d.modulo_id from documentos_exigidos d
     group by d.modulo_id
    having min(d.sequencia) <> 1 or max(d.sequencia) <> count(*)
  ) x;

  if v_res_fam > 0 then
    raise exception 'Ainda há % comprovante(s) de residência em módulo de familiar', v_res_fam;
  end if;
  if v_ir_obr > 0 then
    raise exception 'O imposto de renda continua obrigatório em % módulo(s)', v_ir_obr;
  end if;
  if v_buracos > 0 then
    raise exception '% módulo(s) com buraco na numeração', v_buracos;
  end if;

  raise notice 'lista documental ajustada';
end;
$blk$;
