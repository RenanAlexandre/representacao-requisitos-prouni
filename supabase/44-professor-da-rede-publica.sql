-- ============================================================================
-- 44 — "Professor da rede pública de ensino" no lugar de "normal superior"
--
-- Rode depois do 43.
--
-- O rótulo antigo descrevia o CURSO ("professor de normal superior ou
-- pedagogia"); o que a escolaridade precisa dizer é a CONDIÇÃO do candidato —
-- ser professor da rede pública. O curso já é escolhido no campo ao lado, e a
-- landing passa a oferecer só licenciaturas quando esta opção é marcada.
--
-- Troca de uma linha porque `escolaridades` tem chave própria (`codigo`) e os
-- candidatos apontam para ela por `escolaridade_codigo` — nenhuma linha de
-- candidato guarda o texto, então não há o que atualizar em cascata.
-- ============================================================================

update escolaridades
   set nome = 'Ensino Superior completo — Professor da rede pública de ensino'
 where codigo = 'superior_comp';

do $blk$
declare v_nome text;
begin
  select nome into v_nome from escolaridades where codigo = 'superior_comp';
  if v_nome is distinct from 'Ensino Superior completo — Professor da rede pública de ensino' then
    raise exception 'A escolaridade superior_comp nao foi renomeada: %', v_nome;
  end if;

  -- O código do front reconhece a opção por "Superior completo"; se um dia o
  -- rótulo perder esse trecho, a regra de curso e a marcação automática do
  -- "Sou professor da rede pública" param de funcionar em silêncio.
  if v_nome not like '%Superior completo%' then
    raise exception 'O rotulo precisa conter "Superior completo" — o front usa isso para reconhecer a opcao';
  end if;

  raise notice 'escolaridade superior_comp = %', v_nome;
end;
$blk$;
