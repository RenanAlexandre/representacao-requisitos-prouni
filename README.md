# Processo Seletivo ProUni — Representação de Requisitos

Protótipo navegável das quatro peças que levam o candidato pré-selecionado no
ProUni até a matrícula na UniFatecie. A maior parte dos dados ainda é fictícia
e tipada em `src/data/`; as seis tabelas de domínio (`polos`, `cursos`,
`racas`, `escolaridades`, `planos_pagamento`, `parentescos`) já vêm do
Supabase de verdade — ver `src/lib/dominio.ts` e a seção "Banco de dados"
abaixo.

```bash
cp .env.example .env.local   # e preencha com a URL e a chave do Supabase
npm install
npm run dev      # http://localhost:5174
npm run build    # tsc + vite build
```

---

## As quatro peças

| Peça | Rota | Situação |
|---|---|---|
| **Hub** — navegação e descrição de tudo | `/` | pronto |
| **Landing page de captação** | `/lp` | réplica pronta |
| **Portal do Candidato** | `/aluno` | pronto |
| **GenDocs** — coleta e análise documental | `/gendocs` | réplica pronta |
| **ERP Acadêmico — Processos Seletivos** | `/erp` | réplica pronta |

Uma faixa escura no topo (`GlobalBar`) atravessa todas as telas e permite pular
de um sistema para outro. Ela é **andaime de demonstração** — não existe nos
sistemas reais e por isso fica visualmente separada dos cabeçalhos de cada um.

---

## GenDocs — de onde veio cada pixel

A réplica foi reconstruída a partir do material em
`../Gendocs htmls e referencias/` (HTMLs salvos do
`app.gendocs.com.br/admin`, com o DOM real) e dos prints da plataforma.

- **Cores** — os tokens `gd-*` em `tailwind.config.js` são os valores exatos das
  variáveis `--brand-*` do bundle original (`index-CCgMxhEZ.css`).
- **Sombras** — `shadow-gd-menu-card`, `shadow-gd-document-card`,
  `shadow-gd-kpi` também vieram do bundle.
- **Tipografia** — Inter, como no original.
- **Ícones** — `react-icons/fa6`, a mesma família usada pela plataforma.
- **Tailwind v3 vs v4** — o GenDocs roda Tailwind v4. Onde o original usa um
  utilitário que não existe no v3 (`outline-1` em `<tr>` com `border-separate`),
  há um equivalente em `src/index.css` (`.gd-row`, `.gd-table`).

### Telas replicadas

| Tela | Rota | Origem |
|---|---|---|
| Módulos (tela inicial adm) | `/gendocs` | `GenDocs - tela inicial adm.html` |
| Novo Módulo (modal) | idem | print 14 |
| Dentro de um módulo | `/gendocs/modulo/:slug` | `GenDocs - Tela dentro de um módulo.html` |
| Dados do Módulo | `.../dados` | `GenDocs - tela dados do módulo.html` |
| Documentos e Regras + SLAs | `.../documentos` | `GenDocs - DOCUMENTOS E REGRAS DO MÓDULO.html` |
| Participantes e Coletas | `.../participantes` | `GenDocs - tela participantes e coletas.html` |
| Novo Participante (modal) | idem | print 6 |
| Importar Participantes (modal, 3 passos) | idem | print 7 |
| Filtro (popover) | idem | print 8 |
| Comunicações e E-mails | `.../comunicacoes` | `GenDocs - tela comunicações e emails.html` |
| Layout do E-mail | `.../comunicacoes/layout` | `GenDocs - tela layout email.html` |
| Textos dos E-mails | `.../comunicacoes/textos` | `GenDocs - TEXTOS DOS EMAILS.html` |
| Relatórios | `.../relatorios` | `GenDocs - tela relatórios.html` |
| Integrações | `.../integracoes` | `GenDocs - TELA INTEGRAÇÕES.html` |

### Dados

Os quatro módulos dos prints (Pós-Graduação, Graduação regular, Graduação 2ª,
Segunda Graduação 2026.3) estão com os números e textos originais — inclusive os
sem acento, como no sistema real.

Acrescentamos os módulos **ProUni** (1ª chamada, 2ª chamada, lista de espera e a
edição 2025.2 encerrada), que são o objeto deste projeto. Por isso os KPIs
agregados da tela inicial diferem do print: eles somam todos os módulos visíveis
na aba, não só os quatro originais.

A lista documental do ProUni vem da seção 3.3.1 do
`DEMONSTRATIVO DE REQUISITOS - GENDOCS PROUNI.docx`.

---

## Landing page de captação — de onde veio cada pixel

Layout reconstruído de `../landing page html e referencias/` (páginas salvas do
EvoluiTec, com o DOM real) e dos três prints: faixa colorida à esquerda no
desktop / no topo no celular, título, card branco `rounded-3xl` com o
passo-a-passo de três etapas e rodapé.

**A identidade mudou**, a pedido: o roxo `--deep-purple-800 #4527a0` virou o azul
esverdeado **#00BAB4** (`lp-primary`) e o verde de etapa concluída virou
**#069E6E** (`lp-green`). A tipografia é a pilha de fonte do sistema, como no
original.

### Os campos, por etapa

| Etapa | Campos |
|---|---|
| **1. Seus Dados Pessoais** | *Identificação:* Nome Completo · CPF · RG · Data de Nascimento · Sexo · **Raça/Cor + declaração de cotista** · *Naturalidade:* UF · Município · *Contato:* E-mail · DDD · Telefone |
| **2. Endereço** | CEP · Estado · Endereço · Cidade · Número · Complemento · Bairro |
| **3. Formação e Curso** | *Formação:* Escolaridade · Ano de conclusão do Ensino Médio · *Curso:* Curso Pretendido · **Polo (Local de Oferta)** · Plano de Pagamento · *Aceites:* contrato (obrigatório) e contato por SMS/WhatsApp/e-mail |

**Raça e declaração de cotista andam juntas**, na etapa 1, porque é a raça
autodeclarada que caracteriza a cota PPI. Marcar *"Sou cotista e desejo abrir o
termo de comprovação de cota"* abre o **Termo de Comprovação de Cota** na hora,
e o link no próprio rótulo reabre depois. O formulário então avisa a
consequência, que vem da seção 3.3.1 dos requisitos: a *Declaração de Raça e
Cor* é exigida **somente de quem declara raça preta, parda ou indígena**. O
texto do termo mora em `TERMO_COTA` (`src/data/lp.ts`) e é o mesmo exibido na
tela de Termos do portal.

**Polo (Local de Oferta).** Só os locais de oferta do ProUni, com o código do
Sispro. Abaixo do campo há o aviso de que o polo precisa ser **exatamente o
mesmo** selecionado no Sispro — divergir impede a validação da pré-seleção. Os
dois polos (`1061130 CAMPUS SANEPAR` e `659920 CAMPUS GETÚLIO`) e os onze
códigos de curso são **reais**, extraídos de `RELATÓRIO PROUNI 1 E 2 OP.xls` e
`LISTA DE ESPERA 26.1.xls`.

O botão de avançar só habilita quando a etapa está válida, como no original.
Máscaras em CPF, RG, CEP, DDD e telefone.

**Município de naturalidade** vem da lista do IBGE (5.571 cidades em
`src/data/municipios.json`, reduzida a `{ UF: [nomes] }`) e depende da UF
escolhida.

**CEP** consulta o **ViaCEP** (`viacep.com.br/ws/{cep}/json/`) assim que os oito
dígitos são digitados, e preenche rua, bairro, cidade e estado. O serviço é
público e não pede chave; sai daqui apenas o CEP. A chamada anterior é cancelada
se o candidato continuar digitando, e o campo mostra o estado da busca. Três
situações são tratadas: CEP inexistente (o ViaCEP responde `{"erro": "true"}`),
CEP de logradouro único (volta sem rua e sem bairro) e serviço indisponível —
neste último caso entra a tabela de reserva `CEPS_RESERVA` em `src/data/lp.ts`,
que existe só para a demonstração não travar sem rede. Os campos permanecem
sempre editáveis.

Ao enviar, a tela de confirmação mostra o protocolo e leva ao Portal do
Candidato — por clique no botão ou pelo redirecionamento automático em **7
segundos**.

---

## Portal do Candidato — a área pós-cadastro

Mesma estética da landing page: card branco `rounded-3xl`, subtítulos em
`lp-primary` com a régua ao lado, rodapé na cor da marca. A diferença é a faixa
lateral, que aqui **vira o menu**.

O menu fica recolhido em 64px mostrando só os ícones e abre para 264px quando o
ponteiro entra, revelando os rótulos por extenso. No topo fica o candidato —
avatar com as iniciais, e o nome e o CPF aparecem quando a barra expande. No
celular, onde não existe hover, a barra vira uma faixa horizontal com ícone e
rótulo lado a lado.

| Item | Rota | Ícone |
|---|---|---|
| Dados cadastrais | `/aluno/dados` | `IdCard` (Lucide) |
| Coletas de documentos | `/aluno/coletas` | marca do GenDocs |
| Termos e condições | `/aluno/termos` | `FileText` (Lucide) |

O bloco do candidato, no topo do menu, é também o caminho de volta ao início
(`/aluno`) — por isso o menu em si fica com três itens. No celular, onde não há
hover, o início entra como um quarto item da faixa horizontal.

O ícone do GenDocs é o símbolo real recortado de `public/genDocsLogo.svg`: os
seis primeiros traçados do arquivo, sem o fundo e sem o letreiro, com o viewBox
fechado no símbolo (`0 0 71.43 50`) e os traços passados a `currentColor`. Vive
em `src/components/GenDocsMark.tsx`.

### O que cada tela mostra

- **Início** (`/aluno`) — hub do portal: saudação com o protocolo, o prazo da
  chamada e um card por item do menu, cada um explicando o que há lá dentro.
- **Dados cadastrais** — espelho somente-leitura do que a landing capturou,
  separado nos mesmos blocos do formulário, mais os aceites registrados. Correção
  passa pela Secretaria, porque o cadastro já seguiu para o GenDocs e o ERP.
- **Coletas de documentos** — prazo da chamada, barra de progresso por status, a
  lista do que precisa ser reenviado (arquivo e de quem é, sem o texto da
  recusa — esse fica no GenDocs, ao lado do campo de reenvio) e um bloco por
  pessoa com a documentação dela.
- **Termos e condições** — o termo de responsabilidade transcrito literalmente da
  seção 3.3.2 do `DEMONSTRATIVO DE REQUISITOS - GENDOCS PROUNI.docx` (é ele que
  habilita o envio final), o Termo de Comprovação de Cota aberto na inscrição, e
  as cláusulas gerais, cada uma com a seção do documento que a sustenta.

### O grupo familiar é montado pelo candidato

Quem mora na mesma casa varia de família para família, então a coleta começa só
com o **candidato**. Abaixo dele fica o botão *Inserir participante do grupo
familiar*, que abre um formulário com três campos:

| Campo | Para quê |
|---|---|
| Nome completo | identificação do familiar |
| Data de nascimento | calcula a maioridade, que define a lista documental |
| Relação de parentesco | menu suspenso: Marido, Esposa, Pai, Mãe, Irmã(o), Tio(a), Primo(a), Avô, Avó |

Familiar **maior de idade** entra com RG, CPF, comprovante de estado civil,
CTPS, comprovante de renda e imposto de renda. **Menor de idade** entra com
certidão de nascimento, CPF e declaração de ausência de renda. O formulário já
avisa qual das duas listas vai valer antes de confirmar.

**O envio é por pessoa.** Cada bloco tem o seu próprio botão para o GenDocs, que
leva à lista de participantes do módulo com a busca já preenchida com o nome
(`?participante=`) — é assim que a coleta funciona lá, participante a
participante.

O candidato da demonstração é a **Julia Pugioli Ribas**, a mesma primeira linha
da lista de participantes do módulo ProUni no GenDocs — assim o portal, a coleta
e o ERP falam do mesmo aluno.

---

## ERP Acadêmico — de onde veio cada pixel

Reconstruído a partir do material em `../ERP html e referencias/` (HTMLs salvos
do `dev.erp.inovacarreira.com.br`, um app Next.js, com o DOM real) e dos prints.

- **Cores** — os tokens `erp-*` em `tailwind.config.js` são os valores exatos do
  `:root` do bundle: `--primary #ed8020`, `--hover #d1570e`, `--active #ad3b10`,
  `--success #18aa41`, `--blue #3c96ff`, `--light-gray #cdcdcd`,
  `--background 0 0% 98%`.
- **Sombras** — `shadow-table-row` (`0px 4px 8px 0px #0000002a`),
  `shadow-new-button` (`0px 4px 9px 0px #00000026`) e `shadow-details-container`
  (`0px 14px 45px 4px #0000001a`).
- **Tipografia** — Lato (o original carrega `__Lato_79853d` via `next/font`).
- **Sidebar** — dois estados como no original: trilho de 80px só com ícones e a
  versão expandida de 280px com rótulos e sub-itens; o botão de fixar acompanha
  a borda.

### O módulo Processos Seletivos

Dois sub-itens, exatamente como no ERP real:

| Tela | Rota | Origem |
|---|---|---|
| Candidatos (listagem) | `/erp/candidatos` | print |
| Candidato — Detalhes | `/erp/candidatos/:id` | `Candidatos_Detalhes.html` |
| Processos seletivos (listagem) | `/erp/processos-seletivos` | `Processos Seletivos - processos seletivosd.html` |
| Menu do processo (4 cards) | `.../:psId/menu` | print |
| Dados do Processo Seletivo | `.../:psId/detalhes` | `Menu_Detalhes.html` |
| Concursos (listagem) | `.../:psId/concursos` | print |
| Concurso — Detalhes | `.../:psId/concursos/:id` | `Concursos_Detalhes.html` |
| Candidatos do processo | `.../:psId/candidatos` | `Menu_Candidatos.html` |
| Turmas | `.../:psId/turmas` | `Menu_Turmas.html` |

O **elo com o GenDocs** aparece no cadastro do concurso: o campo
*Módulo do GenDocs* (`/erp/processos-seletivos/654/concursos/112`).

### Dados

Os dez processos seletivos e os dez candidatos nomeados são exatamente os dos
prints, assim como o concurso `CENTRO EDUCACIONAL FATECIE LTDA` e as telas
vazias de Candidatos e Turmas do TESTEGRAD.

Os demais candidatos são derivados só para a paginação ter volume — o ambiente
real tem 2.792 páginas; aqui são 50.

---

## Estrutura

```
src/
  App.tsx                  rotas
  components/
    GlobalBar.tsx          faixa de navegação do protótipo
    GenDocsMark.tsx        símbolo do GenDocs recortado do logo, em currentColor
    gendocs/ui.tsx         kit de UI do GenDocs (botões, KPI, modal, tabela…)
    erp/ui.tsx             kit de UI do ERP (RouteHeader, Field, tabela, paginação…)
    lp/ui.tsx              kit de UI da landing (campo, entrada, seleção, aceite, botões)
    portal/ui.tsx          kit de UI do portal (título, cartão, dado, etiqueta)
  data/
    gendocs.ts             módulos, participantes, documentos, e-mails, SLAs
    erp.ts                 processos seletivos, concursos, turmas e candidatos
    erpMenu.ts             menu lateral do ERP (12 grupos, 2 sub-itens)
    lp.ts                  opções, máscaras e consulta de CEP da landing
    portal.ts              candidato, inscrição, grupo familiar e cláusulas
    municipios.json        5.571 municípios do IBGE por UF
  layouts/
    GenDocsLayout.tsx      barra azul fixa + trilha do módulo
    ErpLayout.tsx          sidebar recolhível do ERP
    PortalLayout.tsx       menu recolhível do portal (abre no hover)
  pages/
    Hub.tsx                primeira página
    gendocs/               dez telas do GenDocs
    erp/Candidatos.tsx     listagem + ficha do candidato
    erp/ProcessosSeletivos.tsx  listagem, menu, dados, concursos, turmas
    lp/Landing.tsx         landing de captação (3 etapas)
    portal/                início, dados cadastrais, coletas e termos
```

---

## Banco de dados — Supabase

O esquema está em **[`supabase/`](supabase/)**: 22 tabelas, funções, triggers,
views e RLS, mais a carga inicial. Leia
[`supabase/README.md`](supabase/README.md) para rodar e para as decisões que
ficaram registradas.

Resumo do que ele cobre:

| Bloco | Tabelas |
|---|---|
| Domínio | `polos`, `cursos`, `racas`, `parentescos`, `escolaridades`, `planos_pagamento` |
| Captação | `candidatos`, `membros_grupo_familiar`, `contador_protocolo` |
| ERP | `processos_seletivos`, `concursos`, `ofertas`, `turmas`, `inscricoes` |
| GenDocs | `modulos_gendocs`, `modulos_sla`, `documentos_exigidos`, `gendocs_grupos`, `gendocs_participantes`, `gendocs_coletas`, `gendocs_documentos_coleta`, `gendocs_arquivos` |

Três pontos que valem saber daqui:

- **Protocolo `PRU-2026-00001`**, sequencial por ano, um por candidato.
- **Login do portal** é CPF + data de nascimento, como combinado. Há uma
  ressalva de segurança registrada em `supabase/README.md`.
- **Quatro módulos no GenDocs** (titular cotista, titular sem cota, familiar
  maior, familiar menor) e a tabela `gendocs_grupos`, que religa o titular aos
  familiares espalhados por esses módulos — relação que hoje não existe no
  sistema.

**Parcialmente ligado.** O projeto Supabase existe, o schema e o seed já
rodaram nele. Consumido de verdade hoje:

- `src/lib/supabaseClient.ts` — o cliente, lê `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` de `.env.local` (não versionado).
- `src/lib/dominio.ts` — as seis tabelas de domínio: `carregarDominioLanding()`
  (raça, escolaridade, curso, polo, plano de pagamento — usado em
  `pages/lp/Landing.tsx`) e `carregarParentescos()` (modal de inserir familiar
  em `pages/portal/Coletas.tsx`).
- `src/lib/erp.ts` — `processos_seletivos`, `concursos` e `turmas`, usado em
  `pages/erp/ProcessosSeletivos.tsx` (listagem, Menu, Detalhes, Concursos,
  Concurso Detalhes, Turmas). Estas três têm uma **política de leitura pública
  deliberada** (`leitura_publica_erp` no `01-schema.sql`) porque o protótipo
  não tem login de Secretaria — escrita continua só por `service_role`. As
  demais tabelas de backoffice (`modulos_gendocs`, `ofertas` etc.) seguem
  fechadas; por isso o campo "Módulo do GenDocs" na tela de Concurso sempre
  mostra `--`, mesmo quando existe módulo vinculado no banco.

Todos com estado de carregamento e de erro.

**O resto continua fixo** em `src/data/` — `candidatos` (landing/portal),
`CANDIDATOS` (listagem geral do ERP), `inscricoes`, o fluxo do GenDocs
(módulos/participantes/coletas/documentos/arquivos). Esbarra nas decisões de
escopo em aberto (ver `BRIEFING-IA.md`, seção 10) antes de virar consulta
real.

## Fora de escopo (por enquanto)

Autenticação — o protótipo não tem tela de login; o Portal é acessado direto
pela rota. A função `autenticar_candidato` (CPF + nascimento) já existe e
funciona no banco (ver `supabase/README.md`), mas **nenhuma tela do app a
chama ainda**. Também fora: integração real com WAE e ERP, upload de
arquivos, análise por IA, disparo de e-mails. A única integração externa que
já é real é a consulta de CEP ao ViaCEP, na landing page.
