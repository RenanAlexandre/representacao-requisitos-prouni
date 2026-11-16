-- ============================================================================
-- 24 — As decisões do usuário sobre as divergências com o FAQ
--
-- Rode depois do 23.
--
-- Seis contradições entre o FAQ oficial e a estrutura do protótipo foram
-- levadas ao usuário. As decisões:
--
--   1. RG + CPF obrigatórios       -> MANTER o nosso modelo
--   2. Declaração de Imposto de Renda -> MANTER o nosso
--   3. Comprovante de Estado Civil -> REMOVER (o FAQ não exige)
--   4. Formatos além de PDF        -> MANTER o nosso
--   5. Chamada "ProUni 2027.1"     -> MANTER (é demonstração)
--   6. "Ensino Superior completo"  -> vira a exceção do professor
--
-- Só a 3 e a 6 mexem no banco. As outras ficam registradas aqui para quem ler
-- o histórico não reabrir a discussão.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 3. Comprovante de Estado Civil sai de todos os módulos
--
-- `gendocs_documentos_coleta.documento_id` não tem ON DELETE, então as linhas
-- das coletas abertas saem primeiro (mesma pegadinha das migrações 11 e 16).
-- ---------------------------------------------------------------------------
do $$
declare v_arquivos int;
begin
  select count(*) into v_arquivos
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
   where de.nome = 'Comprovante de Estado Civil' and dc.arquivo_id is not null;

  if v_arquivos > 0 then
    raise exception
      'Há % anexo(s) no comprovante de estado civil. Salve-os antes de remover o campo.',
      v_arquivos;
  end if;
end;
$$;

delete from gendocs_documentos_coleta dc
 using documentos_exigidos de
 where de.id = dc.documento_id and de.nome = 'Comprovante de Estado Civil';

delete from documentos_exigidos where nome = 'Comprovante de Estado Civil';

-- Fecha os buracos que a remoção deixou na numeração de cada módulo.
do $$
declare m record; d record; n int;
begin
  for m in select id from modulos_gendocs loop
    n := 0;
    -- Sobe todo mundo para uma faixa livre antes de renumerar: o índice único
    -- (modulo_id, sequencia) é conferido linha a linha.
    update documentos_exigidos set sequencia = sequencia + 1000 where modulo_id = m.id;
    for d in select id from documentos_exigidos
              where modulo_id = m.id order by sequencia loop
      n := n + 1;
      update documentos_exigidos set sequencia = n where id = d.id;
    end loop;
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- 1. RG + CPF continuam os dois obrigatórios
--
-- Os descritivos diziam que "o ProUni aceita um documento de identificação por
-- pessoa" — frase do FAQ que contradiz o nosso próprio formulário e faria o
-- candidato deixar o CPF em branco. As alternativas ao RG continuam citadas,
-- porque valem no lugar DELE; o CPF é pedido à parte.
-- ---------------------------------------------------------------------------
update documentos_exigidos
   set descricao = 'Frente e verso no mesmo arquivo. No lugar do RG valem também Carteira ' ||
                   'Funcional, Identidade Militar ou Passaporte emitido no Brasil — mas o CPF ' ||
                   'continua sendo pedido à parte.'
 where nome = 'RG';

update documentos_exigidos
   set descricao = 'Envie o documento completo, com foto legível. A CNH vale pelos dois: ' ||
                   'quem a enviar não precisa mandar RG nem CPF.'
 where nome = 'CNH';


-- ---------------------------------------------------------------------------
-- 6. A escolaridade de nível superior vira a exceção do professor
--
-- O ProUni exige não possuir diploma de curso superior. A única porta é o
-- professor da rede pública que concorre a licenciatura, normal superior ou
-- pedagogia — então a opção deixa de ser "Ensino Superior completo" solto, que
-- convidava a uma inscrição que seria indeferida.
--
-- A pergunta Sim/Não de professor continua na etapa de declarações: uma coisa
-- é a escolaridade, outra é a modalidade de concorrência.
-- ---------------------------------------------------------------------------
update escolaridades
   set nome = 'Ensino Superior completo — professor de normal superior ou pedagogia'
 where nome = 'Ensino Superior completo';


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_estado_civil int;
  v_buracos      int;
  v_base         int;
  v_menor        int;
begin
  select count(*) into v_estado_civil
    from documentos_exigidos where nome = 'Comprovante de Estado Civil';

  -- Numeração de cada módulo tem de ser 1..n, sem buraco. Como
  -- (modulo_id, sequencia) é único, começar em 1 e terminar em count(*) já
  -- garante a sequência inteira — não dá para ter buraco sem repetir.
  select count(*) into v_buracos from (
    select d.modulo_id
      from documentos_exigidos d
     group by d.modulo_id
    having min(d.sequencia) <> 1 or max(d.sequencia) <> count(*)
  ) x;

  select count(*) into v_base from documentos_exigidos d
    join modulos_gendocs m on m.id = d.modulo_id where m.slug = 'prouni';
  select count(*) into v_menor from documentos_exigidos d
    join modulos_gendocs m on m.id = d.modulo_id
   where m.slug = 'prouni-familiares-menoridade';

  if v_estado_civil > 0 then
    raise exception 'Ainda restam % comprovantes de estado civil', v_estado_civil;
  end if;
  if v_buracos > 0 then
    raise exception '% módulo(s) com buraco na numeração', v_buracos;
  end if;
  if v_base <> 16 then raise exception 'PROUNI base deveria ter 16 documentos, tem %', v_base; end if;
  if v_menor <> 3  then raise exception 'Familiar menor deveria ter 3, tem %', v_menor; end if;

  raise notice 'estado civil removido; numeração 1..n em todos os módulos';
end;
$$;
