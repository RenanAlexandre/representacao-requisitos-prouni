import municipios from './municipios.json'

/**
 * Opções dos campos da landing page de captação.
 *
 * A lista de municípios é a do IBGE (5.571 cidades), reduzida a
 * `{ UF: [nomes] }` em `municipios.json`.
 */

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const POR_UF = municipios as Record<string, string[]>

export function municipiosDe(uf: string): string[] {
  return POR_UF[uf] ?? []
}

export const SEXOS = ['Feminino', 'Masculino', 'Outro', 'Prefiro não informar']

/** Do ano corrente até 1960 — quem concluiu o Ensino Médio há mais tempo também se inscreve. */
export const ANOS_CONCLUSAO = Array.from({ length: new Date().getFullYear() - 1959 }, (_, i) =>
  String(new Date().getFullYear() - i),
)

/*
 * Raça/cor, escolaridade, curso, polo (local de oferta) e plano de pagamento
 * saíram daqui — são as tabelas de domínio (`racas`, `escolaridades`,
 * `cursos`, `polos`, `planos_pagamento`) e agora vêm do Supabase via
 * `src/lib/dominio.ts` (`carregarDominioLanding`). `SEXOS` e `ANOS_CONCLUSAO`
 * continuam fixos aqui porque não têm tabela própria no banco.
 */

/* ------------------------------------------------------------------ */
/* Termo de comprovação de cota                                        */
/* ------------------------------------------------------------------ */

/**
 * Aberto quando o candidato se declara cotista na inscrição.
 *
 * A consequência documental está na seção 3.3.1 do
 * `DEMONSTRATIVO DE REQUISITOS - GENDOCS PROUNI.docx`: a Declaração de Raça e
 * Cor é exigida **somente se o candidato declarar ser cotista PPI**. É essa
 * declaração que este termo formaliza.
 */
export const TERMO_COTA = {
  titulo: 'Termo de Comprovação de Cota',
  abertura:
    'Ao se declarar cotista, você assume o compromisso de comprovar a modalidade de cota em que foi pré-selecionado no ProUni. Leia antes de confirmar.',
  clausulas: [
    {
      titulo: 'Modalidade declarada',
      texto:
        'A modalidade de cota é a mesma da sua pré-seleção no ProUni e consta da sua ficha de inscrição. Este termo não altera a modalidade — apenas registra que você a assume e se compromete a comprová-la.',
    },
    {
      titulo: 'Documentação exigida',
      texto:
        'Candidato que se declara cotista PPI (preto, pardo ou indígena) deve entregar a Declaração de Raça e Cor, que passa a constar como documento obrigatório na sua coleta no GenDocs. As demais modalidades seguem a lista documental prevista no edital.',
    },
    {
      titulo: 'Veracidade',
      texto:
        'Declaro que as informações prestadas são verdadeiras e estou ciente de que a declaração falsa configura infração e implica a perda da bolsa, sem prejuízo das sanções previstas em lei.',
    },
    {
      titulo: 'Análise',
      texto:
        'A comprovação de cota é analisada pela Secretaria ProUni junto dos demais documentos, item a item, dentro do prazo da chamada. Reprovado o item, você é notificado por e-mail e pode reenviá-lo enquanto a janela estiver aberta.',
    },
  ],
  declaracao:
    'Declaro que sou cotista, assumo a modalidade de cota da minha pré-seleção no ProUni e me comprometo a comprová-la com a documentação exigida dentro do prazo.',
}

/* ------------------------------------------------------------------ */
/* CEP — consulta ao ViaCEP                                            */
/* ------------------------------------------------------------------ */

export interface EnderecoCep {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

/**
 * Tabela local de reserva. O caminho normal é o ViaCEP; ela só entra quando a
 * chamada falha (sem rede, serviço fora do ar) para a demonstração não travar.
 */
const CEPS_RESERVA: Record<string, EnderecoCep> = {
  '87708160': { logradouro: 'Rua Otacílio Egger', bairro: 'Jardim Farropilha', cidade: 'Paranavaí', uf: 'PR' },
  '87005270': { logradouro: 'Rua Ivaí', bairro: 'Vila Marumby', cidade: 'Maringá', uf: 'PR' },
  '87020025': { logradouro: 'Avenida Brasil', bairro: 'Zona 01', cidade: 'Maringá', uf: 'PR' },
  '87501000': { logradouro: 'Avenida Paraná', bairro: 'Centro', cidade: 'Umuarama', uf: 'PR' },
  '86010160': { logradouro: 'Rua Sergipe', bairro: 'Centro', cidade: 'Londrina', uf: 'PR' },
}

export type ResultadoCep =
  | { ok: true; origem: 'viacep' | 'reserva'; endereco: EnderecoCep }
  | { ok: false; motivo: 'invalido' | 'nao-encontrado' | 'indisponivel' }

/**
 * Busca o endereço de um CEP no ViaCEP (`viacep.com.br/ws/{cep}/json/`).
 *
 * O serviço é público e não pede chave. Sai daqui apenas o CEP digitado.
 * CEPs de logradouro único (ex.: 87700-000) voltam com rua e bairro vazios —
 * é o comportamento do próprio ViaCEP, e nesse caso o candidato completa à mão.
 */
export async function buscarCep(cep: string, signal?: AbortSignal): Promise<ResultadoCep> {
  const d = so(cep)
  if (d.length !== 8) return { ok: false, motivo: 'invalido' }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal })
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)

    const json = (await resposta.json()) as {
      erro?: boolean | string
      logradouro?: string
      bairro?: string
      localidade?: string
      uf?: string
    }
    if (json.erro) return { ok: false, motivo: 'nao-encontrado' }

    return {
      ok: true,
      origem: 'viacep',
      endereco: {
        logradouro: json.logradouro ?? '',
        bairro: json.bairro ?? '',
        cidade: json.localidade ?? '',
        uf: json.uf ?? '',
      },
    }
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro
    const reserva = CEPS_RESERVA[d]
    if (reserva) return { ok: true, origem: 'reserva', endereco: reserva }
    return { ok: false, motivo: 'indisponivel' }
  }
}

/* ------------------------------------------------------------------ */
/* Máscaras                                                            */
/* ------------------------------------------------------------------ */

const so = (v: string) => v.replace(/\D/g, '')

export function mascaraCpf(v: string) {
  const d = so(v).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function mascaraRg(v: string) {
  return v.replace(/[^0-9A-Za-z.\-/]/g, '').slice(0, 15).toUpperCase()
}

export function mascaraCep(v: string) {
  const d = so(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function mascaraDdd(v: string) {
  return so(v).slice(0, 2)
}

export function mascaraTelefone(v: string) {
  const d = so(v).slice(0, 9)
  if (d.length <= 4) return d
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function apenasDigitos(v: string) {
  return so(v)
}
