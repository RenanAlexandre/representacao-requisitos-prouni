-- ============================================================================
-- 06 — Valores novos de enum
--
-- ⚠️ RODE ESTE ARQUIVO SOZINHO, antes do 07. Mesma razão do 03:
-- `alter type ... add value` não pode ser usado na mesma transação em que o
-- valor novo é referenciado.
-- ============================================================================

-- Os módulos deixam de ser por PERFIL DE PESSOA (titular cotista, familiar
-- maior…) e passam a ser por CATEGORIA DOCUMENTAL. O candidato entra no módulo
-- PROUNI sempre, e nos condicionais conforme o que declarou na inscrição.
alter type perfil_modulo add value if not exists 'prouni';
alter type perfil_modulo add value if not exists 'raca_cor';
alter type perfil_modulo add value if not exists 'encerramento_matricula';
alter type perfil_modulo add value if not exists 'encerramento_beneficio';

-- A análise passa a ter dois estágios: a IA lê o arquivo e diz se ele é mesmo
-- o documento alegado; o que ela aprova segue para o analista no GenDocs.
alter type status_documento add value if not exists 'aprovado_ia';
alter type status_documento add value if not exists 'reprovado_ia';
