-- ============================================================================
-- 35 — A cidade dos megapolos
--
-- Rode depois do 34.
--
-- Na 34 a cidade foi derivada do rótulo do MEC tirando o parêntese —
-- "BARRETOS (CENTRO)" vira "BARRETOS". A regra estava certa para os polos e
-- errada para os megapolos: "MEGA POLO MARINGÁ (CENTRO)" virou a cidade
-- "MEGA POLO MARINGÁ". O prefixo é o TIPO da unidade, que já está na coluna
-- `tipo`, não parte do nome da cidade.
--
-- A 34 não é repetível (ela renomeia um rótulo de enum, que na segunda vez já
-- não existe), então o conserto vem em arquivo próprio em vez de uma correção
-- no arquivo anterior.
-- ============================================================================

update polos
   set cidade = nullif(btrim(regexp_replace(cidade, '^MEGA\s+POLO\s+', '', 'i')), '')
 where cidade ~* '^MEGA\s+POLO\s+';


do $blk$
declare v_sujas int; v_exemplo text;
begin
  select count(*) into v_sujas from polos where cidade ~* '^(MEGA\s+POLO|UNIDADE\s+SEDE)\b';
  if v_sujas > 0 then
    raise exception '% polo(s) ainda com o tipo colado na cidade', v_sujas;
  end if;

  select cidade || ' / ' || uf into v_exemplo
    from polos where codigo_sispro = '1156465';
  raise notice 'MEGA POLO MARINGÁ (CENTRO) -> cidade %', v_exemplo;
end;
$blk$;
