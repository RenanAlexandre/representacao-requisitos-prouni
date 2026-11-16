-- ============================================================================
-- Processo Seletivo ProUni — UniFatecie
-- Carga inicial. Executar depois de 01-schema.sql.
--
-- As tabelas de domínio trazem dados REAIS, extraídos dos arquivos do ProUni.
-- O candidato de demonstração é FICTÍCIO e existe só para o protótipo ter um
-- caminho completo para percorrer.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Raças — categorias do IBGE, as usadas pelo ProUni
-- ---------------------------------------------------------------------------
insert into racas (codigo, nome, ppi, ordem) values
  ('branca',        'Branca',        false, 1),
  ('preta',         'Preta',         true,  2),
  ('parda',         'Parda',         true,  3),
  ('amarela',       'Amarela',       false, 4),
  ('indigena',      'Indígena',      true,  5),
  ('nao_declarado', 'Não declarado', false, 6);

-- ---------------------------------------------------------------------------
-- Parentescos — as opções do menu suspenso do portal
-- ---------------------------------------------------------------------------
insert into parentescos (codigo, nome, ordem) values
  ('marido',  'Marido',    1),
  ('esposa',  'Esposa',    2),
  ('pai',     'Pai',       3),
  ('mae',     'Mãe',       4),
  ('irmao',   'Irmã(o)',   5),
  ('tio',     'Tio(a)',    6),
  ('primo',   'Primo(a)',  7),
  ('avo_m',   'Avô',       8),
  ('avo_f',   'Avó',       9);

-- ---------------------------------------------------------------------------
-- Escolaridades
-- ---------------------------------------------------------------------------
insert into escolaridades (codigo, nome, ordem) values
  ('em_completo',    'Ensino Médio completo',                          1),
  ('em_cursando',    'Ensino Médio incompleto (cursando o 3º ano)',    2),
  ('em_eja',         'Ensino Médio — EJA / Supletivo',                 3),
  ('em_enem',        'Certificação de conclusão pelo ENEM',            4),
  ('superior_inc',   'Ensino Superior incompleto',                     5),
  ('superior_comp',  'Ensino Superior completo',                       6);

-- ---------------------------------------------------------------------------
-- Polos (Locais de Oferta do ProUni)
--
-- REAIS. `1061130 CAMPUS SANEPAR` é o "Local de Oferta" do cabeçalho de
-- "RELATÓRIO PROUNI 1 E 2 OP.xls"; `659920 CAMPUS GETÚLIO` vem das colunas
-- CODIGO CAMPUS / NOME CAMPUS de "LISTA DE ESPERA 26.1.xls".
--
-- ATENÇÃO: são os dois que os arquivos comprovam. Se a UniFatecie oferta o
-- ProUni em outros locais, complete a lista pelo Sispro antes de usar.
-- ---------------------------------------------------------------------------
insert into polos (codigo_sispro, nome, cidade, uf, tipo) values
  ('1061130', 'CAMPUS SANEPAR', 'Paranavaí', 'PR', 'Sede'),
  ('659920',  'CAMPUS GETÚLIO', 'Paranavaí', 'PR', 'Sede');

-- ---------------------------------------------------------------------------
-- Cursos
--
-- Códigos e nomes REAIS, extraídos dos dois arquivos do ProUni.
-- Educação Física aparece com dois códigos (1365559 e 1397028): são duas
-- ofertas distintas do MEC — a divisão entre Licenciatura e Bacharelado abaixo
-- é INFERÊNCIA e precisa ser confirmada no e-MEC.
-- `area_conhecimento` também é inferência; o ERP usa uma taxonomia própria
-- (o print mostra 'SAÚDE E BEM-ESTAR').
-- ---------------------------------------------------------------------------
insert into cursos (codigo_mec, nome, tipo_formacao, modalidade, area_conhecimento) values
  ('1178816', 'ADMINISTRAÇÃO',            'Bacharelado',  'Presencial', 'NEGÓCIOS E GESTÃO'),
  ('1260717', 'ENGENHARIA CIVIL',         'Bacharelado',  'Presencial', 'ENGENHARIAS E PRODUÇÃO'),
  ('1322579', 'PSICOLOGIA',               'Bacharelado',  'Presencial', 'SAÚDE E BEM-ESTAR'),
  ('1322623', 'AGRONOMIA',                'Bacharelado',  'Presencial', 'CIÊNCIAS AGRÁRIAS'),
  ('1365555', 'ODONTOLOGIA',              'Bacharelado',  'Presencial', 'SAÚDE E BEM-ESTAR'),
  ('1365559', 'EDUCAÇÃO FÍSICA',          'Licenciatura', 'Presencial', 'SAÚDE E BEM-ESTAR'),
  ('1385214', 'DIREITO',                  'Bacharelado',  'Presencial', 'CIÊNCIAS JURÍDICAS'),
  ('1395825', 'ARQUITETURA E URBANISMO',  'Bacharelado',  'Presencial', 'ENGENHARIAS E PRODUÇÃO'),
  ('1397028', 'EDUCAÇÃO FÍSICA',          'Bacharelado',  'Presencial', 'SAÚDE E BEM-ESTAR'),
  ('1454466', 'ESTÉTICA E COSMÉTICA',     'Tecnólogo',    'Presencial', 'SAÚDE E BEM-ESTAR'),
  ('1541970', 'FISIOTERAPIA',             'Bacharelado',  'Presencial', 'SAÚDE E BEM-ESTAR');

-- ---------------------------------------------------------------------------
-- Planos de pagamento
--
-- No ProUni o plano depende do tipo de bolsa concedido na pré-seleção.
-- ---------------------------------------------------------------------------
insert into planos_pagamento (nome, tipo_bolsa, percentual, parcelas, forma, dia_vencimento, ordem) values
  ('Bolsa Integral (100%) — sem mensalidade',        'BOLSA INTEGRAL', 100, null, null,                null, 1),
  ('Bolsa Parcial (50%) — Boleto, vencimento dia 5', 'BOLSA PARCIAL',   50,   12, 'Boleto',              5, 2),
  ('Bolsa Parcial (50%) — Boleto, vencimento dia 10','BOLSA PARCIAL',   50,   12, 'Boleto',             10, 3),
  ('Bolsa Parcial (50%) — Boleto, vencimento dia 20','BOLSA PARCIAL',   50,   12, 'Boleto',             20, 4),
  ('Bolsa Parcial (50%) — Cartão recorrente',        'BOLSA PARCIAL',   50,   12, 'Cartão recorrente', null, 5),
  ('Bolsa Parcial (50%) — Pix mensal',               'BOLSA PARCIAL',   50,   12, 'Pix',               null, 6);


-- ===========================================================================
-- Módulos do GenDocs — 1ª Chamada 2026.1
--
-- Quatro módulos, um por perfil de participante. A janela segue o exemplo da
-- seção 3.4 dos requisitos (01/05 a 31/05).
-- ===========================================================================
insert into modulos_gendocs
  (codigo_externo, slug, nome, descricao, perfil, chamada,
   envio_inicio, envio_fim, situacao, link_preenchimento)
values
  ('34534', 'prouni-2026-1-titular-cotista',
   'ProUni 2026.1 — Titular cotista',
   'Coleta documental dos candidatos pré-selecionados que se declararam cotistas.',
   'titular_cotista', '2026.1 — 1ª Chamada',
   date '2026-05-01', date '2026-05-31', 'Iniciado',
   'https://app.gendocs.com.br/fill/prouni-2026-1-titular-cotista'),

  (null, 'prouni-2026-1-titular-sem-cota',
   'ProUni 2026.1 — Titular sem cota',
   'Coleta documental dos candidatos pré-selecionados em ampla concorrência.',
   'titular_sem_cota', '2026.1 — 1ª Chamada',
   date '2026-05-01', date '2026-05-31', 'Iniciado',
   'https://app.gendocs.com.br/fill/prouni-2026-1-titular-sem-cota'),

  (null, 'prouni-2026-1-familiar-maior',
   'ProUni 2026.1 — Familiar maior de idade',
   'Coleta documental dos membros do grupo familiar com 18 anos ou mais.',
   'familiar_maior', '2026.1 — 1ª Chamada',
   date '2026-05-01', date '2026-05-31', 'Iniciado',
   'https://app.gendocs.com.br/fill/prouni-2026-1-familiar-maior'),

  (null, 'prouni-2026-1-familiar-menor',
   'ProUni 2026.1 — Familiar menor de idade',
   'Coleta documental dos membros do grupo familiar com menos de 18 anos.',
   'familiar_menor', '2026.1 — 1ª Chamada',
   date '2026-05-01', date '2026-05-31', 'Iniciado',
   'https://app.gendocs.com.br/fill/prouni-2026-1-familiar-menor');

-- SLAs, iguais nos quatro módulos.
insert into modulos_sla (modulo_id, status, horas)
select m.id, s.status, s.horas
  from modulos_gendocs m,
  (values ('nova'::status_coleta, 24), ('aberta', 72), ('progresso', 72),
          ('recebida', 48), ('finalizada', 0)) as s(status, horas)
 where m.chamada = '2026.1 — 1ª Chamada';

-- ---------------------------------------------------------------------------
-- Listas documentais — seção 3.3.1 dos requisitos, repartida por perfil
--
-- Titular sem cota: os 12 itens que não dependem de cota.
-- Titular cotista:  os mesmos + a Declaração de Raça e Cor.
-- Familiar maior:   identificação, estado civil, CTPS, renda e IR.
-- Familiar menor:   certidão de nascimento, CPF e ausência de renda.
-- ---------------------------------------------------------------------------

-- Base comum aos dois módulos de titular.
insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, substituicoes)
select m.id, d.seq, d.nome, d.obrig, d.subs
  from modulos_gendocs m,
  (values
    (1,  'Ficha de Inscrição do ProUni (2 páginas)', true, '{}'::text[]),
    (2,  'RG — frente e verso no mesmo arquivo', true, '{CNH}'::text[]),
    (3,  'CPF', true, '{CNH}'::text[]),
    (4,  'Comprovante de Estado Civil', true,
         '{"Certidão de Nascimento","Certidão de Casamento","União Estável","Averbação de Divórcio","Certidão de Óbito"}'::text[]),
    (5,  'Comprovante de Residência', true, '{"Declaração de Imóvel Cedido"}'::text[]),
    (6,  'Histórico Escolar do Ensino Médio + Certificado', true, '{"Declaração da Escola"}'::text[]),
    (7,  'Carteira de Trabalho (CTPS Digital)', true, '{"Declaração de situação"}'::text[]),
    (8,  'Comprovante de Renda', true,
         '{Holerites,Contracheques,"SIMEI / DECORE","Extratos INSS","Nota de Produtor","Ausência de Renda"}'::text[]),
    (9,  'Declaração de Imposto de Renda', true, '{"Certidão Negativa da Receita"}'::text[]),
    (10, 'Declaração de Encerramento de Matrícula', false, '{}'::text[]),
    (11, 'Declaração de Encerramento de Bolsa ProUni / FIES', false, '{}'::text[]),
    (12, 'CNH', false, '{}'::text[])
  ) as d(seq, nome, obrig, subs)
 where m.perfil in ('titular_cotista', 'titular_sem_cota')
   and m.chamada = '2026.1 — 1ª Chamada';

-- O item que só o módulo cotista exige.
insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, orientacao)
select m.id, 13, 'Declaração de Raça e Cor', true,
       'Exigida de quem declarou cota PPI (preta, parda ou indígena) na inscrição.'
  from modulos_gendocs m
 where m.perfil = 'titular_cotista' and m.chamada = '2026.1 — 1ª Chamada';

insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, substituicoes)
select m.id, d.seq, d.nome, d.obrig, d.subs
  from modulos_gendocs m,
  (values
    (1, 'RG — frente e verso no mesmo arquivo', true, '{CNH}'::text[]),
    (2, 'CPF', true, '{CNH}'::text[]),
    (3, 'Comprovante de Estado Civil', true,
        '{"Certidão de Nascimento","Certidão de Casamento","União Estável","Averbação de Divórcio","Certidão de Óbito"}'::text[]),
    (4, 'Carteira de Trabalho (CTPS Digital)', true, '{"Declaração de situação"}'::text[]),
    (5, 'Comprovante de Renda', true,
        '{Holerites,Contracheques,"SIMEI / DECORE","Extratos INSS","Nota de Produtor","Ausência de Renda"}'::text[]),
    (6, 'Declaração de Imposto de Renda', true, '{"Certidão Negativa da Receita"}'::text[])
  ) as d(seq, nome, obrig, subs)
 where m.perfil = 'familiar_maior' and m.chamada = '2026.1 — 1ª Chamada';

insert into documentos_exigidos (modulo_id, sequencia, nome, obrigatorio, substituicoes)
select m.id, d.seq, d.nome, d.obrig, d.subs
  from modulos_gendocs m,
  (values
    (1, 'Certidão de Nascimento', true, '{}'::text[]),
    (2, 'CPF', true, '{}'::text[]),
    (3, 'Declaração de Ausência de Renda', true, '{}'::text[])
  ) as d(seq, nome, obrig, subs)
 where m.perfil = 'familiar_menor' and m.chamada = '2026.1 — 1ª Chamada';


-- ===========================================================================
-- Processo seletivo e concurso
--
-- O TESTEGRAD e o concurso CENTRO EDUCACIONAL FATECIE LTDA são exatamente os
-- do ambiente de referência do ERP (prints e HTMLs salvos), inclusive o
-- "Módulo do GenDocs = 34534" que liga os dois sistemas.
--
-- Havia aqui um segundo processo/concurso fictício ("PROUNI 2026.1" /
-- "PROUNI 2026.1 — 1ª CHAMADA", codigo_erp '700'/'113') criado só pra
-- demonstrar o vínculo com um módulo do GenDocs. Removido em 2026-08-26
-- (ver BRIEFING-IA.md, seção 13): os processos reais PROUNI S/COTA e
-- PROUNI C/COTA (período 2027.1) cumprem esse papel agora — mas eles foram
-- criados direto no banco de produção do usuário, não fazem parte deste
-- seed. Rodar este arquivo do zero recria TESTEGRAD + o candidato de
-- demonstração, não os dois processos ProUni reais.
-- ===========================================================================
insert into processos_seletivos
  (codigo_erp, nome, codigo, periodo_letivo, nivel_ensino, edital, ativo)
values
  ('654', 'TESTEGRAD', 'TESGRAD', '2027.1', 'Graduação', 'EDT/IMPORTACAO-WAE', false);

insert into concursos
  (codigo_erp, processo_seletivo_id, nome, tipo, origem, inicio, fim,
   requer_prova, modulo_gendocs_id, tipo_classificacao, data_vestibular,
   provas_publicadas, resultado_publicado, exibir_requerimento, ativo)
select '112', ps.id, 'CENTRO EDUCACIONAL FATECIE LTDA', 'Vestibular', 'Sede',
       timestamptz '2026-12-22 00:00-03', timestamptz '2027-01-01 00:00-03',
       false, m.id, 'Não há', timestamptz '2026-12-22 00:00-03',
       false, false, false, true
  from processos_seletivos ps, modulos_gendocs m
 where ps.codigo_erp = '654' and m.codigo_externo = '34534';

-- ---------------------------------------------------------------------------
-- Ofertas do concurso do TESTEGRAD
--
-- Curso × polo × turno, com o valor de oferta. Os TURNOS são reais (vêm da
-- coluna Turno do relatório de pré-selecionados). Os VALORES abaixo são
-- ESPAÇO RESERVADO — substitua pela tabela de preços vigente. Reatribuídas
-- do concurso ProUni fictício removido acima para o do TESTEGRAD, que é o
-- que sobrou de real neste seed.
-- ---------------------------------------------------------------------------
insert into ofertas (concurso_id, curso_id, polo_id, turno, tipo_bolsa, valor_oferta)
select cc.id, cu.id, p.id, o.turno, o.bolsa, o.valor
  from concursos cc, polos p,
  (values
    ('1178816', 'NOTURNO',  'BOLSA INTEGRAL', 720.00),
    ('1260717', 'NOTURNO',  'BOLSA INTEGRAL', 980.00),
    ('1322579', 'NOTURNO',  'BOLSA INTEGRAL', 1150.00),
    ('1322623', 'NOTURNO',  'BOLSA INTEGRAL', 980.00),
    ('1365555', 'NOTURNO',  'BOLSA INTEGRAL', 2400.00),
    ('1365559', 'NOTURNO',  'BOLSA INTEGRAL', 690.00),
    ('1385214', 'MATUTINO', 'BOLSA INTEGRAL', 1100.00),
    ('1385214', 'NOTURNO',  'BOLSA INTEGRAL', 1100.00),
    ('1395825', 'NOTURNO',  'BOLSA INTEGRAL', 1250.00),
    ('1397028', 'NOTURNO',  'BOLSA INTEGRAL', 690.00),
    ('1454466', 'NOTURNO',  'BOLSA INTEGRAL', 640.00),
    ('1541970', 'NOTURNO',  'BOLSA INTEGRAL', 1180.00)
  ) as o(codigo, turno, bolsa, valor)
  join cursos cu on cu.codigo_mec = o.codigo
 where cc.codigo_erp = '112' and p.codigo_sispro = '1061130';


-- ===========================================================================
-- CANDIDATO DE DEMONSTRAÇÃO — dados fictícios
--
-- Espelha o que a representação mostra hoje em src/data/portal.ts, para o
-- protótipo e o banco contarem a mesma história. Nenhum dado real de pessoa
-- física do ProUni foi carregado aqui.
--
-- Login no portal:  usuário 52761146093  ·  senha 14032007
-- ===========================================================================
insert into candidatos (
  cpf, nome, rg, nascimento, sexo, raca_codigo,
  uf_naturalidade, municipio_naturalidade,
  email, ddd, telefone,
  cep, logradouro, numero, complemento, bairro, cidade, uf,
  escolaridade_codigo, ano_conclusao_em, curso_id, polo_id, plano_pagamento_id,
  aceite_contrato, aceite_contrato_em,
  aceite_contato,  aceite_contato_em,
  aceite_cota,     aceite_cota_em
)
select
  '52761146093', 'Julia Pugioli Ribas', '13.456.789-2', date '2007-03-14', 'Feminino', 'nao_declarado',
  'PR', 'Paraíso do Norte',
  'julia.pugioli@exemplo.com', '44', '99751-1988',
  '87708160', 'Rua Otacílio Egger', '412', 'Apto 21', 'Jardim Farropilha', 'Paranavaí', 'PR',
  'em_completo', 2025, cu.id, p.id, pl.id,
  true, timestamptz '2026-05-12 09:41-03',
  true, timestamptz '2026-05-12 09:41-03',
  false, null
from cursos cu, polos p, planos_pagamento pl
where cu.codigo_mec = '1178816'
  and p.codigo_sispro = '1061130'
  and pl.nome = 'Bolsa Integral (100%) — sem mensalidade';

-- Grupo familiar. No produto quem insere é o próprio candidato, pelo portal —
-- aqui vai carregado só para a demonstração ter volume.
insert into membros_grupo_familiar (candidato_id, nome, nascimento, parentesco_codigo)
select c.id, m.nome, m.nasc, m.parentesco
  from candidatos c,
  (values
    ('Sandra Regina Pugioli',  date '1981-07-22', 'mae'),
    ('Marcos Antônio Ribas',   date '1978-11-03', 'pai'),
    ('Enzo Pugioli Ribas',     date '2013-02-18', 'irmao')
  ) as m(nome, nasc, parentesco)
 where c.cpf = '52761146093';

-- Inscrição no concurso (é a linha do grid de Candidatos do ERP). Reatribuída
-- do concurso ProUni fictício removido acima (mesmo ajuste feito no banco de
-- produção do usuário em 2026-08-26 — ver BRIEFING-IA.md, seção 13).
insert into inscricoes
  (codigo_erp, candidato_id, concurso_id, oferta_id, status, inscrito_em,
   nota_media, tipo_bolsa, modalidade_concorrencia, chamada, polo_sispro_id)
select '25823', c.id, cc.id, o.id, 'Em análise', timestamptz '2026-05-12 09:41-03',
       559.60, 'BOLSA INTEGRAL', 'Ampla', '1ª Chamada', p.id
  from candidatos c, concursos cc, ofertas o, polos p, cursos cu
 where c.cpf = '52761146093'
   and cc.codigo_erp = '112'
   and cu.codigo_mec = '1178816'
   and o.concurso_id = cc.id and o.curso_id = cu.id and o.turno = 'NOTURNO'
   and p.codigo_sispro = '1061130';

-- ---------------------------------------------------------------------------
-- Grupo do GenDocs: é ele que costura o titular aos familiares, que estão em
-- módulos diferentes.
-- ---------------------------------------------------------------------------
insert into gendocs_grupos (candidato_id, chamada, protocolo)
select c.id, '2026.1 — 1ª Chamada', c.protocolo
  from candidatos c
 where c.cpf = '52761146093';

-- O titular vai para o módulo do perfil dele: cotista ou sem cota, conforme a
-- declaração feita na inscrição.
insert into gendocs_participantes
  (modulo_id, grupo_id, titular, candidato_id, nome, email)
select m.id, g.id, true, c.id, c.nome, c.email
  from gendocs_grupos g
  join candidatos c on c.id = g.candidato_id
  join modulos_gendocs m
    on m.chamada = g.chamada
   and m.perfil = (case when c.aceite_cota
                        then 'titular_cotista'::perfil_modulo
                        else 'titular_sem_cota'::perfil_modulo end)
 where c.cpf = '52761146093';

-- Cada familiar vai para o módulo de maior ou de menor, conforme a idade.
insert into gendocs_participantes
  (modulo_id, grupo_id, titular, membro_id, nome, email, parentesco)
select m.id, g.id, false, mf.id, mf.nome, c.email, p.nome
  from gendocs_grupos g
  join candidatos c on c.id = g.candidato_id
  join membros_grupo_familiar mf on mf.candidato_id = c.id
  join parentescos p on p.codigo = mf.parentesco_codigo
  join modulos_gendocs m
    on m.chamada = g.chamada
   and m.perfil = (case when maior_de_idade(mf.nascimento)
                        then 'familiar_maior'::perfil_modulo
                        else 'familiar_menor'::perfil_modulo end)
 where c.cpf = '52761146093';

-- Uma coleta por participante.
insert into gendocs_coletas (participante_id, status, aberta_em, prazo_em)
select p.id,
       case when p.titular then 'progresso'::status_coleta else 'aberta'::status_coleta end,
       timestamptz '2026-05-12 10:00-03',
       timestamptz '2026-05-12 10:00-03' + (sla.horas || ' hours')::interval
  from gendocs_participantes p
  join modulos_gendocs m on m.id = p.modulo_id
  join modulos_sla sla
    on sla.modulo_id = m.id
   and sla.status = (case when p.titular then 'progresso'::status_coleta
                                         else 'aberta'::status_coleta end);

-- Os documentos de cada coleta saem da lista do módulo — sem condicional,
-- porque o perfil já é o do módulo.
insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
select ct.id, d.id, 'pendente'
  from gendocs_coletas ct
  join gendocs_participantes p on p.id = ct.participante_id
  join documentos_exigidos d on d.modulo_id = p.modulo_id;
