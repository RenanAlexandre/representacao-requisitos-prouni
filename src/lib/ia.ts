/* ==================================================================
 * Verificação de documento por IA — a costura, não o modelo.
 *
 * O que esta camada define é o CONTRATO: entra um arquivo e o nome do
 * documento que ele diz ser; sai um veredito com motivo, confiança e o
 * que foi extraído. Quem responde hoje é uma heurística de nome de
 * arquivo — um substituto declarado, não uma tentativa de acertar.
 *
 * Para plugar o modelo de verdade, troque o corpo de `analisar` por uma
 * chamada (Edge Function, worker, API) que devolva `ParecerIA`. Nada
 * mais no app precisa mudar: a tela e o banco já falam esta linguagem.
 * ================================================================== */

export interface ParecerIA {
  status: 'aprovado_ia' | 'reprovado_ia'
  motivo: string
  /** 0 a 1. Quanto o parecer é confiável. */
  confianca: number
  /** Campos que a IA leria do documento. Hoje vem quase vazio. */
  extraido: Record<string, unknown>
}

/**
 * Palavras que sugerem que o arquivo é o documento certo.
 *
 * A chave é um trecho do nome do documento exigido; o valor, os termos que
 * o modelo real procuraria no conteúdo e que aqui são procurados no nome do
 * arquivo.
 */
const PISTAS: { casa: RegExp; termos: string[] }[] = [
  { casa: /ficha de inscri/i, termos: ['ficha', 'inscricao', 'inscrição', 'sisprouni', 'sispro', 'prouni'] },
  { casa: /^cnh$/i, termos: ['cnh', 'habilitacao', 'habilitação', 'carteira-de-motorista'] },
  { casa: /^rg$/i, termos: ['rg', 'identidade', 'ident'] },
  { casa: /^cpf$/i, termos: ['cpf'] },
  { casa: /certid[aã]o de nascimento/i, termos: ['certidao', 'certidão', 'nascimento', 'nasc'] },
  /* Sem esta regra o comprovante de residência caía no ramo "sem regra
     cadastrada" e era aprovado com qualquer nome de arquivo — um buraco na
     demonstração, já que ele é obrigatório em todos os módulos. */
  /* Antes da regra genérica de residência: os dois documentos têm "Residência"
     no nome, e o caso do aluguel espera papel diferente de conta de luz. */
  { casa: /alugado ou cedido/i, termos: ['contrato', 'locacao', 'locação', 'aluguel', 'cedido', 'cessao', 'cessão', 'comodato', 'declaracao', 'declaração', 'proprietario', 'proprietário', 'imovel', 'imóvel'] },
  { casa: /resid[eê]ncia/i, termos: ['residencia', 'residência', 'comprovante', 'conta', 'agua', 'água', 'energia', 'luz', 'gas', 'gás', 'telefone', 'iptu', 'ipva', 'condominio', 'condomínio', 'fatura', 'boleto', 'locacao', 'locação', 'contrato'] },
  { casa: /estado civil/i, termos: ['certidao', 'certidão', 'casamento', 'nascimento', 'uniao', 'união', 'divorcio', 'divórcio', 'obito', 'óbito', 'estado-civil'] },
  { casa: /hist[oó]rico/i, termos: ['historico', 'histórico', 'certificado', 'conclusao', 'conclusão', 'ensino-medio', 'medio', 'médio'] },
  { casa: /carteira de trabalho|ctps/i, termos: ['ctps', 'carteira', 'trabalho'] },
  { casa: /imposto de renda/i, termos: ['irpf', 'imposto', 'renda', 'receita', 'dirpf', 'declaracao', 'declaração'] },
  { casa: /holerite|contracheque/i, termos: ['holerite', 'holerites', 'contracheque', 'contra-cheque', 'salario', 'salário', 'pagamento', 'servidor'] },
  { casa: /simei|decore/i, termos: ['simei', 'decore', 'rendimento', 'autonomo', 'autônomo', 'mei'] },
  { casa: /contrato social/i, termos: ['contrato', 'social', 'decore', 'empresa', 'cnpj'] },
  { casa: /previd[eê]ncia|inss/i, termos: ['inss', 'previdencia', 'previdência', 'extrato', 'aposentad', 'beneficio', 'benefício'] },
  { casa: /nota de produtor/i, termos: ['produtor', 'nota', 'rural', 'agricultor'] },
  { casa: /recibos? de aluguel/i, termos: ['aluguel', 'locacao', 'locação', 'recibo', 'imovel', 'imóvel'] },
  { casa: /ra[çc]a e cor/i, termos: ['raca', 'raça', 'cor', 'ppi', 'autodeclaracao', 'autodeclaração', 'etnico', 'étnico'] },
  { casa: /encerramento de v[ií]nculo|encerramento de matr[ií]cula/i, termos: ['encerramento', 'vinculo', 'vínculo', 'matricula', 'matrícula', 'desligamento', 'transferencia', 'transferência'] },
  { casa: /usufruto|fies/i, termos: ['usufruto', 'fies', 'bolsa', 'prouni', 'encerramento', 'renuncia', 'renúncia'] },
]

const MIMES_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAX = 10 * 1024 * 1024

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Analisa o arquivo contra o documento que ele diz ser.
 *
 * Ordem das checagens: primeiro o que é objetivo (tipo e tamanho do arquivo),
 * depois o palpite sobre o conteúdo. Assim um PDF corrompido não vira
 * "documento errado", e a mensagem devolvida diz o que de fato houve.
 */
export async function analisar(arquivo: File, nomeDocumento: string): Promise<ParecerIA> {
  /* Latência simulada: sem ela a tela pisca e não dá para ver o estado
     "analisando", que é justamente o que o modelo real vai custar. */
  await new Promise((r) => setTimeout(r, 700))

  if (!MIMES_ACEITOS.includes(arquivo.type)) {
    return {
      status: 'reprovado_ia',
      motivo: `Formato não aceito (${arquivo.type || 'desconhecido'}). Envie PDF, JPG, PNG ou WEBP.`,
      confianca: 1,
      extraido: {},
    }
  }

  if (arquivo.size > TAMANHO_MAX) {
    return {
      status: 'reprovado_ia',
      motivo: `Arquivo de ${(arquivo.size / 1024 / 1024).toFixed(1)} MB — o limite é 10 MB.`,
      confianca: 1,
      extraido: {},
    }
  }

  const pista = PISTAS.find((p) => p.casa.test(nomeDocumento))
  const nome = semAcento(arquivo.name)
  const encontrados = pista ? pista.termos.filter((t) => nome.includes(semAcento(t))) : []

  /* Sem regra cadastrada para este documento, a heurística não tem o que
     dizer — aprova com confiança baixa em vez de reprovar por ignorância. */
  if (!pista) {
    return {
      status: 'aprovado_ia',
      motivo: 'Sem regra de verificação para este documento — aceito para análise da Secretaria.',
      confianca: 0.3,
      extraido: extrairBasico(arquivo),
    }
  }

  if (encontrados.length === 0) {
    return {
      status: 'reprovado_ia',
      motivo:
        `O arquivo "${arquivo.name}" não parece ser ${nomeDocumento}. ` +
        `Confira se anexou o documento certo.`,
      confianca: 0.75,
      extraido: extrairBasico(arquivo),
    }
  }

  return {
    status: 'aprovado_ia',
    motivo: `Reconhecido como ${nomeDocumento}.`,
    confianca: Math.min(0.6 + encontrados.length * 0.15, 0.98),
    extraido: { ...extrairBasico(arquivo), termos_reconhecidos: encontrados },
  }
}

/** O que dá para saber do arquivo sem abrir o conteúdo. */
function extrairBasico(arquivo: File): Record<string, unknown> {
  return {
    nome_arquivo: arquivo.name,
    tipo: arquivo.type,
    tamanho_bytes: arquivo.size,
    modificado_em: new Date(arquivo.lastModified).toISOString(),
  }
}
