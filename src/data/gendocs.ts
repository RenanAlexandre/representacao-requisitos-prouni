/**
 * Dados de demonstração do GenDocs.
 *
 * Os quatro primeiros módulos e as listas de documentos/e-mails/integrações
 * reproduzem exatamente o que aparece nos prints e nos HTMLs salvos em
 * `Gendocs htmls e referencias/` — é a réplica fiel da plataforma (inclusive
 * os textos sem acento que já vêm assim no original).
 *
 * Os módulos ProUni foram acrescentados porque são o objeto deste projeto
 * (ver `DEMONSTRATIVO DE REQUISITOS - GENDOCS PROUNI.docx`, seção 3.4: a
 * Secretaria abre um processo por chamada, com janela de datas própria).
 */

export type ColetaStatus = 'nova' | 'aberta' | 'progresso' | 'recebida' | 'finalizada'

export const STATUS_ORDEM: ColetaStatus[] = ['nova', 'aberta', 'progresso', 'recebida', 'finalizada']

export const STATUS_LABEL: Record<ColetaStatus, string> = {
  nova: 'Nova Coleta',
  aberta: 'Coleta aberta',
  progresso: 'Em progresso',
  recebida: 'Recebida',
  finalizada: 'Finalizada',
}

/** Cor do texto do status — igual à tela de SLAs e à coluna Status da lista. */
export const STATUS_TEXT: Record<ColetaStatus, string> = {
  nova: 'text-gray-400',
  aberta: 'text-gray-600',
  progresso: 'text-gd-orange',
  recebida: 'text-gd-blue-100',
  finalizada: 'text-gd-green-100',
}

export interface Participante {
  id: string
  nome: string
  email: string
  recebimento: string | null
  sla: string
  status: ColetaStatus
  obs1?: string
  obs2?: string
  obs3?: string
}

export interface DocumentoRegra {
  seq: number
  nome: string
  obrigatorio: boolean
  substituicao: string[]
}

export interface TextoEmail {
  assunto: string
  tipo: string
}

export interface Integracao {
  url: string
  tentativas: number
  token: string
}

export type SituacaoModulo = 'Iniciado' | 'Não iniciado' | 'Finalizado'

export interface Modulo {
  slug: string
  nome: string
  descricao: string
  inicio: string
  termino: string
  situacao: SituacaoModulo
  ativo: boolean
  linkPreenchimento: string
  participantes: number
  aprovacao: number
  /** Distribuição por status usada nos KPIs (a soma fecha em `participantes`). */
  dist: Record<ColetaStatus, number>
  documentos: DocumentoRegra[]
  slas: Record<ColetaStatus, number>
  emails: TextoEmail[]
  integracoes: Integracao[]
  /** Amostra nominal exibida na lista (o restante é derivado). */
  amostra: Participante[]
  /** Borda laranja e tag "Novo" na tela inicial. Vem de `modulos_gendocs.destaque`. */
  destaque?: boolean
}

/* ------------------------------------------------------------------ */
/* Documentos — Pós-Graduação (exatamente como no print)               */
/* ------------------------------------------------------------------ */
const DOCS_POS: DocumentoRegra[] = [
  { seq: 1, nome: 'CPF', obrigatorio: true, substituicao: ['CNH'] },
  { seq: 2, nome: 'RG', obrigatorio: true, substituicao: ['CNH'] },
  { seq: 3, nome: 'Certidão de Nascimento', obrigatorio: true, substituicao: ['Certidão de Casamento'] },
  { seq: 4, nome: 'Diploma', obrigatorio: true, substituicao: [] },
  { seq: 5, nome: 'Certidão de Casamento', obrigatorio: false, substituicao: ['Certidão de Nascimento'] },
  { seq: 6, nome: 'CNH', obrigatorio: false, substituicao: [] },
]

const DOCS_GRAD: DocumentoRegra[] = [
  { seq: 1, nome: 'RG', obrigatorio: true, substituicao: ['CNH'] },
  { seq: 2, nome: 'CPF', obrigatorio: true, substituicao: ['CNH'] },
  { seq: 3, nome: 'Certidão de Nascimento', obrigatorio: true, substituicao: ['Certidão de Casamento'] },
  { seq: 4, nome: 'Histórico Escolar do Ensino Médio', obrigatorio: true, substituicao: [] },
  { seq: 5, nome: 'Certificado de Conclusão do Ensino Médio', obrigatorio: true, substituicao: [] },
  { seq: 6, nome: 'Comprovante de Residência', obrigatorio: true, substituicao: [] },
  { seq: 7, nome: 'CNH', obrigatorio: false, substituicao: [] },
]

/* ------------------------------------------------------------------ */
/* Documentos — ProUni (DEMONSTRATIVO DE REQUISITOS, seção 3.3.1)      */
/* ------------------------------------------------------------------ */
const DOCS_PROUNI: DocumentoRegra[] = [
  { seq: 1,  nome: 'Ficha de Inscrição', obrigatorio: true, substituicao: [] },
  { seq: 2,  nome: 'CNH', obrigatorio: false, substituicao: [] },
  { seq: 3,  nome: 'RG', obrigatorio: true, substituicao: ['CNH'] },
  { seq: 4,  nome: 'CPF', obrigatorio: true, substituicao: ['CNH'] },
  /* Um obrigatório e um caminho alternativo, como nos comprovantes de renda:
     quem mora de aluguel ou em imóvel cedido manda o de baixo, e o de cima é
     dispensado. Eram um campo só até a migração 33. */
  { seq: 5,  nome: 'Comprovante de Residência - Em nome próprio ou de familiar do grupo', obrigatorio: true, substituicao: [
    'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido',
  ] },
  { seq: 6,  nome: 'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido', obrigatorio: false, substituicao: [] },
  { seq: 7,  nome: 'Histórico do Ensino Médio', obrigatorio: true, substituicao: [] },
  { seq: 8,  nome: 'Certificado de Conclusão do Ensino Médio', obrigatorio: true, substituicao: [] },
  { seq: 9,  nome: 'Carteira de Trabalho - CTPS', obrigatorio: true, substituicao: [] },
  /* Um obrigatório de renda, e sete formas de cumpri-lo. A declaração de
     imposto de renda entrou nessa lista na migração 30: era um item
     obrigatório à parte, e virou mais um comprovante aceito. */
  { seq: 10, nome: 'Comprovante de renda - HOLERITE/CONTRACHEQUES', obrigatorio: true, substituicao: [
    'Comprovante de renda - SIMEI, DECORE, DECLARAÇÃO DE RENDIMENTOS',
    'Comprovante de renda - CONTRATO SOCIAL + DECORE',
    'Comprovante de renda - EXTRATOS PREVIDÊNCIA/INSS',
    'Comprovante de renda - NOTA DE PRODUTOR',
    'Comprovante de renda - RECIBOS DE ALUGUEL',
    'Comprovante de renda - Declaração de imposto de renda',
    'Declaração de ausência de renda',
  ] },
  { seq: 11, nome: 'Comprovante de renda - SIMEI, DECORE, DECLARAÇÃO DE RENDIMENTOS', obrigatorio: false, substituicao: [] },
  { seq: 12, nome: 'Comprovante de renda - CONTRATO SOCIAL + DECORE', obrigatorio: false, substituicao: [] },
  { seq: 13, nome: 'Comprovante de renda - EXTRATOS PREVIDÊNCIA/INSS', obrigatorio: false, substituicao: [] },
  { seq: 14, nome: 'Comprovante de renda - NOTA DE PRODUTOR', obrigatorio: false, substituicao: [] },
  { seq: 15, nome: 'Comprovante de renda - RECIBOS DE ALUGUEL', obrigatorio: false, substituicao: [] },
  { seq: 16, nome: 'Comprovante de renda - Declaração de imposto de renda', obrigatorio: false, substituicao: [] },
  { seq: 17, nome: 'Declaração de ausência de renda', obrigatorio: false, substituicao: [] },
]

const SLA_ZERO: Record<ColetaStatus, number> = { nova: 0, aberta: 0, progresso: 0, recebida: 0, finalizada: 0 }
const SLA_PROUNI: Record<ColetaStatus, number> = { nova: 24, aberta: 72, progresso: 72, recebida: 48, finalizada: 0 }


const EMAILS_PADRAO: TextoEmail[] = [
  { assunto: 'Você foi convidado para preencher documentos', tipo: 'FIRST_FILL' },
  { assunto: 'Coleta finalizada – obrigado por enviar!', tipo: 'THANK_YOU' },
]

const EMAILS_PROUNI: TextoEmail[] = [
  ...EMAILS_PADRAO,
  { assunto: 'Documento reprovado — reenvie dentro do prazo', tipo: 'DOCUMENT_REJECTED' },
  { assunto: 'Prazo de envio encerra em 48 horas', tipo: 'DEADLINE_REMINDER' },
  { assunto: 'Documentação aprovada — próximos passos da matrícula', tipo: 'APPROVED' },
]

const WEBHOOK_ERP =
  'https://erp-api-prod-964330493122.southamerica-east1.run.app/api/v1/gen-docs/webhook/participant/result'

/* ------------------------------------------------------------------ */
/* Amostra nominal — exatamente as linhas do print de Participantes    */
/* ------------------------------------------------------------------ */
const AMOSTRA_POS: Participante[] = [
  { id: 'p1', nome: 'Aarão Henrique Vasconcelos Fernandes De Faria Correia Neto', email: 'aaraohenrique@exemplo.com', recebimento: null, sla: 'N/A', status: 'aberta' },
  { id: 'p2', nome: 'Abdias Lemos Da Costa', email: 'abdiaslemos@exemplo.com', recebimento: null, sla: 'N/A', status: 'aberta' },
  { id: 'p3', nome: 'Abel Augusto De Moraes', email: 'abelaugusto@exemplo.com', recebimento: null, sla: 'N/A', status: 'aberta' },
  { id: 'p4', nome: 'Abner Isaías De Oliveira Prado', email: 'abnerisaias@exemplo.com', recebimento: null, sla: 'N/A', status: 'aberta' },
  { id: 'p5', nome: 'Ada Ferraz Santiago', email: 'adaferraz@exemplo.com', recebimento: null, sla: 'N/A', status: 'progresso' },
  { id: 'p6', nome: 'Adélia Soares Ferraz', email: 'adeliasoares@exemplo.com', recebimento: null, sla: 'N/A', status: 'aberta' },
  { id: 'p7', nome: 'Adriano Barreto Aguiar', email: 'adrianobarreto@exemplo.com', recebimento: '05/11/2025', sla: 'N/A', status: 'finalizada' },
  { id: 'p8', nome: 'Agnes Ramalho Freire', email: 'agnesramalho@exemplo.com', recebimento: null, sla: 'N/A', status: 'nova' },
  { id: 'p9', nome: 'Aílton Sales De Jesus Nogueira', email: 'ailtonsales@exemplo.com', recebimento: '12/05/2026', sla: 'N/A', status: 'progresso' },
  { id: 'p10', nome: 'Alana Bastos Dos Reis', email: 'alanabastos@exemplo.com', recebimento: '11/08/2026', sla: 'N/A', status: 'progresso' },
]


/* ==================================================================
 * Módulos ProUni — gerados, não escritos à mão
 *
 * São 16: quatro declarações independentes do Sisprouni, todas as combinações.
 * Escrever os dezesseis à mão daria dezesseis chances de divergir do banco,
 * então aqui a lista sai da MESMA REGRA que `supabase/15-modulo-por-combinacao.sql`
 * usa lá — mesmos códigos, mesma ordem canônica, mesmos nomes e slugs.
 *
 * Isto é só a CONFIGURAÇÃO que as telas internas precisam de forma síncrona.
 * Os números e a lista documental real continuam vindo do banco.
 * ================================================================== */

/** Ordem canônica. Trocar a ordem aqui quebra o casamento com o slug do banco. */
const LETRAS = ['C', 'M', 'B', 'P'] as const
type Letra = (typeof LETRAS)[number]

const FATIA: Record<Letra, string> = {
  C: 'cota', M: 'matricula', B: 'beneficio', P: 'professor',
}

const ROTULO_DECLARACAO: Record<Letra, string> = {
  C: 'Cota',
  M: 'Enc. Matrícula',
  B: 'Enc. Benefício',
  P: 'Professor Rede Pública',
}

const DOC_DECLARACAO: Record<Letra, string> = {
  C: 'Documento comprobatório de Raça e Cor - PPI',
  M: 'Documento comprobatório de encerramento de vínculo com outra instituição',
  B: 'Documento comprobatório de encerramento do usufruto da bolsa ProUni ou do FIES',
  P: 'Documento comprobatório de vínculo como professor da rede pública',
}

/** As 16 combinações, em ordem de tamanho — igual ao laço de bits do SQL. */
export const COMBINACOES: string[] = Array.from({ length: 16 }, (_, i) =>
  LETRAS.filter((_l, k) => (i >> k) & 1).join(''),
).sort((a, b) => a.length - b.length || a.localeCompare(b))

function moduloProuni(comb: string): Modulo {
  const letras = [...comb] as Letra[]
  const rotulos = letras.map((l) => ROTULO_DECLARACAO[l])

  return {
    slug: comb === '' ? 'prouni' : `prouni-${letras.map((l) => FATIA[l]).join('-')}`,
    nome: comb === '' ? 'PROUNI' : `PROUNI: ${rotulos.join(' + ')}`,
    descricao:
      comb === ''
        ? 'Coleta documental dos candidatos pré-selecionados no ProUni. Reúne identificação, comprovação de renda e escolaridade do candidato e do grupo familiar.'
        : `Coleta documental dos candidatos pré-selecionados que declararam: ${rotulos.join(', ')}. ` +
          'Inclui a documentação base do ProUni mais o comprovante de cada declaração.',
    inicio: '27/08/2026',
    termino: '01/01/2027',
    situacao: 'Iniciado',
    ativo: true,
    destaque: true,
    linkPreenchimento: 'N/A',
    participantes: 0,
    aprovacao: 0,
    dist: { nova: 0, aberta: 0, progresso: 0, recebida: 0, finalizada: 0 },
    /* Os 14 base mais um comprovante por declaração, na ordem canônica. */
    documentos: [
      ...DOCS_PROUNI,
      ...letras.map((l, i) => ({
        seq: DOCS_PROUNI.length + i + 1,
        nome: DOC_DECLARACAO[l],
        obrigatorio: true,
        substituicao: [] as string[],
      })),
    ],
    slas: SLA_PROUNI,
    emails: EMAILS_PROUNI,
    integracoes: [{ url: WEBHOOK_ERP, tentativas: 3, token: '-' }],
    amostra: [],
  }
}

export const MODULOS_PROUNI: Modulo[] = COMBINACOES.map(moduloProuni)

/* ------------------------------------------------------------------ */
/* Módulos dos familiares — por idade, não por combinação              */
/* ------------------------------------------------------------------ */

/** Pega o documento pelo nome na lista base: uma fonte só para os textos. */
function doBase(nome: string, seq: number, obrigatorio?: boolean): DocumentoRegra {
  const b = DOCS_PROUNI.find((d) => d.nome === nome)
  if (!b) throw new Error(`Documento "${nome}" não existe na lista base do ProUni`)
  return { ...b, seq, obrigatorio: obrigatorio ?? b.obrigatorio }
}

/* Sem comprovante de residência desde a migração 30: o endereço é um só, o do
   grupo, e quem o comprova é o candidato. */
const DOCS_FAMILIAR_MAIOR: DocumentoRegra[] = [
  doBase('CPF', 1),
  doBase('RG', 2),
  doBase('CNH', 3),
  doBase('Carteira de Trabalho - CTPS', 4),
  doBase('Comprovante de renda - HOLERITE/CONTRACHEQUES', 5),
  doBase('Comprovante de renda - SIMEI, DECORE, DECLARAÇÃO DE RENDIMENTOS', 6),
  doBase('Comprovante de renda - CONTRATO SOCIAL + DECORE', 7),
  doBase('Comprovante de renda - EXTRATOS PREVIDÊNCIA/INSS', 8),
  doBase('Comprovante de renda - NOTA DE PRODUTOR', 9),
  doBase('Comprovante de renda - RECIBOS DE ALUGUEL', 10),
  doBase('Comprovante de renda - Declaração de imposto de renda', 11),
  doBase('Declaração de ausência de renda', 12),
]

/* Menor de idade não comprova renda nem vínculo de trabalho. São duas listas
   porque muito menor ainda não tirou RG: quem tem apresenta identificação,
   quem não tem apresenta a certidão de nascimento. A pergunta que separa os
   dois casos está no Portal, ao inserir o familiar. */
const DOCS_FAMILIAR_MENOR: DocumentoRegra[] = [
  doBase('RG', 1, true),
  doBase('CPF', 2, true),
]

/* A certidão não existe na lista do titular (candidato ao ProUni é maior de
   idade), então é o único documento que não vem de `DOCS_PROUNI`. */
const DOCS_FAMILIAR_MENOR_CERTIDAO: DocumentoRegra[] = [
  { seq: 1, nome: 'Certidão de Nascimento', obrigatorio: true, substituicao: [] },
]

function moduloFamiliar(
  slug: string, nome: string, descricao: string, documentos: DocumentoRegra[],
): Modulo {
  return {
    slug, nome, descricao,
    inicio: '27/08/2026',
    termino: '01/01/2027',
    situacao: 'Iniciado',
    ativo: true,
    destaque: true,
    linkPreenchimento: 'N/A',
    participantes: 0,
    aprovacao: 0,
    dist: { nova: 0, aberta: 0, progresso: 0, recebida: 0, finalizada: 0 },
    documentos,
    slas: SLA_PROUNI,
    emails: EMAILS_PROUNI,
    integracoes: [{ url: WEBHOOK_ERP, tentativas: 3, token: '-' }],
    amostra: [],
  }
}

export const MODULOS_FAMILIARES: Modulo[] = [
  moduloFamiliar(
    'prouni-familiares-maioridade',
    'PROUNI: Familiares maioridade',
    'Coleta documental dos membros do grupo familiar com 18 anos ou mais. Identificação, vínculo de trabalho e comprovação de renda.',
    DOCS_FAMILIAR_MAIOR,
  ),
  moduloFamiliar(
    'prouni-familiares-menoridade',
    'PROUNI: Familiares menoridade — RG e CPF',
    'Coleta documental dos membros do grupo familiar com menos de 18 anos que já possuem RG e CPF — menor de idade não comprova renda nem endereço.',
    DOCS_FAMILIAR_MENOR,
  ),
  moduloFamiliar(
    'prouni-familiares-menoridade-certidao',
    'PROUNI: Familiares menoridade — certidão de nascimento',
    'Coleta documental dos membros do grupo familiar com menos de 18 anos que ainda não possuem RG e CPF. A certidão de nascimento faz as vezes da identificação.',
    DOCS_FAMILIAR_MENOR_CERTIDAO,
  ),
]

export const MODULOS: Modulo[] = [
  {
    slug: 'pos-graduacao',
    nome: 'Pós-Graduação',
    // Descrição copiada literalmente do print (inclusive sem acento em "Modulo"/"graduacao").
    descricao: 'Modulo de coleta de documentos de pós-graduacao do ERP',
    inicio: '30/09/2025',
    termino: '01/01/2030',
    situacao: 'Iniciado',
    ativo: true,
    linkPreenchimento: 'N/A',
    participantes: 22085,
    aprovacao: 38,
    dist: { nova: 5422, aberta: 3779, progresso: 4405, recebida: 27, finalizada: 8452 },
    documentos: DOCS_POS,
    slas: SLA_ZERO,
    emails: EMAILS_PADRAO,
    integracoes: [{ url: WEBHOOK_ERP, tentativas: 1, token: '-' }],
    amostra: AMOSTRA_POS,
  },
  {
    slug: 'graduacao-regular',
    nome: 'Graduação (regular)',
    descricao: 'Coleta documental dos ingressantes de graduação regular',
    inicio: '27/02/2026',
    termino: '01/01/2040',
    situacao: 'Iniciado',
    ativo: true,
    linkPreenchimento: 'N/A',
    participantes: 2,
    aprovacao: 0,
    dist: { nova: 2, aberta: 0, progresso: 0, recebida: 0, finalizada: 0 },
    documentos: DOCS_GRAD,
    slas: SLA_ZERO,
    emails: EMAILS_PADRAO,
    integracoes: [{ url: WEBHOOK_ERP, tentativas: 1, token: '-' }],
    amostra: [],
  },
  {
    slug: 'graduacao-2-graduacao',
    nome: 'Graduação (2 graduação)',
    descricao: 'Coleta documental de alunos em segunda graduação',
    inicio: '27/02/2026',
    termino: '01/01/2040',
    situacao: 'Iniciado',
    ativo: true,
    linkPreenchimento: 'N/A',
    participantes: 453,
    aprovacao: 0,
    dist: { nova: 310, aberta: 70, progresso: 72, recebida: 1, finalizada: 0 },
    documentos: DOCS_GRAD,
    slas: SLA_ZERO,
    emails: EMAILS_PADRAO,
    integracoes: [{ url: WEBHOOK_ERP, tentativas: 1, token: '-' }],
    amostra: [],
  },
  {
    slug: 'segunda-graduacao-2026-3',
    nome: 'Segunda Graduação 2026.3',
    descricao: 'Coleta documental da entrada 2026.3 de segunda graduação',
    inicio: '03/06/2026',
    termino: '31/01/2027',
    situacao: 'Iniciado',
    ativo: true,
    linkPreenchimento: 'N/A',
    participantes: 4,
    aprovacao: 0,
    dist: { nova: 0, aberta: 0, progresso: 4, recebida: 0, finalizada: 0 },
    documentos: DOCS_GRAD,
    slas: SLA_ZERO,
    emails: EMAILS_PADRAO,
    integracoes: [{ url: WEBHOOK_ERP, tentativas: 1, token: '-' }],
    amostra: [],
  },

  ...MODULOS_PROUNI,
  ...MODULOS_FAMILIARES,
]



export function getModulo(slug: string): Modulo | undefined {
  return MODULOS.find((m) => m.slug === slug)
}

/** Templates de relatório — quatro cards, iguais ao print. */
export const RELATORIO_TEMPLATES = [
  'Relatório de alunos por status',
  'Relatório de documentos validados',
  'Relatório SLA',
  'Relatório de documentos reprovados por IA',
]

/* ------------------------------------------------------------------ */
/* Geração da lista completa de participantes (para paginação real)    */
/* ------------------------------------------------------------------ */
const PRIMEIROS = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabriela', 'Heitor', 'Ingrid', 'João', 'Karina', 'Lucas', 'Mariana', 'Nathan', 'Otávio', 'Paula', 'Rafael', 'Sabrina', 'Thiago', 'Vitória']
const MEIOS = ['Alves', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferreira', 'Gomes', 'Henrique', 'Ibrahim', 'Junqueira']
const ULTIMOS = ['Da Silva', 'Dos Santos', 'De Oliveira', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Ribeiro', 'Martins']
const STATUS_CICLO: ColetaStatus[] = ['aberta', 'progresso', 'nova', 'finalizada', 'progresso', 'recebida', 'aberta', 'finalizada']

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

/** Lista completa do módulo: amostra nominal + registros derivados. */
export function listarParticipantes(m: Modulo): Participante[] {
  const total = Math.min(m.participantes, 120)
  const out = [...m.amostra]
  for (let i = out.length; i < total; i++) {
    const nome = `${PRIMEIROS[i % PRIMEIROS.length]} ${MEIOS[i % MEIOS.length]} ${ULTIMOS[(i * 3) % ULTIMOS.length]}`
    const status = STATUS_CICLO[i % STATUS_CICLO.length]
    out.push({
      id: `${m.slug}-${i}`,
      nome,
      email: `${semAcento(nome).slice(0, 18)}${i}@exemplo.com`,
      recebimento: status === 'nova' || status === 'aberta' ? null : `${String((i % 28) + 1).padStart(2, '0')}/05/2026`,
      sla: m.slas.aberta ? `${m.slas.aberta}h` : 'N/A',
      status,
    })
  }
  return out
}

/** KPIs agregados da tela inicial (Módulos), somando os módulos visíveis. */
export function agregarKpis(mods: Modulo[]) {
  const dist: Record<ColetaStatus, number> = { nova: 0, aberta: 0, progresso: 0, recebida: 0, finalizada: 0 }
  let participantes = 0
  for (const m of mods) {
    participantes += m.participantes
    for (const s of STATUS_ORDEM) dist[s] += m.dist[s]
  }
  return { modulos: mods.length, participantes, dist }
}

export function pct(valor: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((valor / total) * 100)}%`
}
