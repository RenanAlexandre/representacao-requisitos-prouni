# Banco — Processo Seletivo ProUni

Esquema para o Supabase. Dois arquivos, nesta ordem:

```
01-schema.sql   tabelas, funções, triggers e RLS
02-seed.sql     dados de referência + um candidato de demonstração
```

No painel do Supabase: **SQL Editor → New query**, cola o conteúdo de cada um e
roda. Ou, pelo CLI:

```bash
supabase db execute --file supabase/01-schema.sql
supabase db execute --file supabase/02-seed.sql
```

Os dois arquivos foram validados contra o parser real do PostgreSQL, e as
colunas do seed conferidas uma a uma contra o esquema.

---

## As 22 tabelas e a tela que cada uma alimenta

### Domínio — listas que a Secretaria mantém sem mexer em código

| Tabela | Alimenta |
|---|---|
| `polos` | campo **Polo (Local de Oferta)** da landing |
| `cursos` | **Curso Pretendido** da landing; Curso, Área de Conhecimento, Tipo de Formação e Modalidade na ficha do ERP |
| `racas` | campo **Raça / Cor** da landing; campo Raça do ERP |
| `parentescos` | menu suspenso ao inserir familiar no portal |
| `escolaridades` | campo Escolaridade da landing |
| `planos_pagamento` | campo Plano de Pagamento da landing |

### Captação

| Tabela | Alimenta |
|---|---|
| `candidatos` | o cadastro inteiro da landing + aceites + login do portal + protocolo |
| `membros_grupo_familiar` | o grupo montado pelo candidato na tela de Coletas |
| `contador_protocolo` | sequência do protocolo, uma por ano |

### Processo seletivo (ERP)

| Tabela | Alimenta |
|---|---|
| `processos_seletivos` | listagem e Dados do Processo Seletivo |
| `concursos` | listagem de Concursos e a ficha do concurso (inclusive o **Módulo do GenDocs**) |
| `ofertas` | o **Valor de Oferta** da ficha do candidato, por curso × polo × turno |
| `turmas` | tela de Turmas |
| `inscricoes` | o **grid de Candidatos** — é ela que tem status, nota do ENEM, tipo de bolsa e chamada |

### Coleta documental (GenDocs)

A estrutura é a mesma do sistema: **módulo → participantes → coleta do
participante → documentos → arquivos**.

| Tabela | Alimenta |
|---|---|
| `modulos_gendocs` | tela **Dados do Módulo**. Um por perfil, por chamada |
| `modulos_sla` | tabela de SLA por status, da tela de Documentos e Regras |
| `documentos_exigidos` | a lista documental do módulo |
| `gendocs_grupos` | **novo** — costura o titular aos familiares (ver abaixo) |
| `gendocs_participantes` | a linha da tela **Participantes e Coletas** |
| `gendocs_coletas` | o status funcional do participante, com os marcos de SLA |
| `gendocs_documentos_coleta` | a exigência com a decisão do analista |
| `gendocs_arquivos` | o recolhimento de fato, versionado |

#### Os quatro módulos

`modulos_gendocs.perfil` separa quem entra em cada um:

| Perfil | Lista documental |
|---|---|
| `titular_cotista` | os 12 itens do titular **+ Declaração de Raça e Cor** |
| `titular_sem_cota` | os 12 itens do titular |
| `familiar_maior` | RG, CPF, estado civil, CTPS, renda, IR |
| `familiar_menor` | certidão de nascimento, CPF, ausência de renda |

Como o perfil já é o do módulo, `documentos_exigidos` não tem mais
condicional: o que está listado é o que aquele perfil entrega.

#### A relação titular + familiares

É o buraco que você apontou: com quatro módulos, o titular fica num e os
familiares em outros, sem nada os ligando — o analista abriria a coleta da mãe
sem saber de quem ela é mãe.

`gendocs_grupos` resolve. Um grupo por candidato por chamada, carregando o
protocolo. Cada participante aponta para o grupo e diz se é o titular:

```
gendocs_grupos (protocolo PRU-2026-00001)
├── participante  Julia Pugioli Ribas   titular=true   → módulo titular_sem_cota
├── participante  Sandra Regina Pugioli  mãe           → módulo familiar_maior
├── participante  Marcos Antônio Ribas   pai           → módulo familiar_maior
└── participante  Enzo Pugioli Ribas     irmão         → módulo familiar_menor
```

Garantias no esquema:

- `um_titular_por_grupo` — índice único parcial: um grupo tem exatamente um titular
- `origem_exclusiva` — titular aponta para `candidatos`, familiar aponta para
  `membros_grupo_familiar`, nunca os dois
- `vw_grupo_completo` — o grupo inteiro atravessando os módulos, com a contagem
  de aprovados, reprovados e pendentes de cada pessoa. É a consulta que o
  analista precisa e que hoje não existe
- `vw_grupos_prontos` — o grupo só fecha quando **todos** os participantes
  fecham; o titular não é aprovado com a documentação da mãe pendente

#### O recolhimento dos documentos

`gendocs_arquivos` guarda uma linha por upload, versionada. Reprovado um item, o
candidato reenvia e entra a versão 2 — o arquivo recusado permanece, junto do
motivo, que é o que sustenta a auditoria da análise. `gendocs_documentos_coleta.arquivo_id`
aponta para a versão vigente, e `tentativas` conta os reenvios.

O binário fica no Storage do Supabase, em bucket privado; a tabela guarda
`storage_path`, nome original, mime, tamanho e o SHA-256 (que denuncia reenvio
do mesmo arquivo sem correção).

Duas travas na RLS de envio: fora da janela do módulo o insert é recusado
(requisito da seção 3.4), e item já aprovado não aceita reenvio.

---

## Decisões que ficaram no esquema

**Protocolo `PRU-2026-00001`.** Sequencial por ano, um por candidato. Sai da
função `proximo_protocolo(ano)`, que incrementa `contador_protocolo` de forma
atômica, e é aplicado por trigger quando o campo vem vazio.

**Login do portal.** Usuário é o CPF (só dígitos), senha é a data de
nascimento no formato `ddmmaaaa`, guardada como hash bcrypt em `senha_hash`.
A função `autenticar_candidato(cpf, nascimento)` confere e devolve o candidato.

> ⚠️ **Este par é fraco.** O CPF circula em qualquer cadastro e a data de
> nascimento tem menos de 30 mil combinações plausíveis por pessoa — quem tiver
> a lista de pré-selecionados do ProUni (que é pública) entra na conta de
> qualquer candidato e vê RG, endereço, renda da família e os documentos
> anexados. Isso é dado sensível sob a LGPD.
>
> Foi implementado como você pediu, e o hash já está no lugar certo para
> trocar sem migração. Duas saídas baratas quando quiser: **(a)** forçar troca
> de senha no primeiro acesso, ou **(b)** mandar um link mágico por e-mail em
> vez de senha — o e-mail já está no cadastro. Vale também ligar rate limiting
> na função de login.

**O grupo familiar não vem pré-carregado.** Quem mora na mesma casa varia, então
o candidato monta o grupo pelo portal.

**Maioridade não é coluna.** A idade muda com o tempo, e uma coluna gerada
congelaria o valor no dia da inserção (além de o Postgres recusar `current_date`
numa coluna gerada). Fica na função `maior_de_idade(nascimento)` e na view
`vw_membros_grupo_familiar`.

**Uma coleta por participante.** `gendocs_coletas.participante_id` é único — a
coleta é do participante dentro do módulo, não da pessoa em abstrato.

**Módulo do titular escolhido pela declaração de cota.** O seed manda o titular
para `titular_cotista` ou `titular_sem_cota` conforme `candidatos.aceite_cota`,
e cada familiar para `familiar_maior` ou `familiar_menor` conforme a idade. Em
produção essa distribuição é o passo de importação da Secretaria.

**Divergência de polo.** O candidato escolhe o polo na landing e o Sispro traz o
polo da pré-seleção. A view `inscricoes_com_divergencia_de_polo` lista quem
divergiu. O banco **não bloqueia** — sinaliza, para a Secretaria tratar caso a
caso.

**RLS.** Nada é legível pelo `anon`. O candidato autenticado vê só o próprio
cadastro, o próprio grupo familiar e as próprias coletas — e não pode alterar o
cadastro, porque ele já seguiu para o GenDocs e para o ERP. A Secretaria e o ERP
acessam pela `service_role`, que ignora RLS.

---

## O que é dado real e o que é espaço reservado

**Real, extraído dos arquivos do ProUni** em
`PROJETO - PROCESSO SELETIVO PROUNI/`:

- **Polos** — `1061130 CAMPUS SANEPAR` (cabeçalho "Local de Oferta" do
  `RELATÓRIO PROUNI 1 E 2 OP.xls`) e `659920 CAMPUS GETÚLIO` (colunas
  CODIGO/NOME CAMPUS da `LISTA DE ESPERA 26.1.xls`).
- **Códigos e nomes de curso** — os 11 códigos MEC que aparecem nos dois
  arquivos.
- **Turnos** — MATUTINO e NOTURNO, da coluna Turno do relatório.
- **Lista documental** — os 13 itens da seção 3.3.1 do demonstrativo de
  requisitos.
- **Processo seletivo `654 TESTEGRAD` e concurso `112`** — do ambiente de
  referência do ERP, com o `Módulo do GenDocs = 34534` que liga os dois sistemas.

**Espaço reservado, precisa da sua confirmação:**

| O quê | Situação |
|---|---|
| Lista de polos | Só os dois que os arquivos comprovam. Se há mais locais de oferta, complete pelo Sispro. |
| `valor_oferta` das ofertas | Valores inventados. Substituir pela tabela de preços vigente. |
| `tipo_formacao` dos cursos | Inferência. Os dois códigos de Educação Física (1365559 e 1397028) foram divididos em Licenciatura e Bacharelado por dedução — confirmar no e-MEC. |
| `area_conhecimento` | Inferência. O ERP usa taxonomia própria (o print mostra `SAÚDE E BEM-ESTAR`). |
| Candidato de demonstração | Fictício. Nenhum dado pessoal real dos arquivos do ProUni foi carregado. |

---

## O que ainda não está ligado

O app **continua com os dados fixos** em `src/data/`. Ligar as telas ao banco
precisa de duas coisas que não estão aqui:

1. a **URL do projeto e a chave anon** do Supabase, em `.env.local`;
2. o cliente (`@supabase/supabase-js`) e a troca de cada `src/data/*.ts` por
   uma consulta.

Quando o banco existir, me passe a URL e a chave anon que eu faço a troca.

Um campo que o banco tem e a landing ainda **não captura**: `turno`. Os dados
reais do ProUni mostram o mesmo curso ofertado em MATUTINO e NOTURNO (Direito,
por exemplo), então o candidato precisa escolher. Fica em `ofertas.turno`
esperando a decisão de adicionar o campo na inscrição.
