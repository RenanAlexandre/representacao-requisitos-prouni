-- ============================================================================
-- 03 — Novo perfil de módulo: `familiar`
--
-- ⚠️ RODE ESTE ARQUIVO SOZINHO, antes do 04.
--
-- `alter type ... add value` não pode ser usado na MESMA transação em que o
-- valor novo é referenciado. Se você colar 03 e 04 juntos no SQL Editor, o 04
-- falha com "unsafe use of new value of enum type". Rode este, confirme, e só
-- então rode o 04.
--
-- Por que existe: o desenho original tinha `familiar_maior` e `familiar_menor`
-- como módulos separados. A decisão agora é um módulo só de familiares
-- (PROUNI FAMILIARES), com a distinção de idade feita dentro da lista
-- documental — ver `documentos_exigidos.aplica_a` no arquivo 04.
-- ============================================================================

alter type perfil_modulo add value if not exists 'familiar';
