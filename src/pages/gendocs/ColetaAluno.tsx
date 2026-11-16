import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FaCircleQuestion } from 'react-icons/fa6'
import {
  anexarDocumento, coletaDoAluno, definirIa, enviarParaAnalise, lerSessao,
  coletaDoParticipante, enviarParaAnaliseDe, previaColeta, removerAnexo, SessaoInvalida,
  type ColetaAluno, type DocumentoDaColeta,
} from '../../lib/api'
import { analisar } from '../../lib/ia'
import { listar, mapearCobertura } from '../../lib/cobertura'
import { useMudancas } from '../../lib/tempo-real'
import { GlobalBar } from '../../components/GlobalBar'
import { cn } from '../../lib/cn'

/* ==================================================================
 * GenDocs — visão do ALUNO da coleta de documentos.
 *
 * Réplica de `GenDocs - coleta visão aluno.html` e
 * `GenDocs - coleta finalizada visão do aluno.html` (HTMLs salvos, com o DOM
 * real) e dos dois prints.
 *
 * O anexo é real: o arquivo vai para o Storage do Supabase e o registro para
 * `gendocs_arquivos`. Antes de gravar, o arquivo passa pela verificação de IA
 * — que hoje é a heurística de `src/lib/ia.ts` e amanhã é o modelo, sem a tela
 * mudar. Com a chave da IA desligada, o anexo entra aprovado direto.
 * ================================================================== */

const ROTULO: Record<DocumentoDaColeta['status'], string> = {
  pendente: 'Pendente',
  enviado: 'Enviado — conferência na análise',
  analise: 'Em análise',
  aprovado: 'Aprovado pelo analista',
  reprovado: 'Reprovado pelo analista',
  aprovado_ia: 'Aprovado pela IA',
  reprovado_ia: 'Reprovado pela IA',
}

/** Um anexo que entrou por recurso não passou pela conferência: o rótulo tem
    de dizer isso, não fingir que foi conferido. */
const ROTULO_MANUAL = 'Encaminhado para análise manual'

function rotuloDe(doc: DocumentoDaColeta) {
  return doc.bypass_ia ? ROTULO_MANUAL : ROTULO[doc.status]
}

function tomDe(doc: DocumentoDaColeta) {
  return doc.bypass_ia ? 'bg-gd-white-orange text-gd-orange' : TOM[doc.status]
}

const TOM: Record<DocumentoDaColeta['status'], string> = {
  pendente: 'bg-gray-100 text-gray-500',
  enviado: 'bg-gd-white-orange text-gd-orange',
  analise: 'bg-gd-white-orange text-gd-orange',
  aprovado: 'bg-gd-white-green text-gd-green-200',
  reprovado: 'bg-red-50 text-gd-red',
  aprovado_ia: 'bg-gd-white-green text-gd-green-200',
  reprovado_ia: 'bg-red-50 text-gd-red',
}

/* ------------------------------------------------------------------ */
/* Casca                                                               */
/* ------------------------------------------------------------------ */

/* `top-10` e não `top-0`: a faixa de navegação do protótipo fica acima, como
   em todos os outros cascos. */
function BarraTopo() {
  return (
    <div className="fixed left-0 top-10 z-30 flex h-auto w-full items-center justify-between bg-gd-blue-200 px-4 py-4 text-white shadow-lg transition-all sm:px-20">
      <img src="/genDocsLogo.svg" alt="GenDocs" className="w-40 sm:w-fit" />
    </div>
  )
}

/** O assistente do canto. Está nos dois HTMLs salvos — é parte da tela. */
function GenDog() {
  return (
    <div className="pointer-events-none fixed bottom-12 right-6 z-40 flex items-end lg:bottom-24 2xl:right-16">
      <div className="relative flex w-fit flex-col items-end">
        <div className="mb-2 mr-2 flex w-56 flex-col gap-1 rounded-2xl rounded-br-none border-2 border-gd-blue-200 bg-white p-2 text-start text-xs text-gray-600">
          <p className="m-0">
            Olá, eu sou o <span className="font-semibold text-gd-light-blue">GenDog</span>, seu
            assistente virtual!
          </p>
          <p className="m-0 hidden sm:block">Qualquer dúvida ou problema é só falar comigo!</p>
        </div>
        <img src="/genDog.png" alt="GenDog" className="w-28 select-none self-end sm:w-36" />
      </div>
    </div>
  )
}

function Moldura({
  nome,
  modulo,
  descricao,
  children,
}: {
  nome: string
  modulo: string
  descricao: string
  children: React.ReactNode
}) {
  return (
    <div className="h-auto min-h-screen w-full bg-white">
      <GlobalBar />
      <BarraTopo />
      <div className="relative my-2 flex h-auto w-full flex-col items-center gap-2 px-2 pb-20 pt-[10.5rem] text-gray-600 transition-all sm:gap-4 sm:pb-8 sm:pt-[9.5rem]">
        <div className="flex w-full max-w-[95%] items-center gap-1 px-2 text-2xl text-gd-blue-200 transition-all sm:max-w-[70%] sm:px-12 sm:text-3xl">
          <p>
            Olá, <b>{nome}</b>
          </p>
        </div>
        <div className="flex w-full max-w-[95%] flex-col gap-4 rounded-lg border border-gd-gray-100 p-4 shadow-gd-document-card transition-all sm:max-w-[70%] sm:gap-8 sm:p-12 sm:py-10">
          <div className="flex w-full flex-col gap-1 transition-all">
            <p className="text-2xl font-semibold text-gd-blue-200">{modulo}</p>
            <p>{descricao}</p>
          </div>
          {children}
        </div>
      </div>
      <GenDog />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* A tela                                                              */
/* ------------------------------------------------------------------ */

export function GdColetaAluno() {
  const { slug = '' } = useParams()
  const [coleta, setColeta] = useState<ColetaAluno | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const temSessao = !!lerSessao()

  /* O analista deferiu, indeferiu ou reabriu a coleta em outra tela: esta
     acompanha sem o candidato recarregar a página. */
  useMudancas(['coleta', 'config'], recarregar)

  /* `?participante=` aponta uma pessoa do grupo. Com sessão é o candidato
     abrindo a coleta de um familiar — pode anexar. Sem sessão é o analista
     conferindo pela tela de análise — só olha. É a sessão que decide. */
  const [parametros] = useSearchParams()
  const participante = parametros.get('participante')
  const previa = !temSessao && !!participante

  useEffect(() => {
    if (!participante && !temSessao) return
    let cancelado = false
    setErro(null)
    const busca = participante
      ? (temSessao ? coletaDoParticipante(participante) : previaColeta(participante))
      : coletaDoAluno(slug)
    busca
      .then((c) => {
        if (!cancelado) setColeta(c)
      })
      .catch((f: unknown) => {
        if (cancelado) return
        setErro(f instanceof SessaoInvalida ? 'sessao' : f instanceof Error ? f.message : String(f))
      })
    return () => {
      cancelado = true
    }
  }, [slug, versao, temSessao, participante])

  if (!previa && (!temSessao || erro === 'sessao')) return <PrecisaEntrar slug={slug} />

  if (erro) {
    return (
      <Moldura nome="—" modulo="Coleta de documentos" descricao="">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-gd-red">
          Não foi possível carregar a coleta: {erro}
        </p>
      </Moldura>
    )
  }

  if (!coleta) {
    return (
      <Moldura nome="—" modulo="Coleta de documentos" descricao="">
        <p className="py-10 text-center text-gd-gray-400">Carregando…</p>
      </Moldura>
    )
  }

  /* Três estados, não dois. ENVIADA é a coleta na mão do analista: o
     candidato continua vendo tudo o que mandou, mas não mexe em nada até
     alguém deferir ou indeferir. FINALIZADA é o fim da linha. */
  const enviada = coleta.status_coleta === 'recebida'
  const finalizada = coleta.status_coleta === 'finalizada'
  const travada = enviada || finalizada
  /* Voltou da análise: o analista indeferiu alguma coisa e reabriu a coleta.
     Daqui em diante só o que foi indeferido aceita troca. */
  const devolvida = !travada && !!coleta.primeira_analise_em
  const cobertura = mapearCobertura(coleta.documentos)

  async function enviar() {
    setEnviando(true)
    setAviso(null)
    try {
      const r = participante
        ? await enviarParaAnaliseDe(participante)
        : await enviarParaAnalise(slug)
      if (!r.ok) {
        setAviso(
          `Faltam ${r.faltando} documento(s) obrigatório(s): ${(r.documentos ?? []).join(', ')}.`,
        )
      } else {
        recarregar()
      }
    } catch (f: unknown) {
      setAviso(f instanceof Error ? f.message : String(f))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Moldura
      nome={coleta.candidato}
      modulo={coleta.modulo.nome}
      descricao={
        coleta.modulo.descricao ??
        `Bem-vindo(a) ao módulo de envio de documentos do ${coleta.modulo.nome}!`
      }
    >
      <div className="flex w-full flex-col gap-4 transition-all">
        <div className="flex w-full flex-wrap items-center justify-between transition-all sm:flex-nowrap">
          <div className="flex w-full items-center transition-all sm:w-1/2">
            <div className="flex w-full flex-col gap-2 transition-all">
              <b className="text-2xl text-gd-blue">Documentos</b>
              <b className="text-sm text-gray-400">
                Realize o envio de cada documento da listagem abaixo. Para enviar o documento, basta
                clicar no botão Upload, e anexar uma cópia digital.
              </b>
            </div>
          </div>

          <div className="flex w-auto flex-col items-end gap-2 transition-all">
            <div className="flex w-auto items-center gap-1 text-wrap text-sm text-gd-gray-400/80 transition-all sm:text-base">
              Status da Coleta:
              <b
                className={
                  finalizada ? 'text-gd-green-100' : enviada ? 'text-gd-orange' : 'text-gray-600'
                }
              >
                {finalizada ? 'Finalizada' : enviada ? 'Em análise' : 'Coleta aberta'}
              </b>
              <FaCircleQuestion className="size-4 text-gd-blue" />
            </div>
            {!travada && !previa && <BotaoEnviar onClick={enviar} ocupado={enviando} />}
          </div>
        </div>

        {finalizada ? (
          <div className="flex min-h-80 w-full flex-col items-center justify-center gap-3 rounded-xl border border-gd-gray-100 p-10 transition-all sm:p-4">
            <img src="/gendocs-finalizado.svg" alt="" className="w-56 max-w-full sm:w-72" />
            <b className="text-2xl text-gd-blue-200">Envio Concluído</b>
            <p className="max-w-md text-center text-sm text-gd-gray-400">
              A Secretaria concluiu a análise desta coleta. Não há mais nada a enviar.
            </p>
          </div>
        ) : (
          <>
            {enviada && !previa && <ColetaEnviada documentos={coleta.documentos} />}

            {devolvida && !previa && <ColetaDevolvida documentos={coleta.documentos} />}

            {previa && (
              <p className="rounded-md border border-gd-blue/40 bg-gd-blue-10 px-4 py-3 text-sm leading-relaxed text-gd-blue-200">
                <b>Prévia do analista.</b> É exatamente o que {coleta.candidato} vê nesta coleta.
                Nada aqui pode ser anexado, removido ou enviado — para agir no documento, use a
                tela de análise.
              </p>
            )}

            {!previa && !travada && (
              <NotaDaDemonstracao ativa={coleta.ia_ativa} />
            )}

            <div className="flex w-full flex-col gap-5 transition-all">
              {coleta.documentos.map((d) => (
                <LinhaDocumento
                  key={d.documento_coleta_id}
                  doc={d}
                  candidatoId={coleta.candidato_id}
                  iaAtiva={coleta.ia_ativa}
                  cobertoPor={cobertura[d.documento_coleta_id] ?? null}
                  somenteLeitura={previa || enviada || d.editavel === false}
                  motivoBloqueio={
                    previa
                      ? 'Prévia — o envio é do candidato'
                      : enviada
                        ? 'A coleta já foi enviada e está com o analista'
                        : 'Já analisado — só os documentos indeferidos podem ser trocados'
                  }
                  aoMudar={recarregar}
                />
              ))}
              <p className="text-xs font-bold italic text-gd-gray-100">* Obrigatório</p>
            </div>

            {aviso && (
              <p className="rounded-md border border-gd-orange/40 bg-gd-white-orange px-3 py-2 text-sm text-gd-orange">
                {aviso}
              </p>
            )}

            {!previa && !travada && <BotaoEnviar onClick={enviar} ocupado={enviando} largo />}
          </>
        )}

        {!previa && <ChaveIA ativa={coleta.ia_ativa} aoTrocar={recarregar} />}
      </div>
    </Moldura>
  )
}

/** A coleta é de quem está logado — sem sessão não há o que mostrar. */
function PrecisaEntrar({ slug }: { slug: string }) {
  return (
    <Moldura nome="—" modulo="Coleta de documentos" descricao="">
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="text-gd-gray-400">
          Esta coleta é pessoal. Entre no Portal do Candidato para ver e enviar os seus documentos.
        </p>
        <Link
          to="/aluno/entrar"
          className="rounded-md bg-gd-blue px-5 py-2.5 text-sm font-bold uppercase text-white transition-colors hover:bg-gd-blue-100"
        >
          Entrar no portal
        </Link>
        <p className="text-xs text-gd-gray-100">Módulo: {slug}</p>
      </div>
    </Moldura>
  )
}

function BotaoEnviar({
  onClick,
  ocupado,
  largo,
}: {
  onClick: () => void
  ocupado: boolean
  largo?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupado}
      className={cn(
        'flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gd-blue px-4 py-2 text-sm font-medium uppercase text-white shadow transition-all hover:bg-gd-blue-100 disabled:opacity-50',
        largo ? 'w-full' : 'w-full',
      )}
    >
      {ocupado ? 'Enviando…' : 'Enviar para Análise'}
    </button>
  )
}

/**
 * Coleta enviada: o recado que o candidato lê toda vez que abrir a tela.
 *
 * Fica ACIMA da lista, e a lista continua visível — esconder o que ele mandou
 * seria pior do que não mostrar nada: é justamente agora que ele quer
 * conferir se anexou tudo certo.
 */
function ColetaEnviada({ documentos }: { documentos: DocumentoDaColeta[] }) {
  const enviados = documentos.filter((d) => d.nome_original).length

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-gd-orange/40 bg-gd-white-orange px-4 py-3 text-sm leading-relaxed text-gd-orange">
      <b className="text-base">Coleta enviada para análise.</b>
      <p className="m-0">
        Recebemos os seus {enviados} documento{enviados === 1 ? '' : 's'} e a coleta está com o
        analista da Secretaria. Enquanto ele não deferir ou indeferir, nada aqui pode ser
        anexado, trocado ou removido.
      </p>
      <p className="m-0">
        Se algum documento for indeferido, ele volta para esta tela com o motivo — e só aquele
        item fica liberado para reenvio.
      </p>
    </section>
  )
}

/**
 * A coleta voltou da análise. Só o que foi indeferido aceita troca — o resto
 * já foi julgado, e deixar o candidato mexer devolveria ao analista uma coleta
 * diferente da que ele começou a julgar.
 */
function ColetaDevolvida({ documentos }: { documentos: DocumentoDaColeta[] }) {
  const recusados = documentos.filter(
    (d) => d.status === 'reprovado' || d.status === 'reprovado_ia',
  )
  if (recusados.length === 0) return null

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-gd-red/40 bg-red-50/50 px-4 py-3 text-sm leading-relaxed text-gd-red">
      <b className="text-base">
        {recusados.length === 1
          ? 'Um documento voltou para você corrigir.'
          : `${recusados.length} documentos voltaram para você corrigir.`}
      </b>
      <p className="m-0">
        Só {recusados.length === 1 ? 'ele' : 'eles'} pode
        {recusados.length === 1 ? '' : 'm'} ser trocado
        {recusados.length === 1 ? '' : 's'}: {listar(recusados.map((d) => d.nome))}. O restante da
        coleta já foi analisado e fica bloqueado.
      </p>
      <p className="m-0">
        Corrija o que voltou e envie a coleta para análise de novo.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Uma linha da lista                                                  */
/* ------------------------------------------------------------------ */

function LinhaDocumento({
  doc,
  candidatoId,
  iaAtiva,
  cobertoPor,
  somenteLeitura,
  motivoBloqueio,
  aoMudar,
}: {
  doc: DocumentoDaColeta
  candidatoId: string
  iaAtiva: boolean
  cobertoPor: string[] | null
  /** Prévia do analista ou coleta já enviada: mostra tudo, não deixa mexer. */
  somenteLeitura: boolean
  motivoBloqueio: string
  aoMudar: () => void
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState<'analisando' | 'enviando' | 'removendo' | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  const temArquivo = !!doc.nome_original
  /* Campo coberto por outro anexo: fica opaco e sem clique. Volta a valer
     sozinho quando o anexo que o cobria for removido. */
  const bloqueado = !!cobertoPor && cobertoPor.length > 0

  /* Documento declaratório (renda, imposto de renda) não passa por conferência
     — o que o candidato anexar entra, e a responsabilidade é dele. */
  const conferido = iaAtiva && doc.verifica_ia

  /* Já foi recusado o bastante: o próximo envio entra direto, pelo MESMO botão.
     Um botão separado obrigaria o candidato a entender a diferença entre dois
     caminhos de envio — que é problema do sistema, não dele. */
  const recorrendo = doc.pode_recorrer

  async function escolher(arquivo: File) {
    setFalha(null)
    try {
      let parecer = null
      if (conferido && !recorrendo) {
        setOcupado('analisando')
        parecer = await analisar(arquivo, doc.nome)
      }
      setOcupado('enviando')
      await anexarDocumento(candidatoId, doc, arquivo, parecer, recorrendo)
      aoMudar()
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setOcupado(null)
    }
  }

  async function remover() {
    setOcupado('removendo')
    setFalha(null)
    try {
      await removerAnexo(doc)
      aoMudar()
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-3 rounded-lg border p-2 transition-all sm:p-4 sm:px-6',
        bloqueado
          ? 'border-dashed border-gd-gray-100 bg-gd-gray-50/50'
          : doc.status === 'reprovado_ia' || doc.status === 'reprovado'
            ? 'border-gd-red/40 bg-red-50/30'
            : 'border-gd-gray-100',
      )}
      aria-disabled={bloqueado || undefined}
    >
      <div
        className={cn(
          'flex w-full items-center justify-between gap-2 transition-all sm:gap-1',
          bloqueado && 'opacity-40',
        )}
      >
        <div className="flex w-full flex-wrap items-center gap-3 transition-all">
          <span className="text-xs sm:text-nowrap">
            <b className="flex flex-row items-center gap-1 text-nowrap pr-1 text-xs text-gray-700 md:text-lg">
              {doc.nome}
              <span className="text-[10px] lg:text-sm">
                {doc.obrigatorio ? '*' : <span className="font-normal text-gray-500">(Opcional)</span>}
              </span>
            </b>
            {doc.descricao && (
              <p className="pt-1 text-xs font-semibold text-wrap text-gd-gray-100">{doc.descricao}</p>
            )}
            {!doc.verifica_ia && (
              <p className="pt-0.5 text-xs font-semibold text-wrap text-gd-orange">
                Este documento não passa por conferência automática — envie o arquivo correto.
              </p>
            )}
            {doc.substitui.length > 0 && (
              <p className="pt-0.5 text-xs font-semibold text-wrap text-gd-gray-100">
                Substitui: {listar(doc.substitui)}
              </p>
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {bloqueado ? (
            <span className="rounded-full bg-gd-white-green px-2.5 py-1 text-[11px] font-bold text-gd-green-200">
              Não é necessário
            </span>
          ) : (
            doc.status !== 'pendente' && (
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', tomDe(doc))}>
                {rotuloDe(doc)}
              </span>
            )
          )}

          <input
            ref={entrada}
            type="file"
            className="hidden"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const a = e.target.files?.[0]
              if (a) escolher(a)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={!!ocupado || doc.status === 'aprovado' || bloqueado || somenteLeitura}
            title={
              somenteLeitura
                ? motivoBloqueio
                : bloqueado
                  ? `Já coberto por ${listar(cobertoPor ?? [])}`
                  : undefined
            }
            onClick={() => entrada.current?.click()}
            className="flex h-8 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-gd-blue bg-transparent px-1 py-0.5 text-xs font-bold text-gd-blue shadow-sm transition-all hover:bg-gd-gray-100/20 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:px-6 sm:py-2 sm:text-base"
          >
            {ocupado === 'analisando'
              ? 'Conferindo…'
              : ocupado === 'enviando'
                ? 'Enviando…'
                : temArquivo
                  ? 'Trocar'
                  : 'Upload'}
          </button>
        </div>
      </div>

      {/* Fora do bloco opaco de propósito: o campo some de vista, mas o motivo
          tem que continuar legível — senão o candidato acha que travou. */}
      {bloqueado && cobertoPor && (
        <p className="rounded-md bg-gd-white-green px-3 py-2 text-xs leading-relaxed text-gd-green-200">
          <b>Não precisa enviar.</b> Este campo já está coberto por{' '}
          <b>{listar(cobertoPor)}</b>. Para liberá-lo de novo, remova{' '}
          {cobertoPor.length > 1 ? 'esses anexos' : 'esse anexo'}.
        </p>
      )}

      {/* Fechado pela análise: sem isto o botão cinza não explica nada. */}
      {doc.editavel === false && !bloqueado && temArquivo &&
        doc.status !== 'reprovado' && doc.status !== 'reprovado_ia' && (
        <p className="rounded-md bg-gd-gray-50 px-3 py-2 text-xs leading-relaxed text-gd-gray-400">
          Este documento já passou pela análise e não pode mais ser trocado. Só os itens
          indeferidos voltam a aceitar envio.
        </p>
      )}

      {temArquivo && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gd-gray-50 px-3 py-2 text-xs text-gd-gray-400">
          <span className="min-w-0 break-all">
            {doc.nome_original}
            {doc.tamanho_bytes != null && ` · ${(doc.tamanho_bytes / 1024).toFixed(0)} KB`}
            {doc.ia_confianca != null && ` · confiança ${(doc.ia_confianca * 100).toFixed(0)}%`}
            {!doc.ia_aplicada && ' · sem verificação por IA'}
          </span>
          {doc.status !== 'aprovado' && !somenteLeitura && (
            <button
              type="button"
              onClick={remover}
              disabled={!!ocupado}
              className="shrink-0 font-semibold text-gd-red underline disabled:opacity-40"
            >
              {ocupado === 'removendo' ? 'Removendo…' : 'Remover'}
            </button>
          )}
        </div>
      )}

      {doc.motivo_recusa && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs leading-relaxed text-gd-red">
          {doc.motivo_recusa}
        </p>
      )}

      {/* A conferência recusou: o próximo envio entra sem passar por ela e vai
          para o analista. Sem botão à parte — é o mesmo Upload de sempre. */}
      {doc.status === 'reprovado_ia' && doc.pode_recorrer && (
        <p className="rounded-md bg-gd-white-orange px-3 py-2 text-xs leading-relaxed text-gd-orange">
          <b>A conferência automática recusou este arquivo.</b> Se o documento está correto, use o
          botão <b>Trocar</b> e envie de novo: desta vez ele entra sem conferência automática e vai
          direto para o analista da Secretaria verificar à mão.
        </p>
      )}

      {doc.bypass_ia && (
        <p className="rounded-md bg-gd-white-orange px-3 py-2 text-xs leading-relaxed text-gd-orange">
          <b>Encaminhado para análise manual.</b> Este arquivo não passou pela conferência
          automática — quem confere é o analista.
          {!somenteLeitura && ' Você ainda pode trocar ou remover enquanto a coleta não for enviada.'}
        </p>
      )}

      {falha && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs leading-relaxed text-gd-red">{falha}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chave da IA — só para desenvolvimento                               */
/* ------------------------------------------------------------------ */

/**
 * ANDAIME. Liga e desliga a verificação por IA no ambiente inteiro (o valor
 * mora em `configuracoes.ia_ativa`, não no navegador — então vale para quem
 * abrir o protótipo em qualquer máquina).
 *
 * Desligada, todo anexo entra aprovado sem análise, e o registro guarda
 * `ia_aplicada = false` para dar para separar depois.
 */
function ChaveIA({ ativa, aoTrocar }: { ativa: boolean; aoTrocar: () => void }) {
  const [ocupado, setOcupado] = useState(false)

  async function trocar() {
    setOcupado(true)
    try {
      await definirIa(!ativa)
      aoTrocar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-amber-400 bg-amber-50/60 px-3 py-2 text-xs text-amber-900/80">
      <span className="min-w-0">
        <b className="uppercase tracking-wide text-amber-700">Apenas para desenvolvimento:</b>{' '}
        verificação por IA está <b>{ativa ? 'ligada' : 'desligada'}</b>.{' '}
        {ativa
          ? 'Cada anexo é conferido antes de entrar.'
          : 'Todo anexo entra aprovado, sem conferência.'}
      </span>
      <button
        type="button"
        onClick={trocar}
        disabled={ocupado}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-full px-1 py-1 transition-colors disabled:opacity-50',
          ativa ? 'bg-gd-green-200' : 'bg-gray-300',
        )}
        role="switch"
        aria-checked={ativa}
        aria-label="Verificação por IA"
      >
        <span
          className={cn(
            'size-4 rounded-full bg-white transition-transform',
            ativa && 'translate-x-5',
          )}
        />
        <span className="sr-only">{ativa ? 'Desligar' : 'Ligar'}</span>
      </button>
    </div>
  )
}

/* ==================================================================
 * Nota de desenvolvimento — explica o que a "verificação" faz de fato
 *
 * Sem isto a tela mente por omissão: alguém testando ia supor que há
 * um modelo lendo o documento, e concluir que a leitura é péssima.
 * O que existe é uma checagem de NOME DE ARQUIVO, e a nota diz isso
 * com todas as letras, junto de como fazer um teste dar certo.
 * ================================================================== */

function NotaDaDemonstracao({ ativa }: { ativa: boolean }) {
  const [aberta, setAberta] = useState(true)

  return (
    <section className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/70 p-4 text-sm text-amber-900/90">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
          Nota de desenvolvimento — não existe no produto final
        </p>
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          className="shrink-0 rounded px-2 text-amber-700 transition-colors hover:bg-amber-100"
        >
          {aberta ? 'ocultar' : 'mostrar'}
        </button>
      </div>

      {aberta && (
        <div className="mt-2 flex flex-col gap-2 leading-relaxed">
          <p>
            <b>Esta demonstração não tem inteligência artificial conectada.</b> Nenhum modelo abre o
            arquivo, nenhum texto é lido, nenhum OCR é executado. O que existe no lugar é uma
            checagem do <b>nome do arquivo</b>, feita só para o fluxo da tela poder ser percorrido
            de ponta a ponta.
          </p>

          <p>
            <b>Como ela decide.</b> Cada documento exigido tem uma lista de termos esperados. O
            nome do arquivo que você anexar é comparado com essa lista, ignorando acentos e
            maiúsculas. Se qualquer termo aparecer no nome, o documento é <b>aprovado</b>; se
            nenhum aparecer, é <b>reprovado</b>. Antes disso há duas conferências que são reais:
            o formato precisa ser PDF, JPG, PNG ou WEBP, e o arquivo precisa ter até 10 MB.
          </p>

          <p>
            <b>Na prática:</b> para o RG, um arquivo chamado <code>rg-frente-verso.pdf</code> ou{' '}
            <code>identidade.jpg</code> passa; <code>documento1.pdf</code> não passa. Para o
            Histórico, vale <code>historico-escolar.pdf</code> ou{' '}
            <code>certificado-conclusao.pdf</code>. Basta um pedaço do nome bater — não precisa
            ser exato.
          </p>

          <p>
            <b>Documentos de renda não passam por esta checagem.</b> Imposto de renda, holerites,
            contracheques, DECORE, extratos do INSS, nota de produtor e recibos de aluguel entram
            com qualquer nome de arquivo. Eles variam demais em forma para uma conferência
            automática decidir, e a responsabilidade pelo conteúdo é declaratória — a conferência
            desses é humana, na análise da Secretaria.
          </p>

          <p>
            <b>Quando a checagem erra.</b> Basta <b>uma recusa</b> no mesmo documento: no envio
            seguinte, pelo mesmo botão, o arquivo entra sem passar pela checagem e vai direto para
            o analista. Toda coleta é conferida por uma pessoa de qualquer forma — a checagem
            automática é um filtro anterior, não o julgamento final.
          </p>

          <p className="text-xs">
            A chave abaixo desliga a checagem por completo: com ela desligada, qualquer arquivo é
            aceito em qualquer campo. Hoje ela está{' '}
            <b>{ativa ? 'ligada' : 'desligada'}</b>. Quando um modelo de verdade for conectado,
            só o miolo de <code>src/lib/ia.ts</code> muda — esta tela e o banco continuam iguais.
          </p>
        </div>
      )}
    </section>
  )
}
