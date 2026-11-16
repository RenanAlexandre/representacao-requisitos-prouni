import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

/**
 * Consulta real ao ERP — `processos_seletivos`, `concursos` e `turmas`.
 *
 * As três tabelas têm leitura liberada pro `anon` (política
 * `leitura_publica_erp` no `01-schema.sql`) porque o protótipo não tem login
 * de Secretaria ainda; a escrita continua só por `service_role`. É uma
 * exceção deliberada — as demais tabelas de backoffice (`modulos_gendocs`,
 * `ofertas` etc.) seguem totalmente fechadas.
 *
 * As interfaces abaixo são as mesmas que já existiam em `src/data/erp.ts` —
 * os campos já chegam formatados como o ERP de referência mostra em tela
 * ("Sim"/"Não", "--" quando vazio, data no padrão `dd/mm/aaaa às HH:mm`),
 * pra não precisar tocar no JSX de `pages/erp/ProcessosSeletivos.tsx`.
 */

export interface ProcessoSeletivo {
  id: string
  nome: string
  codigo: string
  periodoLetivo: string
  nivelEnsino: string
  ativo: boolean
  edital: string
  criadoEm: string
  alteradoEm: string
}

export interface Concurso {
  id: string
  nome: string
  tipo: string
  origem: string
  ativo: boolean
  inicio: string
  fim: string
  requerProva: string
  taxaInscricao: string
  tipoClassificacao: string
  dataVestibular: string
  vagas: string
  provasPublicadas: string
  resultadoPublicado: string
  exibirRequerimento: string
  criadoEm: string
  alteradoEm: string
}

export interface Turma {
  id: string
  nome: string
  periodoLetivo: string
  curso: string
  curriculo: string
  processoSeletivo: string
  ativo: boolean
}

/* ------------------------------------------------------------------ */
/* Formatação — mesma convenção visual do ERP de referência            */
/* ------------------------------------------------------------------ */

const FORMATADOR_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** "22/12/2026 às 00:00" — sempre em America/Sao_Paulo, não no fuso do visitante. */
function dataHora(iso: string | null): string {
  if (!iso) return '--'
  const partes = FORMATADOR_DATA_HORA.formatToParts(new Date(iso))
  const pega = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  return `${pega('day')}/${pega('month')}/${pega('year')} às ${pega('hour')}:${pega('minute')}`
}

const simNao = (v: boolean) => (v ? 'Sim' : 'Não')
const ou = (v: string | null | undefined, vazio = '--') => (v ? v : vazio)

/* ------------------------------------------------------------------ */
/* Mapeamento linha do banco → forma que a tela já espera              */
/* ------------------------------------------------------------------ */

interface LinhaProcesso {
  id: string
  nome: string
  codigo: string
  periodo_letivo: string
  nivel_ensino: string
  ativo: boolean
  edital: string | null
  created_at: string
  updated_at: string
}

function mapProcesso(l: LinhaProcesso): ProcessoSeletivo {
  return {
    id: l.id,
    nome: l.nome,
    codigo: l.codigo,
    periodoLetivo: l.periodo_letivo,
    nivelEnsino: l.nivel_ensino,
    ativo: l.ativo,
    edital: ou(l.edital),
    criadoEm: dataHora(l.created_at),
    alteradoEm: dataHora(l.updated_at),
  }
}

interface LinhaConcurso {
  id: string
  nome: string
  tipo: string | null
  origem: string | null
  ativo: boolean
  inicio: string | null
  fim: string | null
  requer_prova: boolean
  taxa_inscricao: number | null
  tipo_classificacao: string | null
  data_vestibular: string | null
  vagas: number | null
  provas_publicadas: boolean
  resultado_publicado: boolean
  exibir_requerimento: boolean
  created_at: string
  updated_at: string
}

function mapConcurso(l: LinhaConcurso): Concurso {
  return {
    id: l.id,
    nome: l.nome,
    tipo: ou(l.tipo),
    origem: ou(l.origem),
    ativo: l.ativo,
    inicio: dataHora(l.inicio),
    fim: dataHora(l.fim),
    requerProva: simNao(l.requer_prova),
    taxaInscricao: l.taxa_inscricao == null ? 'Sem taxa de inscrição' : FORMATADOR_MOEDA.format(l.taxa_inscricao),
    tipoClassificacao: ou(l.tipo_classificacao),
    dataVestibular: dataHora(l.data_vestibular),
    vagas: l.vagas == null ? '--' : String(l.vagas),
    provasPublicadas: simNao(l.provas_publicadas),
    resultadoPublicado: simNao(l.resultado_publicado),
    exibirRequerimento: simNao(l.exibir_requerimento),
    criadoEm: dataHora(l.created_at),
    alteradoEm: dataHora(l.updated_at),
  }
}

interface LinhaTurma {
  id: string
  nome: string
  periodo_letivo: string | null
  curriculo: string | null
  ativo: boolean
  cursos: { nome: string } | null
  processos_seletivos: { nome: string } | null
}

function mapTurma(l: LinhaTurma): Turma {
  return {
    id: l.id,
    nome: l.nome,
    periodoLetivo: ou(l.periodo_letivo),
    curso: ou(l.cursos?.nome ?? null),
    curriculo: ou(l.curriculo),
    processoSeletivo: ou(l.processos_seletivos?.nome ?? null),
    ativo: l.ativo,
  }
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export async function listarProcessosSeletivos(): Promise<ProcessoSeletivo[]> {
  const { data, error } = await supabase
    .from('processos_seletivos')
    .select('id, nome, codigo, periodo_letivo, nivel_ensino, ativo, edital, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Falha ao carregar processos seletivos: ${error.message}`)
  return (data ?? []).map(mapProcesso)
}

export async function buscarProcessoSeletivo(id: string): Promise<ProcessoSeletivo | null> {
  const { data, error } = await supabase
    .from('processos_seletivos')
    .select('id, nome, codigo, periodo_letivo, nivel_ensino, ativo, edital, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar o processo seletivo: ${error.message}`)
  return data ? mapProcesso(data) : null
}

export async function listarConcursos(psId: string): Promise<Concurso[]> {
  const { data, error } = await supabase
    .from('concursos')
    .select(
      `id, nome, tipo, origem, ativo, inicio, fim, requer_prova, taxa_inscricao,
       tipo_classificacao, data_vestibular, vagas, provas_publicadas, resultado_publicado,
       exibir_requerimento, created_at, updated_at`,
    )
    .eq('processo_seletivo_id', psId)
    .order('created_at')
  if (error) throw new Error(`Falha ao carregar concursos: ${error.message}`)
  return (data ?? []).map((l) => mapConcurso(l as unknown as LinhaConcurso))
}

export async function buscarConcurso(concursoId: string): Promise<Concurso | null> {
  const { data, error } = await supabase
    .from('concursos')
    .select(
      `id, nome, tipo, origem, ativo, inicio, fim, requer_prova, taxa_inscricao,
       tipo_classificacao, data_vestibular, vagas, provas_publicadas, resultado_publicado,
       exibir_requerimento, created_at, updated_at`,
    )
    .eq('id', concursoId)
    .maybeSingle()
  if (error) throw new Error(`Falha ao carregar o concurso: ${error.message}`)
  return data ? mapConcurso(data as unknown as LinhaConcurso) : null
}

export async function listarTurmas(psId: string): Promise<Turma[]> {
  const { data, error } = await supabase
    .from('turmas')
    .select('id, nome, periodo_letivo, curriculo, ativo, cursos(nome), processos_seletivos(nome)')
    .eq('processo_seletivo_id', psId)
    .order('created_at')
  if (error) throw new Error(`Falha ao carregar turmas: ${error.message}`)
  return (data ?? []).map((l) => mapTurma(l as unknown as LinhaTurma))
}

/* ------------------------------------------------------------------ */
/* Hooks — carregamento + erro, para as telas de detalhe               */
/* ------------------------------------------------------------------ */

interface EstadoCarga<T> {
  dado: T | null
  carregando: boolean
  erro: string | null
}

function usarCarga<T>(buscar: () => Promise<T>, deps: unknown[]): EstadoCarga<T> {
  const [dado, setDado] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErro(null)
    setDado(null)

    buscar()
      .then((d) => {
        if (!cancelado) {
          setDado(d)
          setCarregando(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : String(e))
          setCarregando(false)
        }
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { dado, carregando, erro }
}

export function useProcessoSeletivo(psId: string) {
  const { dado, carregando, erro } = usarCarga(() => buscarProcessoSeletivo(psId), [psId])
  return { ps: dado, carregando, erro }
}

export function useConcursos(psId: string) {
  const { dado, carregando, erro } = usarCarga(() => listarConcursos(psId), [psId])
  return { concursos: dado, carregando, erro }
}

export function useConcurso(concursoId: string) {
  const { dado, carregando, erro } = usarCarga(() => buscarConcurso(concursoId), [concursoId])
  return { concurso: dado, carregando, erro }
}

export function useTurmas(psId: string) {
  const { dado, carregando, erro } = usarCarga(() => listarTurmas(psId), [psId])
  return { turmas: dado, carregando, erro }
}

export function useProcessosSeletivos() {
  const { dado, carregando, erro } = usarCarga(() => listarProcessosSeletivos(), [])
  return { processos: dado, carregando, erro }
}
