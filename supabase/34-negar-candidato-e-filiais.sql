-- ============================================================================
-- 34 — "Negar candidato", filial de práticas e os 938 locais de oferta
--
-- Rode depois do 33.
--
-- TRÊS COISAS
-- -----------
-- 1. VOCABULÁRIO. "Dispensar" vira "Negar". O rótulo do enum, as colunas e as
--    funções acompanham — deixar o botão dizendo uma coisa e o banco outra é
--    como se perde o rastro de uma decisão meses depois.
--
-- 2. FILIAL DE PRÁTICAS. O candidato passa a ter duas filiais: a de captação
--    (`polo_id`, que já existia) e a de práticas (`polo_praticas_id`, nova).
--    São campos distintos no ERP e podem ser polos diferentes.
--
-- 3. OS LOCAIS DE OFERTA DE VERDADE. Até aqui `polos` tinha duas linhas — as
--    duas sedes de Paranavaí que apareciam nos relatórios. Entram os
--    938 locais de oferta do cadastro do ProUni/MEC (documento
--    "POLOS RENAN.pdf", Lista Local de Oferta da IES 4751 — CENTRO
--    UNIVERSITÁRIO UNIFATECIE, extraída em 02/09/2026).
--
-- ⚠️ NOTA PARA O DESENVOLVIMENTO — a lista é o ponto, não a tela.
-- Hoje o candidato do ProUni chega SEM filial: a landing do ProUni não pergunta
-- polo (quem escolhe o local de oferta é o Sisprouni, e o dado não vem para
-- nós). Sem filial não há matrícula. Por isso o campo passa a ser preenchível
-- pelo analista no ERP, e por isso ele precisa de uma CONSULTA PRÓPRIA de
-- locais de oferta: os outros processos (pós, graduação regular) já trazem o
-- polo escolhido pelo aluno na landing deles, e não podem ser afetados. Vindo
-- preenchido, o analista só confere — e ainda assim pode trocar.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Dispensado vira Negado
--
-- `alter type ... rename value` é transacional (ao contrário de `add value`,
-- que exigiu arquivo próprio na migração 27), então cabe aqui junto do resto.
-- ---------------------------------------------------------------------------
alter type status_candidato rename value 'Dispensado' to 'Negado';

alter table inscricoes rename column dispensado_em   to negado_em;
alter table inscricoes rename column dispensado_por  to negado_por;
alter table inscricoes rename column dispensa_motivo to negacao_motivo;

drop function if exists erp_dispensar(uuid, text, text);


-- ---------------------------------------------------------------------------
-- 2. A filial de práticas
-- ---------------------------------------------------------------------------
alter table candidatos add column if not exists polo_praticas_id uuid references polos(id);

comment on column candidatos.polo_id is
  'Filial de CAPTAÇÃO. No ProUni chega nula — a landing não pergunta polo; quem preenche é o analista no ERP.';
comment on column candidatos.polo_praticas_id is
  'Filial de PRÁTICAS. Pode ser diferente da de captação.';

create index if not exists candidatos_polo_praticas_idx on candidatos (polo_praticas_id);


-- ---------------------------------------------------------------------------
-- 3. Os locais de oferta
--
-- `on conflict` preserva o que já estava preenchido à mão: as duas sedes de
-- Paranavaí têm cidade e UF corretas, e o PDF não traz nem uma nem outra para
-- elas. `coalesce(excluded, polos)` deixa o novo entrar só onde havia vazio.
--
-- `cidade` sai do nome sem o parêntese — "BARRETOS (CENTRO)" é o bairro dentro
-- de Barretos, não outra cidade. `uf` vem do sufixo do rótulo do MEC.
-- ---------------------------------------------------------------------------
insert into polos (codigo_sispro, nome, cidade, uf, tipo) values
  ('1168278', 'ABAETETUBA', 'ABAETETUBA', 'PA', 'Polo'),
  ('1164910', 'ABREU E LIMA', 'ABREU E LIMA', 'PE', 'Polo'),
  ('1175617', 'AÇAILÂNDIA', 'AÇAILÂNDIA', 'MA', 'Polo'),
  ('1159964', 'ACARÁ', 'ACARÁ', 'PA', 'Polo'),
  ('1156627', 'ACRELÂNDIA', 'ACRELÂNDIA', 'AC', 'Polo'),
  ('1175592', 'ÁGUAS LINDAS DE GOIÁS', 'ÁGUAS LINDAS DE GOIÁS', 'GO', 'Polo'),
  ('1130704', 'AGUDOS', 'AGUDOS', 'SP', 'Polo'),
  ('1168279', 'ALAGOA GRANDE', 'ALAGOA GRANDE', 'PB', 'Polo'),
  ('1168280', 'ALAGOA NOVA', 'ALAGOA NOVA', 'PB', 'Polo'),
  ('1127323', 'ALAGOINHAS', 'ALAGOINHAS', 'BA', 'Polo'),
  ('1164911', 'ALCÂNTARAS', 'ALCÂNTARAS', 'CE', 'Polo'),
  ('1153904', 'ALEGRETE', 'ALEGRETE', 'RS', 'Polo'),
  ('1175626', 'ALFENAS', 'ALFENAS', 'MG', 'Polo'),
  ('1142348', 'ALMIRANTE TAMANDARÉ', 'ALMIRANTE TAMANDARÉ', 'PR', 'Polo'),
  ('1168281', 'ALPERCATA', 'ALPERCATA', 'MG', 'Polo'),
  ('1154296', 'ALTA FLORESTA', 'ALTA FLORESTA', 'MT', 'Polo'),
  ('1169585', 'ALTINÓPOLIS', 'ALTINÓPOLIS', 'SP', 'Polo'),
  ('1168282', 'ALTO ARAGUAIA', 'ALTO ARAGUAIA', 'MT', 'Polo'),
  ('1168283', 'ALTO DO RODRIGUES', 'ALTO DO RODRIGUES', 'RN', 'Polo'),
  ('1168285', 'ALTO GARÇAS', 'ALTO GARÇAS', 'MT', 'Polo'),
  ('1175764', 'ALTÔNIA', 'ALTÔNIA', 'PR', 'Polo'),
  ('1168287', 'ALVINÓPOLIS', 'ALVINÓPOLIS', 'MG', 'Polo'),
  ('1143137', 'ALVORADA', 'ALVORADA', 'RS', 'Polo'),
  ('1127240', 'AMAPORÃ', 'AMAPORÃ', 'PR', 'Polo'),
  ('1175728', 'ANANINDEUA', 'ANANINDEUA', 'PA', 'Polo'),
  ('1127242', 'ANÁPOLIS', 'ANÁPOLIS', 'GO', 'Polo'),
  ('1142001', 'ANAPU', 'ANAPU', 'PA', 'Polo'),
  ('1168288', 'ANAPURUS', 'ANAPURUS', 'MA', 'Polo'),
  ('1185627', 'ANASTÁCIO', 'ANASTÁCIO', 'MS', 'Polo'),
  ('1159200', 'ANGRA DOS REIS', 'ANGRA DOS REIS', 'RJ', 'Polo'),
  ('1175964', 'APARECIDA', 'APARECIDA', 'SP', 'Polo'),
  ('1157111', 'APARECIDA DE GOIÂNIA', 'APARECIDA DE GOIÂNIA', 'GO', 'Polo'),
  ('1175765', 'APUCARANA', 'APUCARANA', 'PR', 'Polo'),
  ('1120535', 'Aquidabã', 'Aquidabã', 'SE', 'Polo'),
  ('1127325', 'AQUIRAZ', 'AQUIRAZ', 'CE', 'Polo'),
  ('1175955', 'ARACAJÚ (LUZIA)', 'ARACAJÚ', 'SE', 'Polo'),
  ('1175541', 'ARACATI', 'ARACATI', 'CE', 'Polo'),
  ('1160040', 'ARACRUZ', 'ARACRUZ', 'ES', 'Polo'),
  ('1160665', 'ARAGOIÂNIA', 'ARAGOIÂNIA', 'GO', 'Polo'),
  ('1175958', 'ARAGUAÍNA', 'ARAGUAÍNA', 'TO', 'Polo'),
  ('1160041', 'ARAPIRACA (ALTO CRUZEIRO)', 'ARAPIRACA', 'AL', 'Polo'),
  ('1175490', 'ARAPIRACA (CENTRO)', 'ARAPIRACA', 'AL', 'Polo'),
  ('1142063', 'ARARA', 'ARARA', 'PB', 'Polo'),
  ('1175965', 'ARARAQUARA', 'ARARAQUARA', 'SP', 'Polo'),
  ('1175966', 'ARARAS', 'ARARAS', 'SP', 'Polo'),
  ('1168289', 'ARARIPINA', 'ARARIPINA', 'PE', 'Polo'),
  ('1175844', 'ARARUAMA', 'ARARUAMA', 'RJ', 'Polo'),
  ('1142065', 'ARAUCÁRIA', 'ARAUCÁRIA', 'PR', 'Polo'),
  ('1175627', 'ARAXÁ', 'ARAXÁ', 'MG', 'Polo'),
  ('1165066', 'AREIA', 'AREIA', 'PB', 'Polo'),
  ('1168290', 'ARIQUEMES', 'ARIQUEMES', 'RO', 'Polo'),
  ('1159202', 'ARROIO DO SAL', 'ARROIO DO SAL', 'RS', 'Polo'),
  ('1175967', 'ARUJÁ', 'ARUJÁ', 'SP', 'Polo'),
  ('1184099', 'ASSIS', 'ASSIS', 'SP', 'Polo'),
  ('1179560', 'ASSIS BRASIL', 'ASSIS BRASIL', 'AC', 'Polo'),
  ('1159324', 'ASSIS CHATEAUBRIAND', 'ASSIS CHATEAUBRIAND', 'PR', 'Polo'),
  ('1127248', 'ASTOLFO DUTRA', 'ASTOLFO DUTRA', 'MG', 'Polo'),
  ('1175772', 'ASTORGA (CENTRO)', 'ASTORGA', 'PR', 'Polo'),
  ('1175973', 'ATIBAIA', 'ATIBAIA', 'SP', 'Polo'),
  ('1175974', 'AVARÉ', 'AVARÉ', 'SP', 'Polo'),
  ('1168292', 'BACABAL', 'BACABAL', 'MA', 'Polo'),
  ('1154298', 'BAEPENDI', 'BAEPENDI', 'MG', 'Polo'),
  ('1153977', 'BAGÉ', 'BAGÉ', 'RS', 'Polo'),
  ('1168293', 'BALDIM', 'BALDIM', 'MG', 'Polo'),
  ('1130656', 'BALNEÁRIO CAMBORIÚ', 'BALNEÁRIO CAMBORIÚ', 'SC', 'Polo'),
  ('1175619', 'BALSAS', 'BALSAS', 'MA', 'Polo'),
  ('1169588', 'BANABUIÚ', 'BANABUIÚ', 'CE', 'Polo'),
  ('1160042', 'BANDEIRANTES', 'BANDEIRANTES', 'PR', 'Polo'),
  ('1175548', 'BARBALHA', 'BARBALHA', 'CE', 'Polo'),
  ('1168297', 'BARCARENA', 'BARCARENA', 'PA', 'Polo'),
  ('1168298', 'BARRA BONITA', 'BARRA BONITA', 'SP', 'Polo'),
  ('1160044', 'BARRA DO CORDA (CENTRO)', 'BARRA DO CORDA', 'MA', 'Polo'),
  ('1175845', 'BARRA DO PIRAÍ', 'BARRA DO PIRAÍ', 'RJ', 'Polo'),
  ('1175846', 'BARRA MANSA', 'BARRA MANSA', 'RJ', 'Polo'),
  ('1165068', 'BARRAS', 'BARRAS', 'PI', 'Polo'),
  ('1168299', 'BARREIRINHA', 'BARREIRINHA', 'AM', 'Polo'),
  ('1175975', 'BARRETOS (CENTRO)', 'BARRETOS', 'SP', 'Polo'),
  ('1175976', 'BARUERI', 'BARUERI', 'SP', 'Polo'),
  ('1175702', 'BATAGUASSU (SÃO JOÃO)', 'BATAGUASSU', 'MS', 'Polo'),
  ('1175978', 'BATATAIS', 'BATATAIS', 'SP', 'Polo'),
  ('1175740', 'BAYEUX (COMERCIAL NORTE)', 'BAYEUX', 'PB', 'Polo'),
  ('1147614', 'BEBEDOURO', 'BEBEDOURO', 'SP', 'Polo'),
  ('1175549', 'BEBERIBE', 'BEBERIBE', 'CE', 'Polo'),
  ('1164912', 'BELA CRUZ', 'BELA CRUZ', 'CE', 'Polo'),
  ('1175729', 'BELÉM (CASTANHEIRA)', 'BELÉM', 'PA', 'Polo'),
  ('1164915', 'BELÉM (ICOARACI)', 'BELÉM', 'PA', 'Polo'),
  ('1157113', 'BELFORD ROXO', 'BELFORD ROXO', 'RJ', 'Polo'),
  ('1120563', 'BELO HORIZONTE (SÃO JOÃO BATISTA)', 'BELO HORIZONTE', 'MG', 'Polo'),
  ('1169628', 'BELO JARDIM', 'BELO JARDIM', 'PE', 'Polo'),
  ('1176103', 'BENEVIDES', 'BENEVIDES', 'PA', 'Polo'),
  ('1175915', 'BENTO GONÇALVES', 'BENTO GONÇALVES', 'RS', 'Polo'),
  ('1165075', 'BETIM (GUANABARA)', 'BETIM', 'MG', 'Polo'),
  ('1168242', 'BETIM', 'BETIM', 'MG', 'Polo'),
  ('1168303', 'BEZERROS', 'BEZERROS', 'PE', 'Polo'),
  ('1168304', 'BIGUAÇU', 'BIGUAÇU', 'SC', 'Polo'),
  ('1159020', 'BIRIGUI', 'BIRIGUI', 'SP', 'Polo'),
  ('1175936', 'BLUMENAU', 'BLUMENAU', 'SC', 'Polo'),
  ('1168305', 'BOA VENTURA DE SÃO ROQUE', 'BOA VENTURA DE SÃO ROQUE', 'PR', 'Polo'),
  ('1132462', 'BOA VISTA DO BURICÁ', 'BOA VISTA DO BURICÁ', 'RS', 'Polo'),
  ('1142527', 'BOCA DO ACRE', 'BOCA DO ACRE', 'AM', 'Polo'),
  ('1159325', 'BOITUVA', 'BOITUVA', 'SP', 'Polo'),
  ('1127255', 'BOM CONSELHO', 'BOM CONSELHO', 'PE', 'Polo'),
  ('1168307', 'BOM JESUS DO GALHO', 'BOM JESUS DO GALHO', 'MG', 'Polo'),
  ('1168308', 'BOM JESUS DO ITABAPOANA', 'BOM JESUS DO ITABAPOANA', 'RJ', 'Polo'),
  ('1159203', 'BORBA', 'BORBA', 'AM', 'Polo'),
  ('1175730', 'BRAGANÇA', 'BRAGANÇA', 'PA', 'Polo'),
  ('1175988', 'BRAGANÇA PAULISTA', 'BRAGANÇA PAULISTA', 'SP', 'Polo'),
  ('1168309', 'BRASILÉIA', 'BRASILÉIA', 'AC', 'Polo'),
  ('1175571', 'BRASÍLIA (ÁGUAS CLARAS)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1164916', 'BRASÍLIA (CEILÂNDIA NORTE)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1175573', 'BRASÍLIA (CEILÂNDIA)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1142232', 'BRASÍLIA (GAMA)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1154302', 'BRASÍLIA (GUARA)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1142892', 'BRASÍLIA (SAMAMBAIA)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1157119', 'BRASÍLIA (SANTA MARIA)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1154304', 'BRASÍLIA (SOL NASCENTE)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1142528', 'BRASÍLIA (TAGUATINGA)', 'BRASÍLIA', 'DF', 'Polo'),
  ('1142006', 'BREJO GRANDE', 'BREJO GRANDE', 'SE', 'Polo'),
  ('1168310', 'BREU BRANCO', 'BREU BRANCO', 'PA', 'Polo'),
  ('1169590', 'BREVES', 'BREVES', 'PA', 'Polo'),
  ('1175499', 'BRUMADO', 'BRUMADO', 'BA', 'Polo'),
  ('1175937', 'BRUSQUE', 'BRUSQUE', 'SC', 'Polo'),
  ('1168311', 'BUÍQUE', 'BUÍQUE', 'PE', 'Polo'),
  ('1127261', 'BURITICUPU', 'BURITICUPU', 'MA', 'Polo'),
  ('1142202', 'CABEDELO', 'CABEDELO', 'PB', 'Polo'),
  ('1160677', 'CABO DE SANTO AGOSTINHO', 'CABO DE SANTO AGOSTINHO', 'PE', 'Polo'),
  ('1160678', 'CABROBÓ', 'CABROBÓ', 'PE', 'Polo'),
  ('1178993', 'CAÇADOR', 'CAÇADOR', 'SC', 'Polo'),
  ('1175989', 'CAÇAPAVA (JARDIM PRIMAVERA)', 'CAÇAPAVA', 'SP', 'Polo'),
  ('1154305', 'CAÇAPAVA DO SUL', 'CAÇAPAVA DO SUL', 'RS', 'Polo'),
  ('1175990', 'CACHOEIRA PAULISTA', 'CACHOEIRA PAULISTA', 'SP', 'Polo'),
  ('1143141', 'CACHOEIRINHA', 'CACHOEIRINHA', 'RS', 'Polo'),
  ('1143143', 'CACHOEIRO DE ITAPEMIRIM', 'CACHOEIRO DE ITAPEMIRIM', 'ES', 'Polo'),
  ('1168314', 'CACOAL', 'CACOAL', 'RO', 'Polo'),
  ('1142007', 'CAFELÂNDIA', 'CAFELÂNDIA', 'PR', 'Polo'),
  ('1175893', 'CAICÓ (BOA PASSAGEM)', 'CAICÓ', 'RN', 'Polo'),
  ('1175991', 'CAJURU', 'CAJURU', 'SP', 'Polo'),
  ('1164918', 'CALDAS NOVAS', 'CALDAS NOVAS', 'GO', 'Polo'),
  ('1142529', 'CAMAÇARI', 'CAMAÇARI', 'BA', 'Polo'),
  ('1154306', 'CAMAQUÃ', 'CAMAQUÃ', 'RS', 'Polo'),
  ('1128506', 'CAMARAGIBE', 'CAMARAGIBE', 'PE', 'Polo'),
  ('1132463', 'CAMBÉ', 'CAMBÉ', 'PR', 'Polo'),
  ('1128507', 'CAMOCIM', 'CAMOCIM', 'CE', 'Polo'),
  ('1142009', 'CAMOCIM DE SÃO FÉLIX', 'CAMOCIM DE SÃO FÉLIX', 'PE', 'Polo'),
  ('1164935', 'CAMPINA GRANDE (CRUZEIRO)', 'CAMPINA GRANDE', 'PB', 'Polo'),
  ('1175773', 'CAMPINA GRANDE DO SUL', 'CAMPINA GRANDE DO SUL', 'PR', 'Polo'),
  ('1175992', 'CAMPINAS (CIDADE UNIVERSITÁRIA)', 'CAMPINAS', 'SP', 'Polo'),
  ('1128612', 'Campinas-(Bonfim)', null, null, 'Polo'),
  ('1175629', 'CAMPO BELO (CENTRO)', 'CAMPO BELO', 'MG', 'Polo'),
  ('1175848', 'CAMPO DOS GOYTACAZES', 'CAMPO DOS GOYTACAZES', 'RJ', 'Polo'),
  ('1143145', 'CAMPO LARGO', 'CAMPO LARGO', 'PR', 'Polo'),
  ('1168356', 'CAMPOS ALTOS', 'CAMPOS ALTOS', 'MG', 'Polo'),
  ('659920', 'CAMPUS GETÚLIO', null, null, 'Sede'),
  ('1061130', 'CAMPUS SANEPAR', null, null, 'Sede'),
  ('1175731', 'CANAÃ DOS CARAJÁS', 'CANAÃ DOS CARAJÁS', 'PA', 'Polo'),
  ('1159205', 'CANDEIAS', 'CANDEIAS', 'BA', 'Polo'),
  ('1169591', 'CANGUÇU', 'CANGUÇU', 'RS', 'Polo'),
  ('1169589', 'CANINDÉ', 'CANINDÉ', 'CE', 'Polo'),
  ('1175916', 'CANOAS', 'CANOAS', 'RS', 'Polo'),
  ('1160046', 'CAPANEMA', 'CAPANEMA', 'PA', 'Polo'),
  ('1142351', 'CAPANEMA', 'CAPANEMA', 'PR', 'Polo'),
  ('1159326', 'CAPÃO DA CANOA', 'CAPÃO DA CANOA', 'RS', 'Polo'),
  ('1168359', 'CAPIM GROSSO', 'CAPIM GROSSO', 'BA', 'Polo'),
  ('1142353', 'CAPITÃO LEÔNIDAS MARQUES', 'CAPITÃO LEÔNIDAS MARQUES', 'PR', 'Polo'),
  ('1128509', 'Capivari', 'Capivari', 'SP', 'Polo'),
  ('1130658', 'CARACOL', 'CARACOL', 'MS', 'Polo'),
  ('1128510', 'Caraguatatuba', 'Caraguatatuba', 'SP', 'Polo'),
  ('1142356', 'CARANGOLA', 'CARANGOLA', 'MG', 'Polo'),
  ('1143146', 'CARAPICUÍBA', 'CARAPICUÍBA', 'SP', 'Polo'),
  ('1168360', 'CARATINGA', 'CARATINGA', 'MG', 'Polo'),
  ('1159327', 'CARAZINHO', 'CARAZINHO', 'RS', 'Polo'),
  ('1164938', 'CARIACICA', 'CARIACICA', 'ES', 'Polo'),
  ('1142010', 'CARMÉSIA', 'CARMÉSIA', 'MG', 'Polo'),
  ('1175630', 'CARMO DO RIO CLARO', 'CARMO DO RIO CLARO', 'MG', 'Polo'),
  ('1164939', 'CARPINA', 'CARPINA', 'PE', 'Polo'),
  ('1175747', 'CARUARU', 'CARUARU', 'PE', 'Polo'),
  ('1128511', 'CASCAVEL', 'CASCAVEL', 'CE', 'Polo'),
  ('1120573', 'CASSILÂNDIA', 'CASSILÂNDIA', 'MS', 'Polo'),
  ('1175732', 'CASTANHAL', 'CASTANHAL', 'PA', 'Polo'),
  ('1168363', 'CASTRO', 'CASTRO', 'PR', 'Polo'),
  ('1164941', 'CASTRO ALVES', 'CASTRO ALVES', 'BA', 'Polo'),
  ('1128669', 'Cataguases', 'Cataguases', 'MG', 'Polo'),
  ('1159328', 'CATALÃO', 'CATALÃO', 'GO', 'Polo'),
  ('1175994', 'CATIGUÁ', 'CATIGUÁ', 'SP', 'Polo'),
  ('1159207', 'CATOLÉ DA ROCHA', 'CATOLÉ DA ROCHA', 'PB', 'Polo'),
  ('1130659', 'CATU', 'CATU', 'BA', 'Polo'),
  ('1165143', 'CAUCAIA (ARATURI)', 'CAUCAIA', 'CE', 'Polo'),
  ('1159208', 'CAUCAIA', 'CAUCAIA', 'CE', 'Polo'),
  ('1154308', 'CAXAMBU', 'CAXAMBU', 'MG', 'Polo'),
  ('1168244', 'CAXIAS', 'CAXIAS', 'MA', 'Polo'),
  ('1128514', 'CEARÁ-MIRIM', 'CEARÁ-MIRIM', 'RN', 'Polo'),
  ('1132464', 'CERES', 'CERES', 'GO', 'Polo'),
  ('1175631', 'CHAPADA DO NORTE', 'CHAPADA DO NORTE', 'MG', 'Polo'),
  ('1175938', 'CHAPECÓ (MARIA GORETTI)', 'CHAPECÓ', 'SC', 'Polo'),
  ('1128515', 'Chapecó', 'Chapecó', 'SC', 'Polo'),
  ('1132466', 'CHAVES', 'CHAVES', 'PA', 'Polo'),
  ('1175774', 'CIANORTE (CENTRO)', 'CIANORTE', 'PR', 'Polo'),
  ('1168364', 'CIDADE GAÚCHA', 'CIDADE GAÚCHA', 'PR', 'Polo'),
  ('1154309', 'CIDADE OCIDENTAL', 'CIDADE OCIDENTAL', 'GO', 'Polo'),
  ('1142013', 'CLEMENTINA', 'CLEMENTINA', 'SP', 'Polo'),
  ('1168367', 'COARACI', 'COARACI', 'BA', 'Polo'),
  ('1142358', 'COARI', 'COARI', 'AM', 'Polo'),
  ('1142581', 'COELHO NETO', 'COELHO NETO', 'MA', 'Polo'),
  ('1175581', 'COLATINA', 'COLATINA', 'ES', 'Polo'),
  ('1130705', 'COLÍDER', 'COLÍDER', 'MT', 'Polo'),
  ('1175775', 'COLOMBO', 'COLOMBO', 'PR', 'Polo'),
  ('1130661', 'COLORADO', 'COLORADO', 'PR', 'Polo'),
  ('1168372', 'COLORADO DO OESTE', 'COLORADO DO OESTE', 'RO', 'Polo'),
  ('1168374', 'CONCEIÇÃO DO ARAGUAIA', 'CONCEIÇÃO DO ARAGUAIA', 'PA', 'Polo'),
  ('1159210', 'CONCÓRDIA', 'CONCÓRDIA', 'SC', 'Polo'),
  ('1160050', 'CONCÓRDIA DO PARÁ', 'CONCÓRDIA DO PARÁ', 'PA', 'Polo'),
  ('1128519', 'CONFRESA', 'CONFRESA', 'MT', 'Polo'),
  ('1159211', 'CONGONHAS', 'CONGONHAS', 'MG', 'Polo'),
  ('1153989', 'CONSELHEIRO LAFAIETE', 'CONSELHEIRO LAFAIETE', 'MG', 'Polo'),
  ('1175632', 'CONTAGEM', 'CONTAGEM', 'MG', 'Polo'),
  ('1168375', 'CORAÇÃO DE MARIA', 'CORAÇÃO DE MARIA', 'BA', 'Polo'),
  ('1142360', 'CORBÉLIA', 'CORBÉLIA', 'PR', 'Polo'),
  ('1175849', 'CORDEIRO', 'CORDEIRO', 'RJ', 'Polo'),
  ('1168387', 'CORDEIRÓPOLIS', 'CORDEIRÓPOLIS', 'SP', 'Polo'),
  ('1142599', 'CORNÉLIO PROCÓPIO', 'CORNÉLIO PROCÓPIO', 'PR', 'Polo'),
  ('1175633', 'CORONEL FABRICIANO', 'CORONEL FABRICIANO', 'MG', 'Polo'),
  ('1142361', 'CORUMBÁ', 'CORUMBÁ', 'MS', 'Polo'),
  ('1168388', 'COSMÓPOLIS', 'COSMÓPOLIS', 'SP', 'Polo'),
  ('1160055', 'COTIA', 'COTIA', 'SP', 'Polo'),
  ('1142364', 'COXIM', 'COXIM', 'MS', 'Polo'),
  ('1142214', 'CRATO', 'CRATO', 'CE', 'Polo'),
  ('1175940', 'CRICIÚMA', 'CRICIÚMA', 'SC', 'Polo'),
  ('1142017', 'CROATÁ', 'CROATÁ', 'CE', 'Polo'),
  ('1142073', 'CRUZ (DISTRITO PREA)', 'CRUZ', 'CE', 'Polo'),
  ('1147626', 'CRUZ ALTA', 'CRUZ ALTA', 'RS', 'Polo'),
  ('1142222', 'CRUZ DAS ALMAS', 'CRUZ DAS ALMAS', 'BA', 'Polo'),
  ('1175995', 'CRUZEIRO', 'CRUZEIRO', 'SP', 'Polo'),
  ('1175483', 'CRUZEIRO DO SUL', 'CRUZEIRO DO SUL', 'AC', 'Polo'),
  ('1157114', 'CUBATÃO', 'CUBATÃO', 'SP', 'Polo'),
  ('1164943', 'CURITIBA (BOQUEIRÃO)', 'CURITIBA', 'PR', 'Polo'),
  ('1159329', 'CURITIBA (MOSSUNGUÊ)', 'CURITIBA', 'PR', 'Polo'),
  ('1142074', 'CURITIBA (SÍTIO CERCADO)', 'CURITIBA', 'PR', 'Polo'),
  ('1168389', 'CURITIBANOS', 'CURITIBANOS', 'SC', 'Polo'),
  ('1160685', 'CUSTÓDIA', 'CUSTÓDIA', 'PE', 'Polo'),
  ('1168390', 'DELMIRO GOUVEIA', 'DELMIRO GOUVEIA', 'AL', 'Polo'),
  ('1168395', 'DELTA', 'DELTA', 'MG', 'Polo'),
  ('1156151', 'DIADEMA', 'DIADEMA', 'SP', 'Polo'),
  ('1175521', 'DIAS D ÁVILA (LESSA RIBEIRO)', 'DIAS D ÁVILA', 'BA', 'Polo'),
  ('1168261', 'DIVINO', 'DIVINO', 'MG', 'Polo'),
  ('1175634', 'DIVINÓPOLIS', 'DIVINÓPOLIS', 'MG', 'Polo'),
  ('1130708', 'DOIS CÓRREGOS', 'DOIS CÓRREGOS', 'SP', 'Polo'),
  ('1178995', 'DOIS VIZINHOS (CENTRO)', 'DOIS VIZINHOS', 'PR', 'Polo'),
  ('1142373', 'DOIS VIZINHOS (CENTRO)', 'DOIS VIZINHOS', 'PR', 'Polo'),
  ('1168397', 'DOMINGOS MARTINS', 'DOMINGOS MARTINS', 'ES', 'Polo'),
  ('1154220', 'DOURADOS (JARDIM CENTRAL)', 'DOURADOS', 'MS', 'Polo'),
  ('1184094', 'DOURADOS', 'DOURADOS', 'MS', 'Polo'),
  ('1143149', 'DRACENA', 'DRACENA', 'SP', 'Polo'),
  ('1142376', 'DUQUE DE CAXIAS', 'DUQUE DE CAXIAS', 'RJ', 'Polo'),
  ('1142018', 'ECHAPORÃ', 'ECHAPORÃ', 'SP', 'Polo'),
  ('1143151', 'EMBU DAS ARTES', 'EMBU DAS ARTES', 'SP', 'Polo'),
  ('1147634', 'EMBU-GUAÇU', 'EMBU-GUAÇU', 'SP', 'Polo'),
  ('1130663', 'EPITACIOLÂNDIA', 'EPITACIOLÂNDIA', 'AC', 'Polo'),
  ('1175917', 'ERECHIM (CENTRO)', 'ERECHIM', 'RS', 'Polo'),
  ('1128613', 'Erechim', 'Erechim', 'RS', 'Polo'),
  ('1142607', 'ERVÁLIA', 'ERVÁLIA', 'MG', 'Polo'),
  ('1128527', 'ESMERALDAS', 'ESMERALDAS', 'MG', 'Polo'),
  ('1142095', 'ESPERA FELIZ', 'ESPERA FELIZ', 'MG', 'Polo'),
  ('1168398', 'ESPERANÇA', 'ESPERANÇA', 'PB', 'Polo'),
  ('1132467', 'ESPÍRITO SANTO DO DOURADO', 'ESPÍRITO SANTO DO DOURADO', 'MG', 'Polo'),
  ('1142019', 'ESTEIO', 'ESTEIO', 'RS', 'Polo'),
  ('1168399', 'ESTREITO', 'ESTREITO', 'MA', 'Polo'),
  ('1142020', 'EUCLIDES DA CUNHA PAULISTA', 'EUCLIDES DA CUNHA PAULISTA', 'SP', 'Polo'),
  ('1142377', 'EUNÁPOLIS', 'EUNÁPOLIS', 'BA', 'Polo'),
  ('1130709', 'EUSÉBIO', 'EUSÉBIO', 'CE', 'Polo'),
  ('1168400', 'FARIA LEMOS', 'FARIA LEMOS', 'MG', 'Polo'),
  ('1159212', 'FARROUPILHA', 'FARROUPILHA', 'RS', 'Polo'),
  ('1120577', 'FAZENDA RIO GRANDE', 'FAZENDA RIO GRANDE', 'PR', 'Polo'),
  ('1175486', 'FEIJÓ (SEGUNDO DISTRITO)', 'FEIJÓ', 'AC', 'Polo'),
  ('1154348', 'FEIRA GRANDE', 'FEIRA GRANDE', 'AL', 'Polo'),
  ('1175996', 'FERNANDÓPOLIS', 'FERNANDÓPOLIS', 'SP', 'Polo'),
  ('1160056', 'FERRAZ DE VASCONCELOS', 'FERRAZ DE VASCONCELOS', 'SP', 'Polo'),
  ('1168401', 'FLORESTA AZUL', 'FLORESTA AZUL', 'BA', 'Polo'),
  ('1169592', 'FLORESTÓPOLIS', 'FLORESTÓPOLIS', 'PR', 'Polo'),
  ('1160053', 'FLORIANÓPOLIS (INGLESES)', 'FLORIANÓPOLIS', 'SC', 'Polo'),
  ('1142230', 'FORMOSA DO RIO PRETO', 'FORMOSA DO RIO PRETO', 'BA', 'Polo'),
  ('1164944', 'FORTALEZA (ALDEOTA II)', 'FORTALEZA', 'CE', 'Polo'),
  ('1142378', 'FORTALEZA (ALDEOTA)', 'FORTALEZA', 'CE', 'Polo'),
  ('1126862', 'FORTALEZA (CIDADE FUNCIONÁRIOS)', 'FORTALEZA', 'CE', 'Polo'),
  ('1159330', 'FORTALEZA (MARAPONGA)', 'FORTALEZA', 'CE', 'Polo'),
  ('1126865', 'FORTALEZA (PARQUELÂNDIA)', 'FORTALEZA', 'CE', 'Polo'),
  ('1175776', 'FOZ DO IGUAÇU', 'FOZ DO IGUAÇU', 'PR', 'Polo'),
  ('1132470', 'FRANCA', 'FRANCA', 'SP', 'Polo'),
  ('1175791', 'FRANCISCO ALVES (CENTRO)', 'FRANCISCO ALVES', 'PR', 'Polo'),
  ('1175792', 'FRANCISCO BELTRÃO', 'FRANCISCO BELTRÃO', 'PR', 'Polo'),
  ('1142608', 'FRANCO DA ROCHA', 'FRANCO DA ROCHA', 'SP', 'Polo'),
  ('1128528', 'FRECHEIRINHA', 'FRECHEIRINHA', 'CE', 'Polo'),
  ('1168402', 'FRONTEIRAS', 'FRONTEIRAS', 'PI', 'Polo'),
  ('1159331', 'FRUTAL', 'FRUTAL', 'MG', 'Polo'),
  ('1168403', 'FUNDÃO', 'FUNDÃO', 'ES', 'Polo'),
  ('1128529', 'GARANHUNS', 'GARANHUNS', 'PE', 'Polo'),
  ('1165156', 'GOIANA', 'GOIANA', 'PE', 'Polo'),
  ('1168404', 'GOIANÁPOLIS', 'GOIANÁPOLIS', 'GO', 'Polo'),
  ('1175748', 'GRAVATÁ (CENTRO)', 'GRAVATÁ', 'PE', 'Polo'),
  ('1175918', 'GRAVATAÍ', 'GRAVATAÍ', 'RS', 'Polo'),
  ('1128531', 'GROAÍRAS', 'GROAÍRAS', 'CE', 'Polo'),
  ('1160753', 'GUAÍBA', 'GUAÍBA', 'RS', 'Polo'),
  ('1142254', 'GUAÍRA', 'GUAÍRA', 'PR', 'Polo'),
  ('1175998', 'GUAÍRA', 'GUAÍRA', 'SP', 'Polo'),
  ('1169595', 'GUAJARÁ - MIRIM (SANTA LUZIA)', 'GUAJARÁ - MIRIM', 'RO', 'Polo'),
  ('1129241', 'GUAJARÁ MIRIM', 'GUAJARÁ MIRIM', 'RO', 'Polo'),
  ('1168406', 'GUAMARÉ (BAIXA DO MEIO)', 'GUAMARÉ', 'RN', 'Polo'),
  ('1129243', 'GUAPIARA', 'GUAPIARA', 'SP', 'Polo'),
  ('1168407', 'GUAPIMIRIM', 'GUAPIMIRIM', 'RJ', 'Polo'),
  ('1129244', 'GUARABIRA', 'GUARABIRA', 'PB', 'Polo'),
  ('1129247', 'GUARAÇAÍ', 'GUARAÇAÍ', 'SP', 'Polo'),
  ('1168408', 'GUARACIABA DO NORTE', 'GUARACIABA DO NORTE', 'CE', 'Polo'),
  ('1175793', 'GUARAPUAVA', 'GUARAPUAVA', 'PR', 'Polo'),
  ('1129248', 'GUARATINGUETÁ', 'GUARATINGUETÁ', 'SP', 'Polo'),
  ('1168409', 'GUARATUBA', 'GUARATUBA', 'PR', 'Polo'),
  ('1159332', 'GUARIBA', 'GUARIBA', 'SP', 'Polo'),
  ('1175999', 'GUARUJÁ', 'GUARUJÁ', 'SP', 'Polo'),
  ('1168411', 'GUARULHOS (JARDIM PRESIDENTE DUTRA)', 'GUARULHOS', 'SP', 'Polo'),
  ('1168410', 'GUARULHOS (SHOPPING MAIA)', 'GUARULHOS', 'SP', 'Polo'),
  ('1142105', 'GUARULHOS(ROSA DE FRANÇA)', 'GUARULHOS', 'SP', 'Polo'),
  ('1153990', 'HORTOLÂNDIA', 'HORTOLÂNDIA', 'SP', 'Polo'),
  ('1159357', 'HUMAITÁ', 'HUMAITÁ', 'AM', 'Polo'),
  ('1175524', 'IAÇU', 'IAÇU', 'BA', 'Polo'),
  ('1179564', 'IBICARAÍ', 'IBICARAÍ', 'BA', 'Polo'),
  ('1142385', 'IBIPORÃ', 'IBIPORÃ', 'PR', 'Polo'),
  ('1160754', 'IBIQUERA', 'IBIQUERA', 'BA', 'Polo'),
  ('1159361', 'IBIRITÉ', 'IBIRITÉ', 'MG', 'Polo'),
  ('1129254', 'IBITIARA', 'IBITIARA', 'BA', 'Polo'),
  ('1160756', 'IBITINGA', 'IBITINGA', 'SP', 'Polo'),
  ('1168435', 'ICÓ', 'ICÓ', 'CE', 'Polo'),
  ('1179568', 'IGARASSU', 'IGARASSU', 'PE', 'Polo'),
  ('1169596', 'IGUAÍ', 'IGUAÍ', 'BA', 'Polo'),
  ('1154349', 'IGUATEMI', 'IGUATEMI', 'MS', 'Polo'),
  ('1129255', 'IGUATU', 'IGUATU', 'CE', 'Polo'),
  ('1159213', 'IJUÍ', 'IJUÍ', 'RS', 'Polo'),
  ('1142107', 'ILHA SOLTEIRA', 'ILHA SOLTEIRA', 'SP', 'Polo'),
  ('1168437', 'ILHABELA', 'ILHABELA', 'SP', 'Polo'),
  ('1175525', 'ILHÉUS', 'ILHÉUS', 'BA', 'Polo'),
  ('1147646', 'IMBÉ', 'IMBÉ', 'RS', 'Polo'),
  ('1160759', 'IMBITUBA', 'IMBITUBA', 'SC', 'Polo'),
  ('1175621', 'IMPERATRIZ', 'IMPERATRIZ', 'MA', 'Polo'),
  ('1154310', 'INDAIAL', 'INDAIAL', 'SC', 'Polo'),
  ('1176000', 'INDAIATUBA', 'INDAIATUBA', 'SP', 'Polo'),
  ('1129258', 'INHAPIM', 'INHAPIM', 'MG', 'Polo'),
  ('1169598', 'IPANEMA', 'IPANEMA', 'MG', 'Polo'),
  ('1130667', 'IPATINGA', 'IPATINGA', 'MG', 'Polo'),
  ('1169597', 'IPIAÚ', 'IPIAÚ', 'BA', 'Polo'),
  ('1129259', 'IPIRÁ', 'IPIRÁ', 'BA', 'Polo'),
  ('1129262', 'IPIRANGA', 'IPIRANGA', 'PR', 'Polo'),
  ('1159214', 'IPORÁ', 'IPORÁ', 'GO', 'Polo'),
  ('1129263', 'IPUEIRAS', 'IPUEIRAS', 'CE', 'Polo'),
  ('1142897', 'IRACEMÁPOLIS', 'IRACEMÁPOLIS', 'SP', 'Polo'),
  ('1168915', 'IRANDUBA', 'IRANDUBA', 'AM', 'Polo'),
  ('1175797', 'IRATI', 'IRATI', 'PR', 'Polo'),
  ('1142261', 'IRECÊ', 'IRECÊ', 'BA', 'Polo'),
  ('1142266', 'IRETAMA', 'IRETAMA', 'PR', 'Polo'),
  ('1143155', 'ITABAIANA', 'ITABAIANA', 'SE', 'Polo'),
  ('1175526', 'ITABERABA', 'ITABERABA', 'BA', 'Polo'),
  ('1175850', 'ITABORAÍ', 'ITABORAÍ', 'RJ', 'Polo'),
  ('1175527', 'ITABUNA (CENTRO)', 'ITABUNA', 'BA', 'Polo'),
  ('1168438', 'ITABUNA', 'ITABUNA', 'BA', 'Polo'),
  ('1142931', 'ITACOATIARA', 'ITACOATIARA', 'AM', 'Polo'),
  ('1160761', 'ITAGUAÍ', 'ITAGUAÍ', 'RJ', 'Polo'),
  ('1142267', 'ITAGUAJÉ', 'ITAGUAJÉ', 'PR', 'Polo'),
  ('1175733', 'ITAITUBA', 'ITAITUBA', 'PA', 'Polo'),
  ('1175941', 'ITAJAÍ', 'ITAJAÍ', 'SC', 'Polo'),
  ('1175636', 'ITAJUBÁ', 'ITAJUBÁ', 'MG', 'Polo'),
  ('1168439', 'ITAMARAJU', 'ITAMARAJU', 'BA', 'Polo'),
  ('1168441', 'ITAMBACURI', 'ITAMBACURI', 'MG', 'Polo'),
  ('1168443', 'ITAMONTE', 'ITAMONTE', 'MG', 'Polo'),
  ('1159217', 'ITANHAÉM', 'ITANHAÉM', 'SP', 'Polo'),
  ('1175943', 'ITAPEMA', 'ITAPEMA', 'SC', 'Polo'),
  ('1175878', 'ITAPERUNA', 'ITAPERUNA', 'RJ', 'Polo'),
  ('1165159', 'ITAPETINGA', 'ITAPETINGA', 'BA', 'Polo'),
  ('1157115', 'ITAPETININGA', 'ITAPETININGA', 'SP', 'Polo'),
  ('1176001', 'ITAPEVI', 'ITAPEVI', 'SP', 'Polo'),
  ('1175550', 'ITAPIPOCA', 'ITAPIPOCA', 'CE', 'Polo'),
  ('1168463', 'ITAPORANGA', 'ITAPORANGA', 'PB', 'Polo'),
  ('1176002', 'ITAQUAQUECETUBA', 'ITAQUAQUECETUBA', 'SP', 'Polo'),
  ('1120586', 'Itararé', 'Itararé', 'SP', 'Polo'),
  ('1168464', 'ITAREMA', 'ITAREMA', 'CE', 'Polo'),
  ('1130714', 'ITAÚ DE MINAS', 'ITAÚ DE MINAS', 'MG', 'Polo'),
  ('1159218', 'ITAÚNA', 'ITAÚNA', 'MG', 'Polo'),
  ('1165161', 'ITIÚBA', 'ITIÚBA', 'BA', 'Polo'),
  ('1143157', 'ITU', 'ITU', 'SP', 'Polo'),
  ('1168246', 'ITUIUTABA', 'ITUIUTABA', 'MG', 'Polo'),
  ('1175734', 'ITUPIRANGA', 'ITUPIRANGA', 'PA', 'Polo'),
  ('1176003', 'ITUVERAVA', 'ITUVERAVA', 'SP', 'Polo'),
  ('1142954', 'IVAIPORÃ', 'IVAIPORÃ', 'PR', 'Polo'),
  ('1142314', 'IVOTI', 'IVOTI', 'RS', 'Polo'),
  ('1168465', 'JABOATÃO DOS GUARARAPES (CENTRO)', 'JABOATÃO DOS GUARARAPES', 'PE', 'Polo'),
  ('1147701', 'JABOATÃO DOS GUARARAPES', 'JABOATÃO DOS GUARARAPES', 'PE', 'Polo'),
  ('1147702', 'JABOTICABAL', 'JABOTICABAL', 'SP', 'Polo'),
  ('1142315', 'JACAREÍ', 'JACAREÍ', 'SP', 'Polo'),
  ('1175798', 'JACAREZINHO (CENTRO)', 'JACAREZINHO', 'PR', 'Polo'),
  ('1168466', 'JACOBINA', 'JACOBINA', 'BA', 'Polo'),
  ('1142316', 'JAGUAQUARA', 'JAGUAQUARA', 'BA', 'Polo'),
  ('1159362', 'JAGUARIÚNA', 'JAGUARIÚNA', 'SP', 'Polo'),
  ('1159364', 'JALES', 'JALES', 'SP', 'Polo'),
  ('1175639', 'JANAÚBA', 'JANAÚBA', 'MG', 'Polo'),
  ('1142319', 'JANDAIA DO SUL', 'JANDAIA DO SUL', 'PR', 'Polo'),
  ('1160057', 'JANDIRA', 'JANDIRA', 'SP', 'Polo'),
  ('1168467', 'JAPERI', 'JAPERI', 'RJ', 'Polo'),
  ('1120597', 'Japoatã', 'Japoatã', 'SE', 'Polo'),
  ('1159030', 'JARAGUÁ DO SUL', 'JARAGUÁ DO SUL', 'SC', 'Polo'),
  ('1154350', 'JATAÍ (CENTRO)', 'JATAÍ', 'GO', 'Polo'),
  ('1142396', 'JATAÍ', 'JATAÍ', 'GO', 'Polo'),
  ('1176004', 'JAÚ', 'JAÚ', 'SP', 'Polo'),
  ('1142108', 'JEQUIÉ', 'JEQUIÉ', 'BA', 'Polo'),
  ('1130670', 'JEQUITAÍ', 'JEQUITAÍ', 'MG', 'Polo'),
  ('1175895', 'JI-PARANÁ', 'JI-PARANÁ', 'RO', 'Polo'),
  ('1129274', 'JIJOCA DE JERICOACOARA', 'JIJOCA DE JERICOACOARA', 'CE', 'Polo'),
  ('1175945', 'JOAÇABA (CENTRO)', 'JOAÇABA', 'SC', 'Polo'),
  ('1160059', 'JOÃO CÂMARA', 'JOÃO CÂMARA', 'RN', 'Polo'),
  ('1168470', 'JOÃO NEIVA', 'JOÃO NEIVA', 'ES', 'Polo'),
  ('1175528', 'JUAZEIRO (CENTRO)', 'JUAZEIRO', 'BA', 'Polo'),
  ('1129277', 'JUAZEIRO DO NORTE', 'JUAZEIRO DO NORTE', 'CE', 'Polo'),
  ('1175645', 'JUIZ DE FORA', 'JUIZ DE FORA', 'MG', 'Polo'),
  ('1142610', 'JUNDIAÍ', 'JUNDIAÍ', 'SP', 'Polo'),
  ('1165165', 'JUNQUEIRÓPOLIS', 'JUNQUEIRÓPOLIS', 'SP', 'Polo'),
  ('1168472', 'JUQUIÁ', 'JUQUIÁ', 'SP', 'Polo'),
  ('1175956', 'LAGARTO', 'LAGARTO', 'SE', 'Polo'),
  ('1159219', 'LAGES', 'LAGES', 'SC', 'Polo'),
  ('1147703', 'LAGUNA', 'LAGUNA', 'SC', 'Polo'),
  ('1175879', 'LAJE DO MURIAÉ', 'LAJE DO MURIAÉ', 'RJ', 'Polo'),
  ('1147704', 'LAJEADO', 'LAJEADO', 'RS', 'Polo'),
  ('1120600', 'LAPA', 'LAPA', 'PR', 'Polo'),
  ('1142957', 'LARANJEIRAS DO SUL', 'LARANJEIRAS DO SUL', 'PR', 'Polo'),
  ('1175529', 'LAURO DE FREITAS', 'LAURO DE FREITAS', 'BA', 'Polo'),
  ('1175646', 'LAVRAS', 'LAVRAS', 'MG', 'Polo'),
  ('1154111', 'LEME', 'LEME', 'SP', 'Polo'),
  ('1176005', 'LENÇÓIS PAULISTA', 'LENÇÓIS PAULISTA', 'SP', 'Polo'),
  ('1142331', 'LEÓPOLIS', 'LEÓPOLIS', 'PR', 'Polo'),
  ('1142026', 'LIBERDADE', 'LIBERDADE', 'MG', 'Polo'),
  ('1128533', 'Limeira', 'Limeira', 'SP', 'Polo'),
  ('1154314', 'LIMOEIRO DO AJURU', 'LIMOEIRO DO AJURU', 'PA', 'Polo'),
  ('1147705', 'LINHARES', 'LINHARES', 'ES', 'Polo'),
  ('1147708', 'LINS', 'LINS', 'SP', 'Polo'),
  ('1142027', 'LOANDA', 'LOANDA', 'PR', 'Polo'),
  ('1176006', 'LORENA', 'LORENA', 'SP', 'Polo'),
  ('1175530', 'LUÍS EDUARDO MAGALHÃES', 'LUÍS EDUARDO MAGALHÃES', 'BA', 'Polo'),
  ('1147753', 'LUZIÂNIA', 'LUZIÂNIA', 'GO', 'Polo'),
  ('1175880', 'MACAÉ', 'MACAÉ', 'RJ', 'Polo'),
  ('1129280', 'MACAIBA', 'MACAIBA', 'RN', 'Polo'),
  ('1169601', 'MACAU', 'MACAU', 'RN', 'Polo'),
  ('1175491', 'MACEIÓ (CIDADE UNIVERSITÁRIA)', 'MACEIÓ', 'AL', 'Polo'),
  ('1175532', 'MADRE DE DEUS', 'MADRE DE DEUS', 'BA', 'Polo'),
  ('1175881', 'MAGÉ (PIABETÁ)', 'MAGÉ', 'RJ', 'Polo'),
  ('1142971', 'MAIRIPORÃ', 'MAIRIPORÃ', 'SP', 'Polo'),
  ('1168473', 'MALACACHETA', 'MALACACHETA', 'MG', 'Polo'),
  ('1129329', 'MALLET', 'MALLET', 'PR', 'Polo'),
  ('1157116', 'MANACAPURU', 'MANACAPURU', 'AM', 'Polo'),
  ('1156239', 'MANAUS (PARQUE 10)', 'MANAUS', 'AM', 'Polo'),
  ('1175494', 'MANAUS (ZONA LESTE)', 'MANAUS', 'AM', 'Polo'),
  ('1175495', 'MANAUS (ZONA NORTE)', 'MANAUS', 'AM', 'Polo'),
  ('1159222', 'MÂNCIO LIMA', 'MÂNCIO LIMA', 'AC', 'Polo'),
  ('1175179', 'MANDAGUAÇU (VILA CARRARO)', 'MANDAGUAÇU', 'PR', 'Polo'),
  ('1168474', 'MANDAGUARI', 'MANDAGUARI', 'PR', 'Polo'),
  ('1169593', 'MANDIRITUBA', 'MANDIRITUBA', 'PR', 'Polo'),
  ('1168475', 'MANTENA', 'MANTENA', 'MG', 'Polo'),
  ('1175735', 'MARABÁ', 'MARABÁ', 'PA', 'Polo'),
  ('1154320', 'MARACANAÚ', 'MARACANAÚ', 'CE', 'Polo'),
  ('1142029', 'MARACÁS', 'MARACÁS', 'BA', 'Polo'),
  ('1168483', 'MARANGUAPE', 'MARANGUAPE', 'CE', 'Polo'),
  ('1159223', 'MARAU', 'MARAU', 'RS', 'Polo'),
  ('1168486', 'MARCIONÍLIO SOUZA', 'MARCIONÍLIO SOUZA', 'BA', 'Polo'),
  ('1160060', 'MARECHAL DEODORO', 'MARECHAL DEODORO', 'AL', 'Polo'),
  ('1130367', 'MARECHAL THAUMATURGO', 'MARECHAL THAUMATURGO', 'AC', 'Polo'),
  ('1175647', 'MARIA DA FÉ (SANTO ANTÔNIO)', 'MARIA DA FÉ', 'MG', 'Polo'),
  ('1147754', 'MARIALVA', 'MARIALVA', 'PR', 'Polo'),
  ('1168487', 'MARIANA', 'MARIANA', 'MG', 'Polo'),
  ('1142030', 'MARILENA', 'MARILENA', 'PR', 'Polo'),
  ('1176007', 'MARÍLIA', 'MARÍLIA', 'SP', 'Polo'),
  ('1111005', 'MARINGÁ (TREINE INGÁ)', 'MARINGÁ', 'PR', 'Polo'),
  ('1164946', 'MARINGÁ (VILA MORANGUEIRA)', 'MARINGÁ', 'PR', 'Polo'),
  ('1175736', 'MARITUBA', 'MARITUBA', 'PA', 'Polo'),
  ('1130370', 'MARUMBI', 'MARUMBI', 'PR', 'Polo'),
  ('1168488', 'MATA DE SÃO JOÃO', 'MATA DE SÃO JOÃO', 'BA', 'Polo'),
  ('1176008', 'MATÃO', 'MATÃO', 'SP', 'Polo'),
  ('1176009', 'MAUÁ', 'MAUÁ', 'SP', 'Polo'),
  ('1175804', 'MEDIANEIRA', 'MEDIANEIRA', 'PR', 'Polo'),
  ('1142110', 'MEDICILÂNDIA', 'MEDICILÂNDIA', 'PA', 'Polo'),
  ('1175737', 'MEGA POLO ALTAMIRA', 'MEGA POLO ALTAMIRA', 'PA', 'Megapolo'),
  ('1175963', 'MEGA POLO AMERICANA', 'MEGA POLO AMERICANA', 'SP', 'Megapolo'),
  ('1154836', 'MEGA POLO ANDRADINA', 'MEGA POLO ANDRADINA', 'SP', 'Megapolo'),
  ('1150883', 'MEGA POLO ARACAJU (SÃO JOSÉ)', 'MEGA POLO ARACAJU', 'SE', 'Megapolo'),
  ('1154937', 'MEGA POLO ARAÇATUBA', 'MEGA POLO ARAÇATUBA', 'SP', 'Megapolo'),
  ('1120500', 'MEGA POLO ARAPONGAS', 'MEGA POLO ARAPONGAS', 'PR', 'Megapolo'),
  ('1175745', 'MEGA POLO ARCOVERDE', 'MEGA POLO ARCOVERDE', 'PE', 'Megapolo'),
  ('1142349', 'MEGA POLO BARBACENA', 'MEGA POLO BARBACENA', 'MG', 'Megapolo'),
  ('1127249', 'MEGA POLO BARRA DO GARÇAS', 'MEGA POLO BARRA DO GARÇAS', 'MT', 'Megapolo'),
  ('1154938', 'MEGA POLO BARREIRAS', 'MEGA POLO BARREIRAS', 'BA', 'Megapolo'),
  ('1154940', 'MEGA POLO BAURU', 'MEGA POLO BAURU', 'SP', 'Megapolo'),
  ('1154941', 'MEGA POLO BELÉM', 'MEGA POLO BELÉM', 'PA', 'Megapolo'),
  ('1154942', 'MEGA POLO BELO HORIZONTE (CENTRO)', 'MEGA POLO BELO HORIZONTE', 'MG', 'Megapolo'),
  ('1175913', 'MEGA POLO BOA VISTA', 'MEGA POLO BOA VISTA', 'RR', 'Megapolo'),
  ('1154943', 'MEGA POLO BOTUCATU', 'MEGA POLO BOTUCATU', 'SP', 'Megapolo'),
  ('1157060', 'MEGA POLO BRASÍLIA (ASA SUL)', 'MEGA POLO BRASÍLIA', 'DF', 'Megapolo'),
  ('1175847', 'MEGA POLO CABO FRIO', 'MEGA POLO CABO FRIO', 'RJ', 'Megapolo'),
  ('1154949', 'MEGA POLO CAJAZEIRAS', 'MEGA POLO CAJAZEIRAS', 'PB', 'Megapolo'),
  ('1154954', 'MEGA POLO CAMPINA GRANDE', 'MEGA POLO CAMPINA GRANDE', 'PB', 'Megapolo'),
  ('1154966', 'MEGA POLO CAMPINAS', 'MEGA POLO CAMPINAS', 'SP', 'Megapolo'),
  ('1154968', 'MEGA POLO CAMPO GRANDE', 'MEGA POLO CAMPO GRANDE', 'MS', 'Megapolo'),
  ('1154969', 'MEGA POLO CAMPO MOURÃO', 'MEGA POLO CAMPO MOURÃO', 'PR', 'Megapolo'),
  ('1120570', 'MEGA POLO CASCAVEL', 'MEGA POLO CASCAVEL', 'PR', 'Megapolo'),
  ('1154975', 'MEGA POLO CATANDUVA', 'MEGA POLO CATANDUVA', 'SP', 'Megapolo'),
  ('1156178', 'MEGA POLO CAXIAS DO SUL', 'MEGA POLO CAXIAS DO SUL', 'RS', 'Megapolo'),
  ('1156365', 'MEGA POLO CUIABÁ', 'MEGA POLO CUIABÁ', 'MT', 'Megapolo'),
  ('1120576', 'MEGA POLO CURITIBA', 'MEGA POLO CURITIBA', 'PR', 'Megapolo'),
  ('1156366', 'MEGA POLO EXU', 'MEGA POLO EXU', 'PE', 'Megapolo'),
  ('1175523', 'MEGA POLO FEIRA DE SANTANA', 'MEGA POLO FEIRA DE SANTANA', 'BA', 'Megapolo'),
  ('1156367', 'MEGA POLO FLORIANÓPOLIS', 'MEGA POLO FLORIANÓPOLIS', 'SC', 'Megapolo'),
  ('1126860', 'MEGA POLO FORTALEZA (DAMAS)', 'MEGA POLO FORTALEZA', 'CE', 'Megapolo'),
  ('1156368', 'MEGA POLO FREDERICO WESTPHALEN', 'MEGA POLO FREDERICO WESTPHALEN', 'RS', 'Megapolo'),
  ('1156369', 'MEGA POLO GOIÂNIA', 'MEGA POLO GOIÂNIA', 'GO', 'Megapolo'),
  ('1156370', 'MEGA POLO GOVERNADOR VALADARES', 'MEGA POLO GOVERNADOR VALADARES', 'MG', 'Megapolo'),
  ('1156381', 'MEGA POLO GUARULHOS', 'MEGA POLO GUARULHOS', 'SP', 'Megapolo'),
  ('1156442', 'MEGA POLO ITUMBIARA', 'MEGA POLO ITUMBIARA', 'GO', 'Megapolo'),
  ('1120598', 'MEGA POLO JOÃO PESSOA', 'MEGA POLO JOÃO PESSOA', 'PB', 'Megapolo'),
  ('1156444', 'MEGA POLO JOINVILLE', 'MEGA POLO JOINVILLE', 'SC', 'Megapolo'),
  ('1150884', 'MEGA POLO LONDRINA', 'MEGA POLO LONDRINA', 'PR', 'Megapolo'),
  ('1175498', 'MEGA POLO MACAPÁ', 'MEGA POLO MACAPÁ', 'AP', 'Megapolo'),
  ('1175492', 'MEGA POLO MACEIÓ', 'MEGA POLO MACEIÓ', 'AL', 'Megapolo'),
  ('1175496', 'MEGA POLO MANAUS', 'MEGA POLO MANAUS', 'AM', 'Megapolo'),
  ('1156465', 'MEGA POLO MARINGÁ (CENTRO)', 'MEGA POLO MARINGÁ', 'PR', 'Megapolo'),
  ('1120601', 'MEGA POLO MOGI DAS CRUZES', 'MEGA POLO MOGI DAS CRUZES', 'SP', 'Megapolo'),
  ('1156466', 'MEGA POLO MONTES CLAROS', 'MEGA POLO MONTES CLAROS', 'MG', 'Megapolo'),
  ('1156630', 'MEGA POLO NATAL', 'MEGA POLO NATAL', 'RN', 'Megapolo'),
  ('1156720', 'MEGA POLO NOVO HAMBURGO', 'MEGA POLO NOVO HAMBURGO', 'RS', 'Megapolo'),
  ('1175959', 'MEGA POLO PALMAS', 'MEGA POLO PALMAS', 'TO', 'Megapolo'),
  ('1152524', 'MEGA POLO PARANAVAÍ', 'MEGA POLO PARANAVAÍ', 'PR', 'Megapolo'),
  ('1156721', 'MEGA POLO PARAUAPEBAS', 'MEGA POLO PARAUAPEBAS', 'PA', 'Megapolo'),
  ('1156722', 'MEGA POLO PELOTAS', 'MEGA POLO PELOTAS', 'RS', 'Megapolo'),
  ('1156723', 'MEGA POLO PONTA GROSSA', 'MEGA POLO PONTA GROSSA', 'PR', 'Megapolo'),
  ('1175882', 'MEGA POLO PORCIÚNCULA', 'MEGA POLO PORCIÚNCULA', 'RJ', 'Megapolo'),
  ('1120605', 'MEGA POLO PORTO ALEGRE (CENTRO)', 'MEGA POLO PORTO ALEGRE', 'RS', 'Megapolo'),
  ('1156904', 'MEGA POLO PORTO VELHO', 'MEGA POLO PORTO VELHO', 'RO', 'Megapolo'),
  ('1156968', 'MEGA POLO RECIFE (ESPINHEIRO)', 'MEGA POLO RECIFE', 'PE', 'Megapolo'),
  ('1120656', 'MEGA POLO RIBEIRÃO PRETO', 'MEGA POLO RIBEIRÃO PRETO', 'SP', 'Megapolo'),
  ('1175488', 'MEGA POLO RIO BRANCO', 'MEGA POLO RIO BRANCO', 'AC', 'Megapolo'),
  ('1156907', 'MEGA POLO RIO DE JANEIRO', 'MEGA POLO RIO DE JANEIRO', 'RJ', 'Megapolo'),
  ('1156963', 'MEGA POLO SALVADOR (CENTRO)', 'MEGA POLO SALVADOR', 'BA', 'Megapolo'),
  ('1156908', 'MEGA POLO SANTA MARIA', 'MEGA POLO SANTA MARIA', 'RS', 'Megapolo'),
  ('1175739', 'MEGA POLO SANTARÉM', 'MEGA POLO SANTARÉM', 'PA', 'Megapolo'),
  ('1155962', 'MEGA POLO SANTO ANDRÉ', 'MEGA POLO SANTO ANDRÉ', 'SP', 'Megapolo'),
  ('1156909', 'MEGA POLO SÃO JOSÉ DO RIO PRETO', 'MEGA POLO SÃO JOSÉ DO RIO PRETO', 'SP', 'Megapolo'),
  ('1156912', 'MEGA POLO SÃO JOSÉ DOS CAMPOS (ZONA SUL)', 'MEGA POLO SÃO JOSÉ DOS CAMPOS', 'SP', 'Megapolo'),
  ('1156929', 'MEGA POLO SÃO LUÍS', 'MEGA POLO SÃO LUÍS', 'MA', 'Megapolo'),
  ('1151572', 'MEGA POLO SÃO PAULO (CENTRO)', 'MEGA POLO SÃO PAULO', 'SP', 'Megapolo'),
  ('1155774', 'MEGA POLO SOROCABA', 'MEGA POLO SOROCABA', 'SP', 'Megapolo'),
  ('1175625', 'MEGA POLO TIMON', 'MEGA POLO TIMON', 'MA', 'Megapolo'),
  ('1130739', 'MEGA POLO UBATUBA', 'MEGA POLO UBATUBA', 'SP', 'Megapolo'),
  ('1130740', 'MEGA POLO UBERABA', 'MEGA POLO UBERABA', 'MG', 'Megapolo'),
  ('1156971', 'MEGA POLO UBERLÂNDIA (CENTRO)', 'MEGA POLO UBERLÂNDIA', 'MG', 'Megapolo'),
  ('1140369', 'MEGA POLO UMUARAMA', 'MEGA POLO UMUARAMA', 'PR', 'Megapolo'),
  ('1156950', 'MEGA POLO VARGINHA', 'MEGA POLO VARGINHA', 'MG', 'Megapolo'),
  ('1130744', 'MEGA POLO VITÓRIA', 'MEGA POLO VITÓRIA', 'ES', 'Megapolo'),
  ('1156946', 'MEGA POLO VITÓRIA DA CONQUISTA', 'MEGA POLO VITÓRIA DA CONQUISTA', 'BA', 'Megapolo'),
  ('1168490', 'MIGUEL ALVES', 'MIGUEL ALVES', 'PI', 'Polo'),
  ('1175533', 'MILAGRES', 'MILAGRES', 'BA', 'Polo'),
  ('1169602', 'MINAÇU', 'MINAÇU', 'GO', 'Polo'),
  ('1176010', 'MIRANDÓPOLIS', 'MIRANDÓPOLIS', 'SP', 'Polo'),
  ('1159367', 'MIRASSOL', 'MIRASSOL', 'SP', 'Polo'),
  ('1168491', 'MOCOCA', 'MOCOCA', 'SP', 'Polo'),
  ('1130392', 'MOGI GUAÇU', 'MOGI GUAÇU', 'SP', 'Polo'),
  ('1176011', 'MOGI MIRIM (CENTRO)', 'MOGI MIRIM', 'SP', 'Polo'),
  ('1158914', 'MOJU', 'MOJU', 'PA', 'Polo'),
  ('1159224', 'MONGAGUÁ', 'MONGAGUÁ', 'SP', 'Polo'),
  ('1168492', 'MONTE ALEGRE', 'MONTE ALEGRE', 'PA', 'Polo'),
  ('1168493', 'MONTE FORMOSO', 'MONTE FORMOSO', 'MG', 'Polo'),
  ('1159369', 'MONTENEGRO', 'MONTENEGRO', 'RS', 'Polo'),
  ('1130396', 'MORAUJO', 'MORAUJO', 'CE', 'Polo'),
  ('1168494', 'MORRINHOS', 'MORRINHOS', 'CE', 'Polo'),
  ('1175894', 'MOSSORÓ', 'MOSSORÓ', 'RN', 'Polo'),
  ('1184096', 'NÃO-ME-TOQUE', 'NÃO-ME-TOQUE', 'RS', 'Polo'),
  ('1159386', 'NATIVIDADE', 'NATIVIDADE', 'RJ', 'Polo'),
  ('1175947', 'NAVEGANTES', 'NAVEGANTES', 'SC', 'Polo'),
  ('1142972', 'NAVIRAÍ', 'NAVIRAÍ', 'MS', 'Polo'),
  ('1168496', 'NAZARÉ PAULISTA', 'NAZARÉ PAULISTA', 'SP', 'Polo'),
  ('1132473', 'NEÓPOLIS', 'NEÓPOLIS', 'SE', 'Polo'),
  ('1168497', 'NIQUELÂNDIA', 'NIQUELÂNDIA', 'GO', 'Polo'),
  ('1165172', 'NITERÓI (PIRATININGA)', 'NITERÓI', 'RJ', 'Polo'),
  ('1142111', 'NITERÓI', 'NITERÓI', 'RJ', 'Polo'),
  ('1120602', 'Nossa Senhora Aparecida', 'Nossa Senhora Aparecida', 'SE', 'Polo'),
  ('1143158', 'NOSSA SENHORA DO SOCORRO', 'NOSSA SENHORA DO SOCORRO', 'SE', 'Polo'),
  ('1154117', 'NOVA ANDRADINA', 'NOVA ANDRADINA', 'MS', 'Polo'),
  ('1130401', 'NOVA ESPERANÇA', 'NOVA ESPERANÇA', 'PR', 'Polo'),
  ('1142032', 'NOVA ESPERANÇA DO PIRIÁ', 'NOVA ESPERANÇA DO PIRIÁ', 'PA', 'Polo'),
  ('1175883', 'NOVA FRIBURGO', 'NOVA FRIBURGO', 'RJ', 'Polo'),
  ('1169603', 'NOVA IGUAÇU (CENTRO)', 'NOVA IGUAÇU', 'RJ', 'Polo'),
  ('1175884', 'NOVA IGUAÇU', 'NOVA IGUAÇU', 'RJ', 'Polo'),
  ('1175806', 'NOVA LONDRINA', 'NOVA LONDRINA', 'PR', 'Polo'),
  ('1175909', 'NOVA MAMORÉ', 'NOVA MAMORÉ', 'RO', 'Polo'),
  ('1130405', 'NOVA OLINDA', 'NOVA OLINDA', 'CE', 'Polo'),
  ('1169604', 'NOVA OLINDA DO NORTE', 'NOVA OLINDA DO NORTE', 'AM', 'Polo'),
  ('1130407', 'NOVA RUSSAS', 'NOVA RUSSAS', 'CE', 'Polo'),
  ('1159226', 'NOVA SERRANA', 'NOVA SERRANA', 'MG', 'Polo'),
  ('1130408', 'NOVA XAVANTINA', 'NOVA XAVANTINA', 'MT', 'Polo'),
  ('1176012', 'NOVO HORIZONTE', 'NOVO HORIZONTE', 'SP', 'Polo'),
  ('1154119', 'OLÍMPIA', 'OLÍMPIA', 'SP', 'Polo'),
  ('1175750', 'OLINDA', 'OLINDA', 'PE', 'Polo'),
  ('1168917', 'ORTIGUEIRA', 'ORTIGUEIRA', 'PR', 'Polo'),
  ('1142336', 'OSASCO', 'OSASCO', 'SP', 'Polo'),
  ('1147760', 'OSÓRIO', 'OSÓRIO', 'RS', 'Polo'),
  ('1147761', 'OSVALDO CRUZ', 'OSVALDO CRUZ', 'SP', 'Polo'),
  ('1175751', 'OURICURI', 'OURICURI', 'PE', 'Polo'),
  ('1159387', 'OURINHOS (VILA MORAES)', 'OURINHOS', 'SP', 'Polo'),
  ('1142621', 'OURINHOS', 'OURINHOS', 'SP', 'Polo'),
  ('1160772', 'PAÇO DO LUMIAR', 'PAÇO DO LUMIAR', 'MA', 'Polo'),
  ('1142622', 'PAIÇANDU', 'PAIÇANDU', 'PR', 'Polo'),
  ('1142973', 'PALHOÇA', 'PALHOÇA', 'SC', 'Polo'),
  ('1120603', 'PALMAS', 'PALMAS', 'PR', 'Polo'),
  ('1130411', 'PALMEIRA DAS MISSÕES', 'PALMEIRA DAS MISSÕES', 'RS', 'Polo'),
  ('1175493', 'PALMEIRA DOS ÍNDIOS', 'PALMEIRA DOS ÍNDIOS', 'AL', 'Polo'),
  ('1154122', 'PALMEIRAS', 'PALMEIRAS', 'BA', 'Polo'),
  ('1168918', 'PALOTINA', 'PALOTINA', 'PR', 'Polo'),
  ('1168920', 'PANAMBI', 'PANAMBI', 'RS', 'Polo'),
  ('1142979', 'PARÁ DE MINAS', 'PARÁ DE MINAS', 'MG', 'Polo'),
  ('1154323', 'PARACAMBI', 'PARACAMBI', 'RJ', 'Polo'),
  ('1142980', 'PARAGOMINAS', 'PARAGOMINAS', 'PA', 'Polo'),
  ('1159388', 'PARAGUAÇU PAULISTA', 'PARAGUAÇU PAULISTA', 'SP', 'Polo'),
  ('1142623', 'PARAIPABA', 'PARAIPABA', 'CE', 'Polo'),
  ('1130412', 'PARAÍSO DO NORTE', 'PARAÍSO DO NORTE', 'PR', 'Polo'),
  ('1154352', 'PARAÍSO', 'PARAÍSO', 'SP', 'Polo'),
  ('1175648', 'PARAISÓPOLIS', 'PARAISÓPOLIS', 'MG', 'Polo'),
  ('1168922', 'PARANACITY', 'PARANACITY', 'PR', 'Polo'),
  ('1147763', 'PARANAGUÁ', 'PARANAGUÁ', 'PR', 'Polo'),
  ('1142624', 'PARATY', 'PARATY', 'RJ', 'Polo'),
  ('1142625', 'PARINTINS', 'PARINTINS', 'AM', 'Polo'),
  ('1142981', 'PARNAÍBA', 'PARNAÍBA', 'PI', 'Polo'),
  ('1175753', 'PARNAMIRIM', 'PARNAMIRIM', 'PE', 'Polo'),
  ('1142982', 'PARNAMIRIM', 'PARNAMIRIM', 'RN', 'Polo'),
  ('1169605', 'PASSO DE CAMARAGIBE', 'PASSO DE CAMARAGIBE', 'AL', 'Polo'),
  ('1175919', 'PASSO FUNDO', 'PASSO FUNDO', 'RS', 'Polo'),
  ('1175649', 'PASSOS', 'PASSOS', 'MG', 'Polo'),
  ('1142629', 'PATO BRANCO', 'PATO BRANCO', 'PR', 'Polo'),
  ('1142631', 'PATOS', 'PATOS', 'PB', 'Polo'),
  ('1165175', 'PATOS DE MINAS', 'PATOS DE MINAS', 'MG', 'Polo'),
  ('1143159', 'PATROCÍNIO', 'PATROCÍNIO', 'MG', 'Polo'),
  ('1176013', 'PATROCÍNIO PAULISTA', 'PATROCÍNIO PAULISTA', 'SP', 'Polo'),
  ('1154125', 'PAULÍNIA', 'PAULÍNIA', 'SP', 'Polo'),
  ('1175755', 'PAULISTA', 'PAULISTA', 'PE', 'Polo'),
  ('1130676', 'PAULO AFONSO', 'PAULO AFONSO', 'BA', 'Polo'),
  ('1132474', 'PEDERNEIRAS', 'PEDERNEIRAS', 'SP', 'Polo'),
  ('1175761', 'PEDRO II', 'PEDRO II', 'PI', 'Polo'),
  ('1168928', 'PENÁPOLIS', 'PENÁPOLIS', 'SP', 'Polo'),
  ('1168929', 'PERITORÓ', 'PERITORÓ', 'MA', 'Polo'),
  ('1142034', 'PÉROLA', 'PÉROLA', 'PR', 'Polo'),
  ('1130415', 'PERUÍBE', 'PERUÍBE', 'SP', 'Polo'),
  ('1159040', 'PETROLÂNDIA', 'PETROLÂNDIA', 'PE', 'Polo'),
  ('1175756', 'PETROLINA (AREIA BRANCA)', 'PETROLINA', 'PE', 'Polo'),
  ('1156973', 'PETROLINA (ORLA)', 'PETROLINA', 'PE', 'Polo'),
  ('1147765', 'PETRÓPOLIS', 'PETRÓPOLIS', 'RJ', 'Polo'),
  ('1142338', 'PICOS', 'PICOS', 'PI', 'Polo'),
  ('1168930', 'PIMENTA BUENO', 'PIMENTA BUENO', 'RO', 'Polo'),
  ('1130416', 'PINDAMONHANGABA', 'PINDAMONHANGABA', 'SP', 'Polo'),
  ('1132475', 'PINHAIS', 'PINHAIS', 'PR', 'Polo'),
  ('1168931', 'PIQUETE', 'PIQUETE', 'SP', 'Polo'),
  ('1176014', 'PIRACICABA', 'PIRACICABA', 'SP', 'Polo'),
  ('1142131', 'PIRACURUCA', 'PIRACURUCA', 'PI', 'Polo'),
  ('1160061', 'PIRAQUARA', 'PIRAQUARA', 'PR', 'Polo'),
  ('1169586', 'PIRASSUNUNGA', 'PIRASSUNUNGA', 'SP', 'Polo'),
  ('1142634', 'PITANGA', 'PITANGA', 'PR', 'Polo'),
  ('1156423', 'PLÁCIDO DE CASTRO (MULTIRÃO II)', 'PLÁCIDO DE CASTRO', 'AC', 'Polo'),
  ('1132476', 'PLÁCIDO DE CASTRO', 'PLÁCIDO DE CASTRO', 'AC', 'Polo'),
  ('1154327', 'PLANALTINA', 'PLANALTINA', 'GO', 'Polo'),
  ('1176015', 'POÁ', 'POÁ', 'SP', 'Polo'),
  ('1168245', 'POÇOS DE CALDAS', 'POÇOS DE CALDAS', 'MG', 'Polo'),
  ('1160774', 'POJUCA', 'POJUCA', 'BA', 'Polo'),
  ('1142986', 'POMBAL', 'POMBAL', 'PB', 'Polo'),
  ('1169599', 'POMPÉU', 'POMPÉU', 'MG', 'Polo'),
  ('1142399', 'PONTA DAS PEDRAS', 'PONTA DAS PEDRAS', 'PA', 'Polo'),
  ('1158963', 'PONTA PORÃ', 'PONTA PORÃ', 'MS', 'Polo'),
  ('1176016', 'PONTAL', 'PONTAL', 'SP', 'Polo'),
  ('1160062', 'PORTO ALEGRE (PETRÓPOLIS)', 'PORTO ALEGRE', 'RS', 'Polo'),
  ('1175920', 'PORTO ALEGRE (ZONA NORTE)', 'PORTO ALEGRE', 'RS', 'Polo'),
  ('1159230', 'PORTO ALEGRE (ZONA SUL)', 'PORTO ALEGRE', 'RS', 'Polo'),
  ('1169606', 'PORTO CALVO', 'PORTO CALVO', 'AL', 'Polo'),
  ('1120606', 'Porto da Folha', 'Porto da Folha', 'SE', 'Polo'),
  ('1175535', 'PORTO SEGURO (CENTRO)', 'PORTO SEGURO', 'BA', 'Polo'),
  ('1160063', 'PORTO VELHO (ZONA NORTE)', 'PORTO VELHO', 'RO', 'Polo'),
  ('1175910', 'PORTO VELHO (ZONA SUL)', 'PORTO VELHO', 'RO', 'Polo'),
  ('1175650', 'POUSO ALEGRE', 'POUSO ALEGRE', 'MG', 'Polo'),
  ('1130678', 'POXORÉU', 'POXORÉU', 'MT', 'Polo'),
  ('1168932', 'PRADO', 'PRADO', 'BA', 'Polo'),
  ('1176017', 'PRAIA GRANDE', 'PRAIA GRANDE', 'SP', 'Polo'),
  ('1132478', 'PRANCHITA', 'PRANCHITA', 'PR', 'Polo'),
  ('1169607', 'PRATÁPOLIS', 'PRATÁPOLIS', 'MG', 'Polo'),
  ('1130421', 'PRESIDENTE DUTRA', 'PRESIDENTE DUTRA', 'MA', 'Polo'),
  ('1176018', 'PRESIDENTE EPITÁCIO', 'PRESIDENTE EPITÁCIO', 'SP', 'Polo'),
  ('1168933', 'PRESIDENTE FIGUEIREDO', 'PRESIDENTE FIGUEIREDO', 'AM', 'Polo'),
  ('1176019', 'PRESIDENTE PRUDENTE', 'PRESIDENTE PRUDENTE', 'SP', 'Polo'),
  ('1165177', 'PRESIDENTE VENCESLAU', 'PRESIDENTE VENCESLAU', 'SP', 'Polo'),
  ('1142987', 'PRIMAVERA DO LESTE', 'PRIMAVERA DO LESTE', 'MT', 'Polo'),
  ('1175809', 'PRIMEIRO DE MAIO (CENTRO)', 'PRIMEIRO DE MAIO', 'PR', 'Polo'),
  ('1175810', 'PRUDENTÓPOLIS', 'PRUDENTÓPOLIS', 'PR', 'Polo'),
  ('1160775', 'PUXINANÃ', 'PUXINANÃ', 'PB', 'Polo'),
  ('1158917', 'QUEDAS DO IGUAÇU', 'QUEDAS DO IGUAÇU', 'PR', 'Polo'),
  ('1164949', 'QUEIMADAS', 'QUEIMADAS', 'PB', 'Polo'),
  ('1175885', 'QUEIMADOS', 'QUEIMADOS', 'RJ', 'Polo'),
  ('1169594', 'QUITANDINHA', 'QUITANDINHA', 'PR', 'Polo'),
  ('1175551', 'QUIXADÁ (HERVAL)', 'QUIXADÁ', 'CE', 'Polo'),
  ('1175568', 'QUIXERAMOBIM', 'QUIXERAMOBIM', 'CE', 'Polo'),
  ('1175758', 'RECIFE (BOA VISTA)', 'RECIFE', 'PE', 'Polo'),
  ('1157118', 'RECIFE (SANTO AMARO)', 'RECIFE', 'PE', 'Polo'),
  ('1175738', 'REDENÇÃO', 'REDENÇÃO', 'PA', 'Polo'),
  ('1176020', 'REGISTRO', 'REGISTRO', 'SP', 'Polo'),
  ('1142988', 'RESENDE', 'RESENDE', 'RJ', 'Polo'),
  ('1175838', 'RESERVA', 'RESERVA', 'PR', 'Polo'),
  ('1168934', 'RIBEIRÃO', 'RIBEIRÃO', 'PE', 'Polo'),
  ('1130680', 'RIBEIRÃO CASCALHEIRA', 'RIBEIRÃO CASCALHEIRA', 'MT', 'Polo'),
  ('1159390', 'RIBEIRÃO DAS NEVES', 'RIBEIRÃO DAS NEVES', 'MG', 'Polo'),
  ('1160776', 'RIBEIRÃO PIRES', 'RIBEIRÃO PIRES', 'SP', 'Polo'),
  ('1168936', 'RIO AZUL', 'RIO AZUL', 'PR', 'Polo'),
  ('1132480', 'RIO BOM', 'RIO BOM', 'PR', 'Polo'),
  ('1168937', 'RIO BONITO', 'RIO BONITO', 'RJ', 'Polo'),
  ('1160784', 'RIO BRANCO DO SUL', 'RIO BRANCO DO SUL', 'PR', 'Polo'),
  ('1142036', 'RIO CLARO', 'RIO CLARO', 'SP', 'Polo'),
  ('1175887', 'RIO DAS OSTRAS', 'RIO DAS OSTRAS', 'RJ', 'Polo'),
  ('1160064', 'RIO DE JANEIRO (BARRA DA TIJUCA)', 'RIO DE JANEIRO', 'RJ', 'Polo'),
  ('1160068', 'RIO DE JANEIRO (CAMPO GRANDE)', 'RIO DE JANEIRO', 'RJ', 'Polo'),
  ('1130681', 'RIO DE JANEIRO (COPACABANA)', 'RIO DE JANEIRO', 'RJ', 'Polo'),
  ('1164950', 'RIO DE JANEIRO (ILHA DO GOVENADOR)', 'RIO DE JANEIRO', 'RJ', 'Polo'),
  ('1175886', 'RIO DE JANEIRO (RECREIO DOS BANDEIRANTES)', 'RIO DE JANEIRO', 'RJ', 'Polo'),
  ('1169608', 'RIO DO FOGO', 'RIO DO FOGO', 'RN', 'Polo'),
  ('1184097', 'RIO DO SUL', 'RIO DO SUL', 'SC', 'Polo'),
  ('1142989', 'RIO GRANDE', 'RIO GRANDE', 'RS', 'Polo'),
  ('1160069', 'RIO LARGO', 'RIO LARGO', 'AL', 'Polo'),
  ('1175497', 'RIO PRETO DA EVA', 'RIO PRETO DA EVA', 'AM', 'Polo'),
  ('1142638', 'RIO VERDE', 'RIO VERDE', 'GO', 'Polo'),
  ('1120659', 'Rodeio Bonito', 'Rodeio Bonito', 'RS', 'Polo'),
  ('1175489', 'RODRIGUES ALVES', 'RODRIGUES ALVES', 'AC', 'Polo'),
  ('1159391', 'ROLÂNDIA', 'ROLÂNDIA', 'PR', 'Polo'),
  ('1168949', 'ROLIM DE MOURA', 'ROLIM DE MOURA', 'RO', 'Polo'),
  ('1142119', 'RONDONÓPOLIS', 'RONDONÓPOLIS', 'MT', 'Polo'),
  ('1142990', 'RORAINÓPOLIS', 'RORAINÓPOLIS', 'RR', 'Polo'),
  ('1165181', 'ROSANA (DISTRITO PRIMAVERA)', 'ROSANA', 'SP', 'Polo'),
  ('1168951', 'ROSÁRIO DO SUL', 'ROSÁRIO DO SUL', 'RS', 'Polo'),
  ('1130481', 'RUSSAS', 'RUSSAS', 'CE', 'Polo'),
  ('1160786', 'SALGUEIRO', 'SALGUEIRO', 'PE', 'Polo'),
  ('1176021', 'SALTO', 'SALTO', 'SP', 'Polo'),
  ('1142120', 'SALVADOR (BOCA DO RIO)', 'SALVADOR', 'BA', 'Polo'),
  ('1175536', 'SALVADOR (CABULA)', 'SALVADOR', 'BA', 'Polo'),
  ('1154130', 'SALVADOR (CAJAZEIRAS)', 'SALVADOR', 'BA', 'Polo'),
  ('1175538', 'SALVADOR (NORTE)', 'SALVADOR', 'BA', 'Polo'),
  ('1175539', 'SALVADOR (PITUBA)', 'SALVADOR', 'BA', 'Polo'),
  ('1176022', 'SANTA BÁRBARÁ D OESTE', 'SANTA BÁRBARÁ D OESTE', 'SP', 'Polo'),
  ('1164952', 'SANTA CRUZ CABRÁLIA', 'SANTA CRUZ CABRÁLIA', 'BA', 'Polo'),
  ('1175760', 'SANTA CRUZ DO CAPIBARIBE', 'SANTA CRUZ DO CAPIBARIBE', 'PE', 'Polo'),
  ('1130488', 'SANTA CRUZ DO RIO PARDO', 'SANTA CRUZ DO RIO PARDO', 'SP', 'Polo'),
  ('1175922', 'SANTA CRUZ DO SUL', 'SANTA CRUZ DO SUL', 'RS', 'Polo'),
  ('1142122', 'SANTA FÉ DE MINAS', 'SANTA FÉ DE MINAS', 'MG', 'Polo'),
  ('1159392', 'SANTA FÉ DO SUL', 'SANTA FÉ DO SUL', 'SP', 'Polo'),
  ('1168952', 'SANTA HELENA', 'SANTA HELENA', 'MA', 'Polo'),
  ('1175623', 'SANTA INÊS', 'SANTA INÊS', 'MA', 'Polo'),
  ('1168956', 'SANTA ISABEL', 'SANTA ISABEL', 'SP', 'Polo'),
  ('1130682', 'SANTA ISABEL DO IVAÍ', 'SANTA ISABEL DO IVAÍ', 'PR', 'Polo'),
  ('1159625', 'SANTA LUZIA', 'SANTA LUZIA', 'MG', 'Polo'),
  ('1130492', 'SANTA MARIA DO SUAÇUÍ', 'SANTA MARIA DO SUAÇUÍ', 'MG', 'Polo'),
  ('1168960', 'SANTA RITA', 'SANTA RITA', 'PB', 'Polo'),
  ('1154334', 'SANTA ROSA', 'SANTA ROSA', 'RS', 'Polo'),
  ('1175960', 'SANTA TEREZA DO TOCANTINS', 'SANTA TEREZA DO TOCANTINS', 'TO', 'Polo'),
  ('1142639', 'SANTA TEREZINHA DE ITAIPU', 'SANTA TEREZINHA DE ITAIPU', 'PR', 'Polo'),
  ('1184093', 'SANTA VITÓRIA DO PALMAR', 'SANTA VITÓRIA DO PALMAR', 'RS', 'Polo'),
  ('1168961', 'SANTALUZ', 'SANTALUZ', 'BA', 'Polo'),
  ('1157036', 'SANTANA (NOVA BRASÍLIA)', 'SANTANA', 'AP', 'Polo'),
  ('1130493', 'SANTANA', 'SANTANA', 'AP', 'Polo'),
  ('1159393', 'SANTANA DE PARNAÍBA', 'SANTANA DE PARNAÍBA', 'SP', 'Polo'),
  ('1159394', 'SANTANA DO ACARAÚ', 'SANTANA DO ACARAÚ', 'CE', 'Polo'),
  ('1175921', 'SANTANA DO LIVRAMENTO', 'SANTANA DO LIVRAMENTO', 'RS', 'Polo'),
  ('1168995', 'SANTO ANASTÁCIO', 'SANTO ANASTÁCIO', 'SP', 'Polo'),
  ('1159425', 'SANTO ÂNGELO', 'SANTO ÂNGELO', 'RS', 'Polo'),
  ('1175839', 'SANTO ANTÔNIO DA PLATINA (CENTRO)', 'SANTO ANTÔNIO DA PLATINA', 'PR', 'Polo'),
  ('1154133', 'SANTO ANTÔNIO DE JESUS', 'SANTO ANTÔNIO DE JESUS', 'BA', 'Polo'),
  ('1179561', 'SANTO ANTÔNIO DO IÇA', 'SANTO ANTÔNIO DO IÇA', 'AM', 'Polo'),
  ('1168996', 'SANTO ANTÔNIO DO LEVERGER', 'SANTO ANTÔNIO DO LEVERGER', 'MT', 'Polo'),
  ('1160787', 'SANTO ANTÔNIO DO PINHAL', 'SANTO ANTÔNIO DO PINHAL', 'SP', 'Polo'),
  ('1142123', 'SANTO ANTÔNIO DO SUDOESTE', 'SANTO ANTÔNIO DO SUDOESTE', 'PR', 'Polo'),
  ('1176024', 'SANTOS (ZONA NOROESTE)', 'SANTOS', 'SP', 'Polo'),
  ('1176023', 'SANTOS', 'SANTOS', 'SP', 'Polo'),
  ('1168998', 'SÃO BENTO DO SUL', 'SÃO BENTO DO SUL', 'SC', 'Polo'),
  ('1176026', 'SÃO BERNARDO DO CAMPO (ASSUNÇÃO)', 'SÃO BERNARDO DO CAMPO', 'SP', 'Polo'),
  ('1176025', 'SÃO BERNARDO DO CAMPO (CENTRO)', 'SÃO BERNARDO DO CAMPO', 'SP', 'Polo'),
  ('1154136', 'SÃO BORJA', 'SÃO BORJA', 'RS', 'Polo'),
  ('1143223', 'SÃO CAETANO DO SUL', 'SÃO CAETANO DO SUL', 'SP', 'Polo'),
  ('1142402', 'SÃO CARLOS', 'SÃO CARLOS', 'SP', 'Polo'),
  ('1154335', 'SÃO CRISTÓVÃO', 'SÃO CRISTÓVÃO', 'SE', 'Polo'),
  ('1159429', 'SÃO FRANCISCO DE PAULA', 'SÃO FRANCISCO DE PAULA', 'RS', 'Polo'),
  ('1175888', 'SÃO GONÇALO (CENTRO)', 'SÃO GONÇALO', 'RJ', 'Polo'),
  ('1160788', 'SÃO GOTARDO', 'SÃO GOTARDO', 'MG', 'Polo'),
  ('1154338', 'SÃO JOÃO DA BOA VISTA', 'SÃO JOÃO DA BOA VISTA', 'SP', 'Polo'),
  ('1154138', 'SÃO JOÃO DE MERITI', 'SÃO JOÃO DE MERITI', 'RJ', 'Polo'),
  ('1142125', 'SÃO JOÃO DEL REI', 'SÃO JOÃO DEL REI', 'MG', 'Polo'),
  ('1120664', 'SÃO JOÃO DO RIO DO PEIXE', 'SÃO JOÃO DO RIO DO PEIXE', 'PB', 'Polo'),
  ('1130495', 'SÃO JOÃO DOS PATOS', 'SÃO JOÃO DOS PATOS', 'MA', 'Polo'),
  ('1168999', 'SÃO JOAQUIM DA BARRA', 'SÃO JOAQUIM DA BARRA', 'SP', 'Polo'),
  ('1175954', 'SÃO JOSÉ', 'SÃO JOSÉ', 'SC', 'Polo'),
  ('1120666', 'SÃO JOSÉ DA LAPA', 'SÃO JOSÉ DA LAPA', 'MG', 'Polo'),
  ('1142404', 'SÃO JOSÉ DAS PIRANHAS', 'SÃO JOSÉ DAS PIRANHAS', 'PB', 'Polo'),
  ('1160071', 'SÃO JOSÉ DE MIPIBU', 'SÃO JOSÉ DE MIPIBU', 'RN', 'Polo'),
  ('1169000', 'SÃO JOSÉ DE RIBAMAR', 'SÃO JOSÉ DE RIBAMAR', 'MA', 'Polo'),
  ('1154353', 'SÃO JOSÉ DO RIO PRETO (ZONA SUL)', 'SÃO JOSÉ DO RIO PRETO', 'SP', 'Polo'),
  ('1179565', 'SÃO JOSÉ DOS CAMPOS (JUSCELINO KUBITSCHEK)', 'SÃO JOSÉ DOS CAMPOS', 'SP', 'Polo'),
  ('1160072', 'SÃO JOSÉ DOS CAMPOS (VILA ADYANNA)', 'SÃO JOSÉ DOS CAMPOS', 'SP', 'Polo'),
  ('1154140', 'SÃO JOSÉ DOS CAMPOS (ZONA LESTE)', 'SÃO JOSÉ DOS CAMPOS', 'SP', 'Polo'),
  ('1130498', 'SÃO JOSÉ DOS PINHAIS', 'SÃO JOSÉ DOS PINHAIS', 'PR', 'Polo'),
  ('1175924', 'SÃO LEOPOLDO', 'SÃO LEOPOLDO', 'RS', 'Polo'),
  ('1147781', 'SÃO LOURENÇO', 'SÃO LOURENÇO', 'MG', 'Polo'),
  ('1142991', 'SÃO LUÍS (AVENIDA DOS FRANCESES)', 'SÃO LUÍS', 'MA', 'Polo'),
  ('1169609', 'SÃO LUÍS DE MONTES BELOS', 'SÃO LUÍS DE MONTES BELOS', 'GO', 'Polo'),
  ('1169001', 'SÃO LUÍS DO QUITUNDE', 'SÃO LUÍS DO QUITUNDE', 'AL', 'Polo'),
  ('1169002', 'SÃO MANUEL', 'SÃO MANUEL', 'SP', 'Polo'),
  ('1130499', 'SÃO MARTINHO', 'SÃO MARTINHO', 'RS', 'Polo'),
  ('1175587', 'SÃO MATEUS (FÁTIMA)', 'SÃO MATEUS', 'ES', 'Polo'),
  ('1130500', 'SÃO MIGUEL DO GUAMÁ', 'SÃO MIGUEL DO GUAMÁ', 'PA', 'Polo'),
  ('1142405', 'SÃO MIGUEL DO IGUAÇU', 'SÃO MIGUEL DO IGUAÇU', 'PR', 'Polo'),
  ('1159232', 'SÃO MIGUEL DO OESTE', 'SÃO MIGUEL DO OESTE', 'SC', 'Polo'),
  ('1130502', 'SÃO PAULO (CIDADE TIRADENTES)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1176027', 'SÃO PAULO (FREGUESIA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1159431', 'SÃO PAULO (GRAJAÚ)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1130503', 'SÃO PAULO (IPIRANGA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1176028', 'SÃO PAULO (ITAQUERA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1154144', 'SÃO PAULO (MOOCA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1164956', 'SÃO PAULO (PENHA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1154149', 'SÃO PAULO (SANTO AMARO)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1164957', 'SÃO PAULO (SÃO MATEUS)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1130504', 'SÃO PAULO (SÃO MIGUEL PAULISTA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1164959', 'SÃO PAULO (SAPOPEMBA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1142994', 'SÃO PAULO(JABAQUARA)', 'SÃO PAULO', 'SP', 'Polo'),
  ('1160791', 'SÃO PEDRO', 'SÃO PEDRO', 'SP', 'Polo'),
  ('1175889', 'SÃO PEDRO DA ALDEIA', 'SÃO PEDRO DA ALDEIA', 'RJ', 'Polo'),
  ('1164960', 'SÃO PEDRO DO PIAUÍ', 'SÃO PEDRO DO PIAUÍ', 'PI', 'Polo'),
  ('1169615', 'SÃO SEBASTIÃO DO PARAÍSO', 'SÃO SEBASTIÃO DO PARAÍSO', 'MG', 'Polo'),
  ('1176029', 'SÃO VICENTE', 'SÃO VICENTE', 'SP', 'Polo'),
  ('1160792', 'SÃO VICENTE FERRER', 'SÃO VICENTE FERRER', 'MA', 'Polo'),
  ('1169610', 'SAPÉ', 'SAPÉ', 'PB', 'Polo'),
  ('1142642', 'SAPIRANGA', 'SAPIRANGA', 'RS', 'Polo'),
  ('1159233', 'SAPUCAIA DO SUL', 'SAPUCAIA DO SUL', 'RS', 'Polo'),
  ('1164961', 'SAQUAREMA', 'SAQUAREMA', 'RJ', 'Polo'),
  ('1142128', 'SARANDI', 'SARANDI', 'PR', 'Polo'),
  ('1154339', 'SENA MADUREIRA', 'SENA MADUREIRA', 'AC', 'Polo'),
  ('1169612', 'SENADOR CANEDO', 'SENADOR CANEDO', 'GO', 'Polo'),
  ('1154340', 'SENADOR GUIOMARD', 'SENADOR GUIOMARD', 'AC', 'Polo'),
  ('1142129', 'SENADOR JOSÉ PORFÍRIO', 'SENADOR JOSÉ PORFÍRIO', 'PA', 'Polo'),
  ('1164963', 'SENHOR DO BONFIM', 'SENHOR DO BONFIM', 'BA', 'Polo'),
  ('1142995', 'SERRA', 'SERRA', 'ES', 'Polo'),
  ('1169613', 'SERRA BRANCA', 'SERRA BRANCA', 'PB', 'Polo'),
  ('1147786', 'SERRA TALHADA', 'SERRA TALHADA', 'PE', 'Polo'),
  ('1154354', 'SERRINHA', 'SERRINHA', 'BA', 'Polo'),
  ('1176030', 'SERTÃOZINHO', 'SERTÃOZINHO', 'SP', 'Polo'),
  ('1175651', 'SETE LAGOAS', 'SETE LAGOAS', 'MG', 'Polo'),
  ('1168243', 'SIDROLÂNDIA', 'SIDROLÂNDIA', 'MS', 'Polo'),
  ('1154341', 'SIMÕES FILHO', 'SIMÕES FILHO', 'BA', 'Polo'),
  ('1175704', 'SINOP', 'SINOP', 'MT', 'Polo'),
  ('1160793', 'SOBRADINHO', 'SOBRADINHO', 'RS', 'Polo'),
  ('1130724', 'SOBRAL (PEDRINHAS)', 'SOBRAL', 'CE', 'Polo'),
  ('1120596', 'SOBRAL', 'SOBRAL', 'CE', 'Polo'),
  ('1175741', 'SOLÂNEA', 'SOLÂNEA', 'PB', 'Polo'),
  ('1160794', 'SOLEDADE', 'SOLEDADE', 'RS', 'Polo'),
  ('1169614', 'SOORETAMA', 'SOORETAMA', 'ES', 'Polo'),
  ('1177549', 'SORRISO', 'SORRISO', 'MT', 'Polo'),
  ('1169617', 'SOURE', 'SOURE', 'PA', 'Polo'),
  ('1168262', 'SOUSA', 'SOUSA', 'PB', 'Polo'),
  ('1142406', 'SUMARÉ', 'SUMARÉ', 'SP', 'Polo'),
  ('1175742', 'SUMÉ', 'SUMÉ', 'PB', 'Polo'),
  ('1120592', 'Suzano', 'Suzano', 'SP', 'Polo'),
  ('1130725', 'TABAPUÃ', 'TABAPUÃ', 'SP', 'Polo'),
  ('1154154', 'TABOÃO DA SERRA', 'TABOÃO DA SERRA', 'SP', 'Polo'),
  ('1154358', 'TAILÂNDIA', 'TAILÂNDIA', 'PA', 'Polo'),
  ('1130684', 'TAMARANA', 'TAMARANA', 'PR', 'Polo'),
  ('1177563', 'TANGARÁ DA SERRA', 'TANGARÁ DA SERRA', 'MT', 'Polo'),
  ('1169618', 'TAPEJARA', 'TAPEJARA', 'PR', 'Polo'),
  ('1142643', 'TAQUARA', 'TAQUARA', 'RS', 'Polo'),
  ('1165185', 'TAQUARITUBA', 'TAQUARITUBA', 'SP', 'Polo'),
  ('1169620', 'TARUMÃ', 'TARUMÃ', 'SP', 'Polo'),
  ('1159433', 'TATUÍ', 'TATUÍ', 'SP', 'Polo'),
  ('1130509', 'TAUÁ', 'TAUÁ', 'CE', 'Polo'),
  ('1176031', 'TAUBATÉ', 'TAUBATÉ', 'SP', 'Polo'),
  ('1143229', 'TEFÉ', 'TEFÉ', 'AM', 'Polo'),
  ('1143230', 'TEIXEIRA DE FREITAS', 'TEIXEIRA DE FREITAS', 'BA', 'Polo'),
  ('1175840', 'TELÊMACO BORBA', 'TELÊMACO BORBA', 'PR', 'Polo'),
  ('1130511', 'TEODORO SAMPAIO', 'TEODORO SAMPAIO', 'SP', 'Polo'),
  ('1160074', 'TEÓFILO OTONI', 'TEÓFILO OTONI', 'MG', 'Polo'),
  ('1175762', 'TERESINA (CENTRO SUL)', 'TERESINA', 'PI', 'Polo'),
  ('1130726', 'TERESINA (PARQUE PIAUÍ)', 'TERESINA', 'PI', 'Polo'),
  ('1175890', 'TERESÓPOLIS', 'TERESÓPOLIS', 'RJ', 'Polo'),
  ('1175841', 'TERRA RICA', 'TERRA RICA', 'PR', 'Polo'),
  ('1130512', 'TIANGUÁ', 'TIANGUÁ', 'CE', 'Polo'),
  ('1169621', 'TIETÊ', 'TIETÊ', 'SP', 'Polo'),
  ('1160075', 'TIJUCAS', 'TIJUCAS', 'SC', 'Polo'),
  ('1160076', 'TIJUCAS DO SUL', 'TIJUCAS DO SUL', 'PR', 'Polo'),
  ('1130728', 'TIMBÓ', 'TIMBÓ', 'SC', 'Polo'),
  ('1175842', 'TOLEDO', 'TOLEDO', 'PR', 'Polo'),
  ('1130731', 'TOMBOS', 'TOMBOS', 'MG', 'Polo'),
  ('1160077', 'TOMÉ-AÇÚ', 'TOMÉ-AÇÚ', 'PA', 'Polo'),
  ('1169622', 'TORITAMA', 'TORITAMA', 'PE', 'Polo'),
  ('1169623', 'TOUROS', 'TOUROS', 'RN', 'Polo'),
  ('1142408', 'TRAJANO DE MORAIS', 'TRAJANO DE MORAIS', 'RJ', 'Polo'),
  ('1154346', 'TRAMANDAÍ', 'TRAMANDAÍ', 'RS', 'Polo'),
  ('1159629', 'TRÊS CORAÇÕES', 'TRÊS CORAÇÕES', 'MG', 'Polo'),
  ('1130735', 'TRÊS LAGOAS', 'TRÊS LAGOAS', 'MS', 'Polo'),
  ('1175652', 'TRÊS PONTAS', 'TRÊS PONTAS', 'MG', 'Polo'),
  ('1175891', 'TRÊS RIOS', 'TRÊS RIOS', 'RJ', 'Polo'),
  ('1159235', 'TRINDADE', 'TRINDADE', 'GO', 'Polo'),
  ('1165191', 'TRINDADE', 'TRINDADE', 'PE', 'Polo'),
  ('1142646', 'TUBARÃO', 'TUBARÃO', 'SC', 'Polo'),
  ('1176644', 'TUCURUÍ', 'TUCURUÍ', 'PA', 'Polo'),
  ('1147791', 'TUPÃ', 'TUPÃ', 'SP', 'Polo'),
  ('1175653', 'UBÁ', 'UBÁ', 'MG', 'Polo'),
  ('1175654', 'UBERABA (COPACABANA)', 'UBERABA', 'MG', 'Polo'),
  ('1175655', 'UBERLÂNDIA', 'UBERLÂNDIA', 'MG', 'Polo'),
  ('1154373', 'UBIRATÃ', 'UBIRATÃ', 'PR', 'Polo'),
  ('1164965', 'UCHOA', 'UCHOA', 'SP', 'Polo'),
  ('1154347', 'UMBUZEIRO', 'UMBUZEIRO', 'PB', 'Polo'),
  ('1154374', 'UNIÃO', 'UNIÃO', 'PI', 'Polo'),
  ('1132486', 'UNIÃO DA VITÓRIA (CENTRO)', 'UNIÃO DA VITÓRIA', 'PR', 'Polo'),
  ('1169625', 'UNIÃO DOS PALMARES', 'UNIÃO DOS PALMARES', 'AL', 'Polo'),
  ('1082494', 'Unidade SEDE BR', null, null, 'Sede'),
  ('1130741', 'URUAÇU', 'URUAÇU', 'GO', 'Polo'),
  ('1154158', 'URUGUAIANA', 'URUGUAIANA', 'RS', 'Polo'),
  ('1159236', 'VACARIA', 'VACARIA', 'RS', 'Polo'),
  ('1165192', 'VALENÇA', 'VALENÇA', 'RJ', 'Polo'),
  ('1169626', 'VALENTE', 'VALENTE', 'BA', 'Polo'),
  ('1154161', 'VALINHOS', 'VALINHOS', 'SP', 'Polo'),
  ('1176032', 'VALPARAÍSO', 'VALPARAÍSO', 'SP', 'Polo'),
  ('1142409', 'VALPARAÍSO DE GOIÁS (BR CENTER SHOP)', 'VALPARAÍSO DE GOIÁS', 'GO', 'Polo'),
  ('1176033', 'VARGEM GRANDE DO SUL (JARDIM FORTALEZA)', 'VARGEM GRANDE DO SUL', 'SP', 'Polo'),
  ('1175706', 'VÁRZEA GRANDE', 'VÁRZEA GRANDE', 'MT', 'Polo'),
  ('1159237', 'VENÂNCIO AIRES', 'VENÂNCIO AIRES', 'RS', 'Polo'),
  ('1130743', 'VESPASIANO', 'VESPASIANO', 'MG', 'Polo'),
  ('1142668', 'VIAMÃO', 'VIAMÃO', 'RS', 'Polo'),
  ('1175589', 'VILA VELHA', 'VILA VELHA', 'ES', 'Polo'),
  ('1175912', 'VILHENA', 'VILHENA', 'RO', 'Polo'),
  ('1143240', 'VIRGINÓPOLIS', 'VIRGINÓPOLIS', 'MG', 'Polo'),
  ('1160078', 'VISEU', 'VISEU', 'PA', 'Polo'),
  ('1154200', 'VITÓRIA DE SANTO ANTÃO (BELA VISTA)', 'VITÓRIA DE SANTO ANTÃO', 'PE', 'Polo'),
  ('1130746', 'VITÓRIA DE SANTO ANTÃO', 'VITÓRIA DE SANTO ANTÃO', 'PE', 'Polo'),
  ('1164986', 'VOTORANTIM', 'VOTORANTIM', 'SP', 'Polo'),
  ('1160079', 'VOTUPORANGA', 'VOTUPORANGA', 'SP', 'Polo')
on conflict (codigo_sispro) do update
   set nome   = excluded.nome,
       cidade = coalesce(polos.cidade, excluded.cidade),
       uf     = coalesce(polos.uf, excluded.uf),
       tipo   = coalesce(polos.tipo, excluded.tipo),
       ativo  = true;


-- ---------------------------------------------------------------------------
-- 4. O analista define as filiais
--
-- Um `null` limpa o campo de propósito: o analista pode ter marcado o polo
-- errado e querer voltar ao vazio em vez de escolher outro qualquer.
-- ---------------------------------------------------------------------------
create or replace function erp_definir_filiais(
  p_id           uuid,
  p_captacao_id  uuid default null,
  p_praticas_id  uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_nome text;
begin
  if not exists (select 1 from candidatos where id = p_id) then
    raise exception 'Candidato não encontrado' using errcode = 'P0002';
  end if;
  if p_captacao_id is not null
     and not exists (select 1 from polos where id = p_captacao_id and ativo) then
    raise exception 'Filial de captação inválida' using errcode = '22023';
  end if;
  if p_praticas_id is not null
     and not exists (select 1 from polos where id = p_praticas_id and ativo) then
    raise exception 'Filial de práticas inválida' using errcode = '22023';
  end if;

  update candidatos
     set polo_id = p_captacao_id, polo_praticas_id = p_praticas_id
   where id = p_id
  returning nome into v_nome;

  return jsonb_build_object('ok', true, 'candidato', v_nome);
end;
$fn$;

revoke all on function erp_definir_filiais(uuid, uuid, uuid) from public;
grant execute on function erp_definir_filiais(uuid, uuid, uuid) to anon;


-- ---------------------------------------------------------------------------
-- 5. As funções que falavam "dispensar"
--
-- Os corpos abaixo são as definições VIVAS do banco com a troca de vocabulário
-- aplicada — não foram reescritas de memória. `erp_candidato` ganha, além
-- disso, a filial de práticas.
-- ---------------------------------------------------------------------------
create or replace function erp_candidato(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select to_jsonb(x) from (
    select c.id, c.protocolo, c.nome, c.cpf, c.rg, c.nascimento, c.sexo,
           r.nome as raca, c.email, c.ddd, c.telefone,
           c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
           c.uf_naturalidade, c.municipio_naturalidade,
           e.nome as escolaridade, c.ano_conclusao_em,
           rotulo_do_curso(c.curso_id) as curso,
           cu.area_conhecimento, cu.tipo_formacao, cu.modalidade, cu.duracao,
           po.nome as polo, po.cidade as polo_cidade, po.uf as polo_uf, po.tipo as polo_tipo,
           pp.nome as polo_praticas, pp.cidade as polo_praticas_cidade,
           pp.uf as polo_praticas_uf, pp.tipo as polo_praticas_tipo,
           c.polo_id, c.polo_praticas_id,
           pl.nome as plano_pagamento,
           c.aceite_cota, c.created_at, c.updated_at,
           i.status::text as status, i.modalidade_concorrencia as cota, i.chamada,
           cc.nome as concurso, ps.nome as processo_seletivo,
           (select count(*) from membros_grupo_familiar m where m.candidato_id = c.id) as familiares
      from candidatos c
      left join racas r on r.codigo = c.raca_codigo
      left join escolaridades e on e.codigo = c.escolaridade_codigo
      left join cursos cu on cu.id = c.curso_id
      left join polos po on po.id = c.polo_id
      left join polos pp on pp.id = c.polo_praticas_id
      left join planos_pagamento pl on pl.id = c.plano_pagamento_id
      left join inscricoes i on i.candidato_id = c.id
      left join concursos cc on cc.id = i.concurso_id
      left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
     where c.id = p_id
  ) x;
$fn$;

create or replace function erp_situacao_matricula(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'candidato_id',    c.id,
    'inscricao_id',    i.id,
    'nome',            c.nome,
    'cpf',             c.cpf,
    'curso',           rotulo_do_curso(c.curso_id),
    'polo',            po.nome,
    'chamada',         i.chamada,
    'tipo_bolsa',      coalesce(i.tipo_bolsa, 'BOLSA INTEGRAL'),
    'status',          coalesce(i.status::text, 'Inscrito'),
    'fluxo',           coalesce(i.fluxo::text, 'nao_definido'),
    'matriculado_wae', i.matriculado_wae,
    'matriculado_em',  i.matriculado_em,
    'matriculado_por', i.matriculado_por,
    'ra_wae',          i.ra_wae,
    'negado_em',   i.negado_em,
    'negado_por',  i.negado_por,
    'negacao_motivo', i.negacao_motivo,
    'coletas_total',     (select count(*) from gendocs_grupos g
                            join gendocs_participantes gp on gp.grupo_id = g.id
                            join gendocs_coletas ct on ct.participante_id = gp.id
                           where g.candidato_id = c.id),
    'coletas_pendentes', coletas_pendentes_do_candidato(c.id),
    -- Sem inscrição não há o que matricular; sem coleta nenhuma, "todas
    -- finalizadas" seria verdadeiro por vacuidade — e não é o que se quer.
    'pode_matricular', (
      i.id is not null
      and coalesce(i.status::text, 'Inscrito') not in ('Matriculado', 'Negado')
      and (select count(*) from gendocs_grupos g
             join gendocs_participantes gp on gp.grupo_id = g.id
             join gendocs_coletas ct on ct.participante_id = gp.id
            where g.candidato_id = c.id) > 0
      and jsonb_array_length(coletas_pendentes_do_candidato(c.id)) = 0))
    from candidatos c
    left join lateral (
      select * from inscricoes i0
       where i0.candidato_id = c.id
       order by i0.created_at desc, i0.id
       limit 1
    ) i on true
    left join polos po on po.id = c.polo_id
   where c.id = p_id;
$fn$;

create or replace function erp_matricular(p_id uuid, p_fluxo text, p_operador text DEFAULT 'Secretaria'::text)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_inscricao  uuid;
  v_status     text;
  v_cpf        text;
  v_pendentes  jsonb;
  v_ra         text;
begin
  if p_fluxo not in ('aluno_novo', 'ja_matriculado') then
    raise exception 'Fluxo inválido: % (esperado aluno_novo ou ja_matriculado)', p_fluxo
      using errcode = '22023';
  end if;

  select i.id, i.status::text, c.cpf into v_inscricao, v_status, v_cpf
    from candidatos c
    left join lateral (
      select * from inscricoes i0
       where i0.candidato_id = c.id
       order by i0.created_at desc, i0.id
       limit 1
    ) i on true
   where c.id = p_id;

  if v_cpf is null then
    raise exception 'Candidato não encontrado' using errcode = 'P0002';
  end if;
  if v_inscricao is null then
    raise exception 'Este candidato não tem inscrição em concurso nenhum' using errcode = 'P0002';
  end if;
  if v_status = 'Matriculado' then
    return jsonb_build_object('ok', false, 'motivo', 'Este candidato já está matriculado');
  end if;
  if v_status = 'Negado' then
    return jsonb_build_object('ok', false, 'motivo', 'Este candidato foi negado');
  end if;

  v_pendentes := coletas_pendentes_do_candidato(p_id);
  if jsonb_array_length(v_pendentes) > 0 then
    return jsonb_build_object('ok', false, 'pendentes', v_pendentes,
      'motivo', 'A matrícula só é liberada com todas as coletas finalizadas');
  end if;

  v_ra := demo_ra_wae(v_cpf);

  update inscricoes
     set status          = 'Matriculado',
         fluxo           = p_fluxo::fluxo_pos_analise,
         matriculado_wae = (p_fluxo = 'ja_matriculado'),
         matriculado_em  = now(),
         matriculado_por = p_operador,
         ra_wae          = v_ra,
         negado_em   = null,
         negado_por  = null,
         negacao_motivo = null
   where id = v_inscricao;

  return jsonb_build_object('ok', true, 'fluxo', p_fluxo, 'ra', v_ra,
    'matriculado_em', now());
end;
$fn$;

create or replace function erp_negar_candidato(p_id uuid, p_motivo text DEFAULT NULL::text, p_operador text DEFAULT 'Secretaria'::text)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_inscricao uuid; v_status text;
begin
  select i.id, i.status::text into v_inscricao, v_status
    from candidatos c
    left join lateral (
      select * from inscricoes i0
       where i0.candidato_id = c.id
       order by i0.created_at desc, i0.id
       limit 1
    ) i on true
   where c.id = p_id;

  if v_inscricao is null then
    raise exception 'Inscrição não encontrada para este candidato' using errcode = 'P0002';
  end if;
  if v_status = 'Matriculado' then
    return jsonb_build_object('ok', false,
      'motivo', 'Este candidato já está matriculado — a matrícula precisa ser desfeita antes');
  end if;

  update inscricoes
     set status          = 'Negado',
         negado_em   = now(),
         negado_por  = p_operador,
         negacao_motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   where id = v_inscricao;

  return jsonb_build_object('ok', true, 'negado_em', now());
end;
$fn$;

create or replace function demo_reabrir_inscricao(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_inscricao uuid;
begin
  select i.id into v_inscricao from inscricoes i
   where i.candidato_id = p_id order by i.created_at desc, i.id limit 1;
  if v_inscricao is null then
    raise exception 'Inscrição não encontrada' using errcode = 'P0002';
  end if;

  update inscricoes
     set status = 'Em análise', fluxo = 'nao_definido', matriculado_wae = null,
         matriculado_em = null, matriculado_por = null, ra_wae = null,
         negado_em = null, negado_por = null, negacao_motivo = null
   where id = v_inscricao;

  return jsonb_build_object('ok', true);
end;
$fn$;

revoke all on function erp_negar_candidato(uuid, text, text) from public;
grant execute on function erp_negar_candidato(uuid, text, text) to anon;
grant execute on function erp_candidato(uuid)                  to anon;
grant execute on function erp_situacao_matricula(uuid)         to anon;
grant execute on function erp_matricular(uuid, text, text)     to anon;
grant execute on function demo_reabrir_inscricao(uuid)         to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_polos    int;
  v_sem_uf   int;
  v_sedes    int;
  v_rotulo   int;
  v_col      int;
  v_cand     uuid;
begin
  select count(*) into v_polos from polos where ativo;
  select count(*) into v_sem_uf from polos where ativo and uf is null;
  select count(*) into v_sedes from polos where codigo_sispro in ('659920', '1061130')
     and cidade = 'Paranavaí' and uf = 'PR';

  select count(*) into v_rotulo
    from pg_enum e join pg_type t on t.oid = e.enumtypid
   where t.typname = 'status_candidato' and e.enumlabel = 'Negado';

  select count(*) into v_col from information_schema.columns
   where table_name = 'candidatos' and column_name = 'polo_praticas_id';

  if v_polos < 938 then
    raise exception 'Esperados ao menos 938 polos ativos, há %', v_polos;
  end if;
  if v_sedes <> 2 then
    raise exception 'As duas sedes de Paranavaí perderam cidade/UF no upsert';
  end if;
  if v_rotulo <> 1 then
    raise exception 'O rótulo Negado não existe em status_candidato';
  end if;
  if v_col <> 1 then
    raise exception 'A coluna polo_praticas_id não foi criada';
  end if;

  -- As funções renomeadas precisam responder.
  select id into v_cand from candidatos limit 1;
  if v_cand is not null and erp_situacao_matricula(v_cand) is null then
    raise exception 'erp_situacao_matricula devolveu nulo depois da renomeação';
  end if;

  raise notice '% polos ativos (% sem UF); vocabulário: Negado', v_polos, v_sem_uf;
end;
$blk$;
