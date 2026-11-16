import { supabase } from './supabaseClient'
import { avisarMudanca } from './tempo-real'

/* ==================================================================
 * A API do protótipo.
 *
 * Nenhuma tabela de dado pessoal é lida direto: tudo passa pelas
 * funções `security definer` do banco (ver `supabase/04-api.sql`),
 * que exigem um token de sessão e devolvem só as linhas do candidato.
 * ================================================================== */

const CHAVE_SESSAO = 'prouni.portal.token'

export function guardarSessao(token: string) {
  sessionStorage.setItem(CHAVE_SESSAO, token)
}

export function lerSessao(): string | null {
  return sessionStorage.getItem(CHAVE_SESSAO)
}

export function limparSessao() {
  sessionStorage.removeItem(CHAVE_SESSAO)
}

/** Erro de sessão expirada — as telas do portal redirecionam para o login. */
export class SessaoInvalida extends Error {
  constructor() {
    super('Sessão expirada. Entre de novo.')
    this.name = 'SessaoInvalida'
  }
}

/**
 * A função existe no código, mas não no banco: a migração que a cria ainda não
 * rodou. Vale um erro próprio porque a decisão é de quem chama — às vezes dá
 * para seguir pela assinatura antiga, às vezes é preciso parar e avisar.
 */
export class FuncaoAusente extends Error {
  constructor(public readonly fn: string) {
    super(`A função "${fn}" ainda não existe no banco — falta rodar a migração que a cria.`)
    this.name = 'FuncaoAusente'
  }
}

async function chamar<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    /* 28000 é o código que `sessao_candidato` levanta quando o token morreu. */
    if (error.code === '28000' || /sess[aã]o inv[aá]lida/i.test(error.message)) {
      limparSessao()
      throw new SessaoInvalida()
    }
    /* PGRST202: o PostgREST não achou a função com esta assinatura. */
    if (error.code === 'PGRST202') throw new FuncaoAusente(fn)
    throw new Error(error.message)
  }
  return data as T
}

function token(): string {
  const t = lerSessao()
  if (!t) throw new SessaoInvalida()
  return t
}

/* ------------------------------------------------------------------ */
/* Inscrição na landing page                                           */
/* ------------------------------------------------------------------ */

export interface DadosInscricao {
  nome: string
  cpf: string
  rg: string
  /** Órgão que emitiu o RG, como o candidato digitou (ex.: SSP/PR). */
  rg_orgao_expedidor: string
  nascimento: string
  sexo: string
  raca: string
  uf_naturalidade: string
  municipio_naturalidade: string
  email: string
  ddd: string
  telefone: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  escolaridade: string
  ano_conclusao: string
  curso: string
  plano: string
  aceite_contato: boolean
  aceite_cota: boolean
  declara_encerramento_matricula: boolean
  declara_encerramento_beneficio: boolean
  declara_professor_rede_publica: boolean
  /**
   * ANDAIME. Força a inscrição a cair numa chamada que não é a de hoje, com o
   * dia equivalente. Não existe no produto — lá quem decide é só o calendário.
   */
  chamada_simulada?: string | null
}

export interface ResultadoInscricao {
  candidato_id: string
  protocolo: string
  token: string
  processo: string
  cotista: boolean
  /** 1 quando a coleta foi aberta agora; 0 se o grupo já tinha uma. */
  modulos: number
  /** Nome do módulo em que o candidato caiu, pela combinação das declarações. */
  modulo: string | null
}

/**
 * Cria o candidato, a inscrição no processo seletivo correspondente à
 * declaração de cota, e abre a coleta dele no GenDocs. Devolve já uma sessão
 * do portal — o candidato entra logado.
 */
export async function inscrever(dados: DadosInscricao): Promise<ResultadoInscricao> {
  const r = await chamar<ResultadoInscricao>('lp_criar_candidato', { p_dados: dados })
  guardarSessao(r.token)
  avisarMudanca('candidato', 'grupo', 'coleta')
  return r
}

/* ------------------------------------------------------------------ */
/* Calendário das chamadas (landing)                                   */
/* ------------------------------------------------------------------ */

export interface ChamadaDoProcesso {
  nome: string
  chamada: string
  inicio: string
  fim: string
  processo_seletivo: string
  /** É esta que recebe quem se inscrever agora. */
  vigente: boolean
  dias: number
  /* ANDAIME (migração 42) — só serve ao seletor de demonstração da landing:
     em que data a inscrição ficaria se fosse simulada nesta chamada. */
  data_equivalente: string
  dia_ordinal: number
}

/**
 * As três janelas do processo, como estão parametrizadas no ERP.
 *
 * A landing é uma só e capta para os três concursos; quem separa é a data em
 * que o candidato preenche. `vigente` vem da MESMA função que a inscrição usa
 * para decidir (`concurso_vigente`), então a tela não pode prometer uma
 * chamada e o cadastro gravar outra.
 */
export function listarChamadas() {
  return chamar<ChamadaDoProcesso[]>('lp_chamadas', {})
}

/* ------------------------------------------------------------------ */
/* Portal do Candidato                                                 */
/* ------------------------------------------------------------------ */

export interface Sessao {
  token: string
  protocolo: string
  nome: string
}

export async function entrar(cpf: string, nascimento: string): Promise<Sessao> {
  const r = await chamar<Sessao>('portal_entrar', { p_cpf: cpf, p_nascimento: nascimento })
  guardarSessao(r.token)
  return r
}

export async function sair() {
  const t = lerSessao()
  if (t) await supabase.rpc('portal_sair', { p_token: t })
  limparSessao()
}

export interface MeusDados {
  protocolo: string
  nome: string
  cpf: string
  rg: string
  rg_orgao_expedidor: string | null
  nascimento: string
  sexo: string
  raca: string | null
  /** A raça declarada caracteriza cota PPI. */
  raca_ppi: boolean | null
  uf_naturalidade: string
  municipio_naturalidade: string
  email: string
  ddd: string
  telefone: string
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  uf: string
  escolaridade: string | null
  ano_conclusao_em: number | null
  curso: string | null
  area_conhecimento: string | null
  tipo_formacao: string | null
  modalidade: string | null
  duracao: string | null
  polo: string | null
  plano: string | null
  tipo_bolsa: string | null
  plano_percentual: number | null
  aceite_contrato: boolean
  aceite_contrato_em: string | null
  aceite_contato: boolean
  aceite_contato_em: string | null
  aceite_cota: boolean
  aceite_cota_em: string | null
  /* As quatro declarações do Sisprouni — juntas escolhem o módulo de coleta. */
  declara_encerramento_matricula: boolean
  declara_encerramento_beneficio: boolean
  declara_professor_rede_publica: boolean
  inscrito_em: string
  cota: string | null
  chamada: string | null
  /* O concurso em que a inscrição caiu — é a janela DELE que o candidato vê. */
  concurso: string | null
  concurso_inicio: string | null
  concurso_fim: string | null
  dias_na_chamada: number | null
  status_inscricao: string | null
  modulo_coleta: string | null
  processo_seletivo: string | null
  envio_inicio: string | null
  envio_fim: string | null
  dias_restantes: number | null
}

export function meusDados() {
  return chamar<MeusDados>('portal_meus_dados', { p_token: token() })
}

export interface ParticipanteGrupo {
  participante_id: string
  membro_id: string | null
  titular: boolean
  nome: string
  parentesco: string | null
  email: string
  nascimento: string | null
  maior_de_idade: boolean
  modulo: string
  modulo_slug: string
  perfil: string
  status_coleta: string
  prazo_em: string | null
  /** Só os OBRIGATÓRIOS: os opcionais são caminhos para cumprir um deles. */
  total_documentos: number
  aprovados: number
  em_analise: number
  reprovados: number
  pendentes: number
  /** Quantos opcionais existem na lista, fora da contagem acima. */
  opcionais: number
}

export function meuGrupo() {
  return chamar<ParticipanteGrupo[]>('portal_meu_grupo', { p_token: token() })
}

export interface DocumentoColeta {
  sequencia: number
  nome: string
  obrigatorio: boolean
  status: 'pendente' | 'enviado' | 'analise' | 'aprovado' | 'reprovado' | 'aprovado_ia' | 'reprovado_ia'
  enviado_em: string | null
  motivo_recusa: string | null
  /** Situação do item já contando os substitutos: o que o candidato precisa saber. */
  estado: 'aprovado' | 'analise' | 'reprovado' | 'pendente'
  resolvido: boolean
  substitui: string[]
  dispensado_por: string[]
}

export function documentosDe(participanteId: string) {
  return chamar<DocumentoColeta[]>('portal_documentos', {
    p_token: token(),
    p_participante_id: participanteId,
  })
}

export interface FamiliarInserido {
  membro_id: string
  maior_de_idade: boolean
  email_notificacao: string
  /* Só existem a partir da migração 26 — banco anterior não devolve. */
  tem_identificacao?: boolean
  /** Nome do módulo em que a coleta dele foi aberta. */
  modulo?: string
}

/** Mesma conta de `maior_de_idade()` no banco, para decidir antes de chamar. */
function menorDeIdade(iso: string): boolean {
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() - 18)
  return new Date(`${iso}T00:00:00`) > limite
}

/**
 * `temIdentificacao` responde "esta pessoa tem RG e CPF?".
 *
 * Para o menor de idade é o que decide o módulo: quem tem leva RG + CPF +
 * residência; quem não tem leva certidão de nascimento + residência. Para o
 * maior de idade não muda o módulo — RG e CPF são exigidos de qualquer forma
 * (ou a CNH, que cobre os dois).
 */
export async function inserirFamiliar(
  nome: string, nascimento: string, parentesco: string, temIdentificacao: boolean,
) {
  const base = {
    p_token: token(),
    p_nome: nome,
    p_nascimento: nascimento,
    p_parentesco: parentesco,
  }

  try {
    const r = await chamar<FamiliarInserido>('portal_inserir_familiar', {
      ...base,
      p_tem_identificacao: temIdentificacao,
    })
    avisarMudanca('grupo', 'coleta')
    return r
  } catch (erro) {
    if (!(erro instanceof FuncaoAusente)) throw erro

    /* Banco anterior à migração 26: só existe a assinatura de 4 argumentos.
       Ela decide o módulo só pela idade, o que dá o MESMO resultado para
       maiores e para menores com RG e CPF — nesses casos seguir pela antiga
       é correto, e é melhor do que deixar a inserção quebrada.

       Menor SEM identificação é o único caso que depende do módulo novo.
       Aí não dá para seguir: cairia na lista de RG e CPF, pedindo a essa
       pessoa justamente o documento que ela não tem. Melhor recusar e dizer
       o porquê do que gravar dado errado. */
    if (!temIdentificacao && menorDeIdade(nascimento)) {
      throw new Error(
        'O módulo de menores sem RG e CPF (certidão de nascimento) ainda não existe neste ' +
        'banco — falta aplicar a migração 26. Inserir agora colocaria esta pessoa na lista ' +
        'de documentos errada.',
      )
    }

    const r = await chamar<FamiliarInserido>('portal_inserir_familiar', base)
    avisarMudanca('grupo', 'coleta')
    return r
  }
}

export async function removerFamiliar(membroId: string) {
  const r = await chamar<void>('portal_remover_familiar', {
    p_token: token(),
    p_membro_id: membroId,
  })
  avisarMudanca('grupo', 'coleta')
  return r
}

/* ------------------------------------------------------------------ */
/* Usuários da demonstração — ANDAIME, não vai para produção           */
/* ------------------------------------------------------------------ */

export interface UsuarioDemo {
  id: string
  protocolo: string
  nome: string
  cpf: string
  nascimento: string
  /** As quatro declarações do Sisprouni — juntas decidem o módulo do GenDocs. */
  cota: boolean
  encerra_matricula: boolean
  encerra_beneficio: boolean
  professor: boolean
  criado_em: string
  processo_seletivo: string | null
  modulo: string | null
}

/**
 * Lista os candidatos cadastrados com CPF e data de nascimento — que são,
 * respectivamente, o usuário e a senha do portal.
 *
 * ⚠️ Existe só para facilitar o teste do protótipo. Derrubar a função
 * `demo_usuarios()` no banco e remover a tabela de `/aluno/entrar` antes de
 * qualquer uso com dado real.
 */
export function usuariosDemo() {
  return chamar<UsuarioDemo[]>('demo_usuarios', {})
}

/* ------------------------------------------------------------------ */
/* ERP                                                                 */
/* ------------------------------------------------------------------ */

export interface CandidatoErp {
  id: string
  protocolo: string
  nome: string
  cpf: string
  email: string
  inscricao: string
  curso: string | null
  filial_captacao: string | null
  cidade_filial: string | null
  tipo_filial: string | null
  status: string | null
  concurso: string | null
  processo_seletivo: string | null
  cota: string | null
}

export function listarCandidatosErp() {
  return chamar<CandidatoErp[]>('erp_listar_candidatos', {})
}

export function buscarCandidatoErp(id: string) {
  return chamar<Record<string, unknown> | null>('erp_candidato', { p_id: id })
}

/**
 * Uma linha por COLETA do grupo do candidato — a dele em cada módulo e a de
 * cada familiar no PROUNI. `email` do familiar é o do titular: familiar não
 * tem e-mail próprio no sistema, as comunicações vão todas para o titular.
 */
export interface ColetaDoCandidatoErp {
  participante_id: string
  nome: string
  email: string
  titular: boolean
  parentesco: string | null
  identificador_externo: string | null
  protocolo: string
  modulo_slug: string
  modulo: string
  link_preenchimento: string
  status: string
  prazo_em: string | null
  recebida_em: string | null
  requer_verificacao_manual: boolean
  documentos: number
  resolvidos: number
}

/* ------------------------------------------------------------------ */
/* ERP — matricular ou negar o candidato                               */
/* ------------------------------------------------------------------ */

/** Um caminho possível depois do cruzamento com o WAE. */
export type FluxoMatricula = 'aluno_novo' | 'ja_matriculado' | 'nao_definido'

export interface ColetaPendente {
  nome: string
  modulo: string
  status: string
}

export interface SituacaoMatricula {
  candidato_id: string
  inscricao_id: string | null
  nome: string
  cpf: string
  curso: string | null
  polo: string | null
  chamada: string | null
  tipo_bolsa: string
  status: string
  fluxo: FluxoMatricula
  matriculado_wae: boolean | null
  matriculado_em: string | null
  matriculado_por: string | null
  ra_wae: string | null
  negado_em: string | null
  negado_por: string | null
  negacao_motivo: string | null
  /** Filiais de captação e de práticas, quando já definidas. */
  polo_id?: string | null
  polo_praticas_id?: string | null
  coletas_total: number
  coletas_pendentes: ColetaPendente[]
  pode_matricular: boolean
}

/**
 * A resposta da consulta ao WAE.
 *
 * ⚠️ NÃO HÁ INTEGRAÇÃO. `demo_consultar_wae` (migração 28) devolve uma
 * resposta no formato que a API real teria, para o fluxo poder ser percorrido
 * inteiro. `simulado: true` está aí para a tela poder dizer isso na cara.
 */
export interface ConsultaWae {
  simulado: boolean
  endpoint: string
  consultado_em: string
  cpf: string
  curso: string | null
  matricula_vigente: boolean
  fluxo: 'aluno_novo' | 'ja_matriculado'
  ra: string | null
  forcado: boolean
}

export function situacaoMatricula(candidatoId: string) {
  return chamar<SituacaoMatricula | null>('erp_situacao_matricula', { p_id: candidatoId })
}

/** `forcar` é andaime: existe para a demonstração mostrar os dois caminhos. */
export function consultarWae(candidatoId: string, forcar?: 'aluno_novo' | 'ja_matriculado') {
  return chamar<ConsultaWae>('demo_consultar_wae', {
    p_id: candidatoId,
    p_forcar: forcar ?? null,
  })
}

export async function matricular(candidatoId: string, fluxo: 'aluno_novo' | 'ja_matriculado') {
  const r = await chamar<{
    ok: boolean
    fluxo?: string
    ra?: string
    matriculado_em?: string
    motivo?: string
    pendentes?: ColetaPendente[]
  }>('erp_matricular', { p_id: candidatoId, p_fluxo: fluxo, p_operador: ANALISTA })
  if (r.ok) avisarMudanca('candidato')
  return r
}

export async function negarCandidato(candidatoId: string, motivo: string) {
  const r = await chamar<{ ok: boolean; negado_em?: string; motivo?: string }>(
    'erp_negar_candidato',
    { p_id: candidatoId, p_motivo: motivo || null, p_operador: ANALISTA },
  )
  if (r.ok) avisarMudanca('candidato')
  return r
}

/* ------------------------------------------------------------------ */
/* Locais de oferta (filiais)                                          */
/* ------------------------------------------------------------------ */

export interface Polo {
  id: string
  codigo_sispro: string
  nome: string
  cidade: string | null
  uf: string | null
  tipo: string | null
}

/**
 * Os locais de oferta do cadastro do ProUni/MEC — 938 na última carga.
 *
 * Vem da tabela direto, e não de uma RPC, porque `polos` é domínio público
 * (policy `dominio_leitura`) e não tem dado pessoal nenhum.
 */
export async function listarPolos(): Promise<Polo[]> {
  const { data, error } = await supabase
    .from('polos')
    .select('id, codigo_sispro, nome, cidade, uf, tipo')
    .eq('ativo', true)
    .order('nome')
  if (error) throw new Error(`Falha ao carregar os locais de oferta: ${error.message}`)
  return (data ?? []) as Polo[]
}

/* ------------------------------------------------------------------ */
/* Concurso × módulos do GenDocs                                       */
/* ------------------------------------------------------------------ */

export interface ModuloDoConcurso {
  id: string
  slug: string
  nome: string
  /** Combinação de declarações; nulo nos módulos de familiar. */
  combinacao: string | null
  situacao: string
  ativo: boolean
  envio_inicio: string
  envio_fim: string
  documentos: number
  obrigatorios: number
  participantes: number
}

/**
 * Os módulos de coleta que valem no concurso.
 *
 * Vem por RPC porque `modulos_gendocs` é tabela de backoffice, fechada para o
 * `anon` — abrir a tabela inteira para desenhar uma lista seria caro demais.
 */
export function modulosDoConcurso(concursoId: string) {
  return chamar<ModuloDoConcurso[]>('erp_modulos_do_concurso', { p_concurso_id: concursoId })
}

export async function definirFiliais(
  candidatoId: string,
  captacaoId: string | null,
  praticasId: string | null,
) {
  const r = await chamar<{ ok: boolean; candidato: string }>('erp_definir_filiais', {
    p_id: candidatoId,
    p_captacao_id: captacaoId,
    p_praticas_id: praticasId,
  })
  avisarMudanca('candidato')
  return r
}

/** ANDAIME: devolve a inscrição para "Em análise" para a demonstração repetir. */
export async function reabrirInscricao(candidatoId: string) {
  const r = await chamar<{ ok: boolean }>('demo_reabrir_inscricao', { p_id: candidatoId })
  avisarMudanca('candidato')
  return r
}

export function coletasDoCandidatoErp(id: string) {
  return chamar<ColetaDoCandidatoErp[]>('erp_coletas_do_candidato', { p_id: id })
}

/* ------------------------------------------------------------------ */
/* GenDocs                                                             */
/* ------------------------------------------------------------------ */

export interface ModuloGenDocs {
  id: string
  slug: string
  nome: string
  descricao: string | null
  perfil: string
  chamada: string
  envio_inicio: string
  envio_fim: string
  situacao: 'Iniciado' | 'Não iniciado' | 'Finalizado'
  ativo: boolean
  destaque: boolean
  link_preenchimento: string
  participantes: number
  nova: number
  aberta: number
  progresso: number
  recebida: number
  finalizada: number
  aprovacao: number
  documentos: number
}

export function listarModulosGenDocs() {
  return chamar<ModuloGenDocs[]>('gendocs_listar_modulos', {})
}

export interface ParticipanteGenDocs {
  id: string
  nome: string
  email: string
  parentesco: string | null
  titular: boolean
  identificador_externo: string | null
  protocolo: string
  status: string
  prazo_em: string | null
  recebida_em: string | null
  documentos: number
  aprovados: number
}

export function listarParticipantesGenDocs(slug: string) {
  return chamar<ParticipanteGenDocs[]>('gendocs_listar_participantes', { p_slug: slug })
}

/* ------------------------------------------------------------------ */
/* Formatação — mesma que as telas já usavam com dado fixo             */
/* ------------------------------------------------------------------ */

const FUSO = 'America/Sao_Paulo'

/** `2026-08-26` → `26/08/2026`. Aceita ISO com ou sem hora. */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return '--'
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
  if (Number.isNaN(d.getTime())) return '--'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d)
}

/** `26/08/2026, 14:19` — o formato da coluna Inscrição do grid do ERP. */
export function dataHoraBr(iso: string | null | undefined): string {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d)
}

export function mascararCpf(digitos: string): string {
  const d = digitos.replace(/\D/g, '')
  if (d.length !== 11) return digitos
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/* ------------------------------------------------------------------ */
/* Coleta — visão do aluno                                             */
/* ------------------------------------------------------------------ */

export interface DocumentoDaColeta {
  documento_coleta_id: string
  documento_id: string
  sequencia: number
  nome: string
  obrigatorio: boolean
  descricao: string | null
  status: 'pendente' | 'enviado' | 'analise' | 'aprovado' | 'reprovado' | 'aprovado_ia' | 'reprovado_ia'
  motivo_recusa: string | null
  enviado_em: string | null
  /** Falso nos declaratórios (renda): o anexo entra sem conferência. */
  verifica_ia: boolean
  ia_aplicada: boolean
  ia_confianca: number | null
  /** Recusas da verificação neste documento. Zera quando passa. */
  recusas_ia: number
  /** O candidato recorreu e enviou sem verificação. */
  bypass_ia: boolean
  /** Recurso liberado: bateu o limite de recusas e o item segue recusado. */
  pode_recorrer: boolean
  resolvido: boolean
  /**
   * O candidato pode trocar ou remover ESTE item agora?
   *
   * A regra vive em `coleta_editavel` (migração 32): antes do primeiro envio
   * para análise tudo é editável; depois, só o que foi indeferido. O campo é
   * `undefined` em banco anterior à 31 — a tela trata a ausência.
   */
  editavel?: boolean
  nome_original: string | null
  tamanho_bytes: number | null
  storage_path: string | null
  /** Obrigatórios que ESTE documento dispensa quando enviado. */
  substitui: string[]
  /** Documentos que dispensam ESTE, se enviados. */
  dispensado_por: string[]
}

export interface ColetaAluno {
  candidato: string
  candidato_id: string
  modulo: { slug: string; nome: string; descricao: string | null; envio_inicio: string; envio_fim: string }
  ia_ativa: boolean
  /** Quantas recusas liberam o envio sem verificação. */
  recusas_para_recurso: number
  /** Há documento enviado por recurso — o analista precisa olhar item a item. */
  requer_verificacao_manual: boolean
  participante_id: string
  status_coleta: string
  /** Primeiro "Enviar para Análise". Nulo = a coleta nunca foi analisada. */
  primeira_analise_em?: string | null
  documentos: DocumentoDaColeta[]
}

export function coletaDoAluno(slug: string) {
  return chamar<ColetaAluno | null>('portal_coleta', { p_token: token(), p_slug: slug })
}

/**
 * A coleta de um participante do grupo — o próprio candidato ou um familiar.
 * O familiar tem módulo próprio desde os módulos por idade, então a busca por
 * slug (que assume titular) não alcança a coleta dele.
 */
export function coletaDoParticipante(participanteId: string) {
  return chamar<ColetaAluno | null>('portal_coleta_de', {
    p_token: token(),
    p_participante_id: participanteId,
  })
}

export interface ResumoColeta {
  slug: string
  nome: string
  descricao: string | null
  status: string
  /** Só os obrigatórios — ver o comentário em `ParticipanteGrupo`. */
  total: number
  resolvidos: number
  opcionais: number
}

export function minhasColetas() {
  return chamar<ResumoColeta[]>('portal_minhas_coletas', { p_token: token() })
}

export function iaAtiva() {
  return chamar<boolean>('demo_ia_ativa', {})
}

export async function definirIa(ativa: boolean) {
  const r = await chamar<boolean>('demo_definir_ia', { p_ativa: ativa })
  avisarMudanca('config')
  return r
}

export interface ResultadoAnexo {
  arquivo_id: string
  versao: number
  status: DocumentoDaColeta['status']
  motivo: string | null
  ia_aplicada: boolean
  bypass: boolean
  recusas: number
  pode_recorrer: boolean
}

/**
 * Sobe o arquivo para o Storage e registra o anexo com o parecer da IA.
 *
 * A ordem importa: o arquivo vai primeiro, e só depois o banco. Se o registro
 * falhar, o objeto órfão é removido — senão sobraria arquivo no bucket sem
 * nenhuma linha apontando para ele.
 */
export async function anexarDocumento(
  candidatoId: string,
  doc: DocumentoDaColeta,
  arquivo: File,
  parecer: { status: string; motivo: string; confianca: number; extraido: Record<string, unknown> } | null,
  bypass = false,
): Promise<ResultadoAnexo> {
  const versao = Date.now()
  const seguro = arquivo.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  const caminho = `${candidatoId}/${doc.documento_coleta_id}/${versao}-${seguro}`

  const envio = await supabase.storage.from('documentos').upload(caminho, arquivo, {
    contentType: arquivo.type,
    upsert: false,
  })
  if (envio.error) throw new Error(`Falha ao enviar o arquivo: ${envio.error.message}`)

  try {
    const r = await chamar<ResultadoAnexo>('portal_anexar_documento', {
      p_token: token(),
      p_documento_coleta_id: doc.documento_coleta_id,
      p_storage_path: caminho,
      p_nome_original: arquivo.name,
      p_mime: arquivo.type,
      p_tamanho: arquivo.size,
      p_hash: null,
      p_ia_status: parecer?.status ?? null,
      p_ia_motivo: parecer?.motivo ?? null,
      p_ia_confianca: parecer?.confianca ?? null,
      p_ia_extraido: parecer?.extraido ?? null,
      p_bypass: bypass,
    })
    avisarMudanca('coleta')
    return r
  } catch (erro) {
    await supabase.storage.from('documentos').remove([caminho])
    throw erro
  }
}

/**
 * Remove o anexo e limpa o Storage. Quem diz o que apagar é o banco: cada
 * "Trocar" deixou uma versão anterior gravada, e a tela só conhece a vigente —
 * apagar só ela deixaria as outras órfãs no bucket para sempre.
 */
export async function removerAnexo(doc: DocumentoDaColeta) {
  const caminhos = await chamar<string[]>('portal_remover_anexo', {
    p_token: token(),
    p_documento_coleta_id: doc.documento_coleta_id,
  })
  if (caminhos?.length) {
    await supabase.storage.from('documentos').remove(caminhos)
  }
  avisarMudanca('coleta')
}

export interface ResultadoEnvio {
  ok: boolean
  faltando: number
  documentos?: string[]
  /** A coleta vai com conferência manual pendente (houve recurso). */
  verificacao_manual?: boolean
  recursos?: number
}

export async function enviarParaAnaliseDe(participanteId: string) {
  const r = await chamar<ResultadoEnvio>('portal_enviar_para_analise_de', {
    p_token: token(),
    p_participante_id: participanteId,
  })
  if (r.ok) avisarMudanca('coleta')
  return r
}

export async function enviarParaAnalise(slug: string) {
  const r = await chamar<ResultadoEnvio>('portal_enviar_para_analise',
    { p_token: token(), p_slug: slug })
  if (r.ok) avisarMudanca('coleta')
  return r
}

/* ------------------------------------------------------------------ */
/* GenDocs — consulta de participantes e coletas (todos os módulos)    */
/* ------------------------------------------------------------------ */

export interface LinhaConsulta {
  participante_id: string
  nome: string
  email: string
  titular: boolean
  parentesco: string | null
  identificador_externo: string | null
  protocolo: string
  modulo: string
  modulo_slug: string
  modulo_ativo: boolean
  status: string
  recebida_em: string | null
  prazo_em: string | null
  sla_horas: number | null
  vencido: boolean
  requer_verificacao_manual: boolean
  documentos: number
  resolvidos: number
  /** Documentos enviados por recurso, sem verificação automática. */
  recursos: number
}

export function consultarColetas() {
  return chamar<LinhaConsulta[]>('gendocs_consultar_coletas', {})
}

/* ------------------------------------------------------------------ */
/* GenDocs — análise (visão da Secretaria)                             */
/* ------------------------------------------------------------------ */

/**
 * Quem assina as aprovações. Fica aqui porque ainda não há login de
 * backoffice — é o mesmo nome que a barra do topo mostra. Quando houver
 * sessão de verdade, este valor sai da sessão e as funções do banco param de
 * receber `p_revisor` da tela.
 */
export const ANALISTA = 'Renan Ribeiro'

export interface DocumentoAnalise {
  documento_coleta_id: string
  sequencia: number
  nome: string
  obrigatorio: boolean
  descricao: string | null
  status: string
  /** "Aprovado", "Aprovado Manual", "Validado por Equivalência", … */
  rotulo: string
  resolvido: boolean
  analisado_por: string | null
  analisado_em: string | null
  motivo_recusa: string | null
  bypass_ia: boolean
  ia_aplicada: boolean
  /** Documento de identificação: tem painel lateral de campos extraídos. */
  tem_campos: boolean
  nome_original: string | null
  uploads: number
}

export interface AnaliseParticipante {
  participante_id: string
  nome: string
  email: string
  titular: boolean
  parentesco: string | null
  identificador_externo: string | null
  observacao_1: string | null
  observacao_2: string | null
  observacao_3: string | null
  protocolo: string
  modulo: string
  modulo_slug: string
  coleta_id: string
  status_coleta: string
  finalizada_por: string | null
  finalizada_em: string | null
  link_coleta: string
  pode_finalizar: boolean
  /**
   * O que impede a finalização, item a item. Vazio = pode finalizar.
   * `undefined` em banco anterior à migração 26 — a tela trata os dois casos.
   */
  pendencias?: PendenciaFinalizacao[]
  documentos: DocumentoAnalise[]
}

/** Um item que ainda barra o "Finalizar Coleta". */
export interface PendenciaFinalizacao {
  nome: string
  /** 'sem parecer do analista' | 'indeferido — …' | 'obrigatório sem envio' */
  motivo: string
}

export interface CampoExtraido {
  valor: string
  confianca: number
}

export interface UploadDoDocumento {
  nome_original: string
  revisor: string | null
  enviado_em: string
  status: string
  versao: number
  tamanho_bytes: number | null
}

export interface ArquivoDaAnalise {
  nome_original: string
  storage_path: string
  mime: string | null
  tamanho_bytes: number | null
  enviado_em: string
  versao: number
  /** De qual documento o arquivo é — diferente quando vale por equivalência. */
  documento_de: string
}

export interface AnaliseDocumento {
  documento_coleta_id: string
  participante_id: string
  participante: string
  modulo: string
  modulo_slug: string
  nome: string
  descricao: string | null
  obrigatorio: boolean
  status: string
  rotulo: string
  resolvido: boolean
  motivo_recusa: string | null
  analisado_por: string | null
  analisado_em: string | null
  bypass_ia: boolean
  ia_aplicada: boolean
  status_coleta: string
  arquivo: ArquivoDaAnalise | null
  campos: Record<string, CampoExtraido>
  uploads: UploadDoDocumento[]
  anterior: string | null
  proximo: string | null
}

export function analiseParticipante(participanteId: string) {
  return chamar<AnaliseParticipante | null>('gendocs_analise_participante', {
    p_participante_id: participanteId,
  })
}

export function analiseDocumento(documentoColetaId: string) {
  return chamar<AnaliseDocumento | null>('gendocs_analise_documento', {
    p_documento_coleta_id: documentoColetaId,
  })
}

export async function aprovarDocumento(documentoColetaId: string) {
  const r = await chamar<{ ok: boolean; rotulo: string }>('gendocs_aprovar_documento', {
    p_documento_coleta_id: documentoColetaId,
    p_revisor: ANALISTA,
  })
  avisarMudanca('coleta')
  return r
}

export async function reprovarDocumento(documentoColetaId: string, motivo: string) {
  const r = await chamar<{ ok: boolean; reabriu_coleta: boolean; rotulo: string }>(
    'gendocs_reprovar_documento',
    { p_documento_coleta_id: documentoColetaId, p_revisor: ANALISTA, p_motivo: motivo },
  )
  avisarMudanca('coleta')
  return r
}

export async function finalizarColeta(participanteId: string) {
  const r = await chamar<{
    ok: boolean
    pendentes?: number
    itens?: PendenciaFinalizacao[]
    motivo?: string
  }>('gendocs_finalizar_coleta', {
    p_participante_id: participanteId,
    p_revisor: ANALISTA,
  })
  if (r.ok) avisarMudanca('coleta')
  return r
}

export async function editarParticipante(
  participanteId: string,
  nome: string,
  email: string,
  obs: [string, string, string],
) {
  const r = await chamar<{ ok: boolean }>('gendocs_editar_participante', {
    p_participante_id: participanteId,
    p_nome: nome,
    p_email: email,
    p_obs1: obs[0],
    p_obs2: obs[1],
    p_obs3: obs[2],
  })
  avisarMudanca('grupo', 'coleta')
  return r
}

export async function excluirColeta(participanteId: string) {
  const r = await chamar<{ ok: boolean; excluido: string }>('gendocs_excluir_coleta', {
    p_participante_id: participanteId,
  })
  avisarMudanca('grupo', 'coleta')
  return r
}

/** O bucket é privado: o visualizador precisa de uma URL assinada. */
export async function urlDoArquivo(caminho: string, segundos = 600) {
  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(caminho, segundos)
  if (error) throw new Error(`Não foi possível abrir o arquivo: ${error.message}`)
  return data.signedUrl
}

/**
 * A tela de coleta como o participante a vê, para o analista conferir sem ter
 * sessão do portal. Mesma função de banco por trás de `coletaDoAluno` — a
 * prévia não pode divergir da tela real.
 */
export function previaColeta(participanteId: string) {
  return chamar<ColetaAluno | null>('gendocs_previa_coleta', {
    p_participante_id: participanteId,
  })
}
