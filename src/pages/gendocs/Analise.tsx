import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FaChevronLeft, FaChevronRight, FaChevronDown } from 'react-icons/fa6'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { GdField, GdModal } from '../../components/gendocs/ui'
import { AcoesParticipante } from '../../components/gendocs/AcoesParticipante'
import {
  analiseDocumento, analiseParticipante, aprovarDocumento, dataBr,
  finalizarColeta, reprovarDocumento, urlDoArquivo,
  type AnaliseDocumento, type AnaliseParticipante, type DocumentoAnalise,
  type PendenciaFinalizacao,
} from '../../lib/api'
import { useMudancas } from '../../lib/tempo-real'
import { cn } from '../../lib/cn'

/* ==================================================================
 * GenDocs — a visão do ANALISTA.
 *
 * Duas telas:
 *   1. RESUMO — réplica de
 *      `GenDocs - PRIMEIRA TELA DE ANALISE DE UM CANDIDATO, TELA RESUMO.html`
 *      (HTML salvo, com o DOM real), classe por classe.
 *   2. DOCUMENTO — reconstruída dos prints, com os mesmos tokens de design:
 *      o arquivo, os campos que a leitura automática extraiu com a confiança
 *      de cada um, o histórico de uploads e as ações de aprovação manual.
 *
 * Reprovar devolve o documento ao aluno e reabre a coleta que já tinha sido
 * enviada — ver `supabase/13-analise-do-analista.sql`.
 * ================================================================== */

/* Verde para o que passou, vermelho para o que voltou, laranja para o que
   espera alguém, e o cinza padrão para o que nem chegou. No HTML original o
   pendente sai como `textundefined` — sem cor, herdando a do card. */
const ROTULO_COR: Record<string, string> = {
  'Aprovado': 'text-gd-green-100',
  'Aprovado Manual': 'text-gd-green-100',
  'Validado por Equivalência': 'text-gd-green-100',
  'Reprovado': 'text-gd-red',
  'Reprovado Manual': 'text-gd-red',
  'Aguardando análise': 'text-gd-orange',
  'Em análise': 'text-gd-orange',
}

const COLETA_LABEL: Record<string, string> = {
  nova: 'Nova coleta',
  aberta: 'Coleta aberta',
  progresso: 'Em progresso',
  recebida: 'Recebida',
  finalizada: 'Finalizada',
}

const COLETA_COR: Record<string, string> = {
  nova: 'text-neutral-500',
  aberta: 'text-neutral-500',
  progresso: 'text-yellow-600',
  recebida: 'text-gd-blue-100',
  finalizada: 'text-gd-green-100',
}

/* ------------------------------------------------------------------ */
/* Tela 1 — resumo da análise                                          */
/* ------------------------------------------------------------------ */

export function GdAnaliseResumo() {
  const { slug = '', participanteId = '' } = useParams()
  const navegar = useNavigate()
  const [a, setA] = useState<AnaliseParticipante | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  /* O candidato reenviou, ou outro analista deu um parecer: esta tela
     acompanha sem F5. */
  useMudancas(['coleta', 'grupo'], recarregar)

  useEffect(() => {
    let cancelado = false
    setErro(null)
    analiseParticipante(participanteId)
      .then((r) => { if (!cancelado) setA(r) })
      .catch((f: unknown) => {
        if (!cancelado) setErro(f instanceof Error ? f.message : String(f))
      })
    return () => { cancelado = true }
  }, [participanteId, versao])

  async function finalizar() {
    if (!a) return
    setOcupado(true)
    setAviso(null)
    try {
      const r = await finalizarColeta(a.participante_id)
      if (!r.ok) {
        setAviso(
          r.motivo ??
            (r.itens
              ? resumoPendencias(r.itens)
              : `Ainda há ${r.pendentes ?? 0} documento(s) em aberto ou reprovado(s).`),
        )
      } else recarregar()
    } catch (f: unknown) {
      setAviso(f instanceof Error ? f.message : String(f))
    } finally {
      setOcupado(false)
    }
  }

  if (erro) {
    return (
      <Moldura modulo="Análise">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-gd-red">
          Não foi possível carregar a coleta: {erro}
        </p>
      </Moldura>
    )
  }

  if (!a) {
    return (
      <Moldura modulo="Análise">
        <p className="py-16 text-center text-gd-gray-400">Carregando…</p>
      </Moldura>
    )
  }

  const finalizada = a.status_coleta === 'finalizada'
  /* `undefined` = banco anterior à migração 26, que não devolve a lista.
     Nesse caso a tela sabe que não pode finalizar, mas não sabe por quê. */
  const pendencias = a.pendencias ?? null

  return (
    <Moldura modulo={a.modulo}>
      <div className="flex w-full flex-col gap-6 transition-all">
        <b className="text-neutral-400/80">Participantes e Coletas</b>

        <div className="flex w-full items-center justify-between transition-all">
          <div className="flex w-full items-center gap-3 transition-all">
            <b className="text-2xl text-gd-blue-200">{a.nome}</b>
            <span className={COLETA_COR[a.status_coleta] ?? 'text-neutral-500'}>
              ({COLETA_LABEL[a.status_coleta] ?? a.status_coleta})
            </span>
            {!a.titular && (
              <span className="rounded-full bg-gd-blue-50 px-3 py-1 text-xs font-bold text-gd-blue">
                {a.parentesco ?? 'Familiar'}
              </span>
            )}
          </div>

          <div className="flex w-auto items-center gap-4 transition-all">
            <span className="text-nowrap text-sm text-neutral-700">
              <b>Finalizado por: {a.finalizada_por ?? '--'}</b>
            </span>
            <button
              type="button"
              onClick={finalizar}
              disabled={!a.pode_finalizar || ocupado}
              title={
                finalizada
                  ? 'Coleta já finalizada'
                  : a.pode_finalizar
                    ? 'Encerrar a análise desta coleta'
                    : pendencias
                      ? resumoPendencias(pendencias)
                      : 'Ainda há documento em aberto ou reprovado'
              }
              className="flex h-10 min-w-[17rem] items-center justify-center gap-2 whitespace-nowrap rounded-md bg-gd-blue px-4 py-2 text-sm font-medium text-white shadow transition-all hover:bg-gd-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ocupado ? 'Finalizando…' : 'Finalizar Coleta'}
            </button>
          </div>
        </div>

        {aviso && (
          <p className="rounded-md border border-gd-orange/40 bg-gd-white-orange px-4 py-3 text-sm text-gd-orange">
            {aviso}
          </p>
        )}

        {!finalizada && pendencias && pendencias.length > 0 && (
          <Pendencias itens={pendencias} />
        )}

        <div className="flex min-h-[50vh] w-full flex-col gap-3.5 rounded-xl border border-gd-gray-100 p-10 px-14 text-gd-gray-400 shadow-gd-collections-card transition-all">
          <div className="flex w-full flex-col gap-4 transition-all">
            <div className="flex w-full items-center justify-between transition-all">
              <b className="text-lg text-gd-blue">Dados do Participante</b>
              <AcoesParticipante
                variante="redondo"
                alvo={{
                  participanteId: a.participante_id,
                  nome: a.nome,
                  email: a.email,
                  moduloSlug: a.modulo_slug,
                  modulo: a.modulo,
                }}
                aoMudar={recarregar}
                aoExcluir={() => navegar(`/gendocs/modulo/${slug}/participantes`, { replace: true })}
              />
            </div>

            <LinhaDado rotulo="Nome do Participante" valor={a.nome} />
            <LinhaDado rotulo="E-mail" valor={a.email} />
            {(a.observacao_1 || a.observacao_2 || a.observacao_3) && (
              <>
                {a.observacao_1 && <LinhaDado rotulo="Observação 1" valor={a.observacao_1} />}
                {a.observacao_2 && <LinhaDado rotulo="Observação 2" valor={a.observacao_2} />}
                {a.observacao_3 && <LinhaDado rotulo="Observação 3" valor={a.observacao_3} />}
              </>
            )}
          </div>

          <b className="text-lg text-gd-blue">Documentos Solicitados</b>

          {a.documentos.map((d) => (
            <LinhaDocumento key={d.documento_coleta_id} d={d} slug={slug} participanteId={participanteId} />
          ))}
        </div>
      </div>

    </Moldura>
  )
}

function Moldura({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={modulo} />
      {children}
    </div>
  )
}

function LinhaDado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-neutral-400 px-6 py-2 text-neutral-700 transition-all">
      <b>{rotulo}</b>
      <span className="min-w-0 truncate pl-4 text-right">{valor}</span>
    </div>
  )
}

function LinhaDocumento({
  d, slug, participanteId,
}: { d: DocumentoAnalise; slug: string; participanteId: string }) {
  return (
    <Link
      to={`/gendocs/modulo/${slug}/participantes/${participanteId}/documento/${d.documento_coleta_id}`}
      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-gd-gray-100 p-5 shadow transition-all hover:shadow-md"
    >
      <div className="min-w-0">
        <b className="text-gd-gray-400">{d.nome}</b>
        {d.nome_original && (
          <p className="truncate text-xs text-gd-gray-100">{d.nome_original}</p>
        )}
      </div>
      <div className={cn('flex w-auto shrink-0 items-center gap-2 pl-4 transition-all', ROTULO_COR[d.rotulo])}>
        <b>{d.rotulo}</b>
      </div>
    </Link>
  )
}

/**
 * Por que o "Finalizar Coleta" está desabilitado.
 *
 * A regra vive no banco (`coleta_pendencias_finalizacao`, migração 26) e vem
 * pronta na resposta: finalizar exige parecer do analista em TODO item com
 * arquivo e nenhum indeferido — a conferência automática não conta como
 * parecer. Mostrar a lista evita o botão cinza sem explicação.
 */
function Pendencias({ itens }: { itens: PendenciaFinalizacao[] }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-gd-orange/40 bg-gd-white-orange px-4 py-3 text-sm text-gd-orange">
      <b>{resumoPendencias(itens)}</b>
      <ul className="flex flex-col gap-1">
        {itens.map((p) => (
          <li key={p.nome} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{p.nome}</span>
            <span className="text-xs text-gd-orange/80">— {p.motivo}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 text-xs text-gd-orange/80">
        A coleta só é finalizada com todos os itens deferidos. Abra cada documento e use
        Ações &gt; Aprovação manual ou Reprovação manual.
      </p>
    </div>
  )
}

function resumoPendencias(itens: PendenciaFinalizacao[]): string {
  if (itens.length === 0) return 'Nada impede a finalização.'
  const n = itens.length
  return `Faltam ${n} ${n === 1 ? 'item' : 'itens'} para finalizar a coleta.`
}

/* ------------------------------------------------------------------ */
/* Tela 2 — análise de um documento                                    */
/* ------------------------------------------------------------------ */

export function GdAnaliseDocumento() {
  const { slug = '', participanteId = '', docId = '' } = useParams()
  const navegar = useNavigate()
  const [d, setD] = useState<AnaliseDocumento | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)
  const [aba, setAba] = useState<'dados' | 'uploads'>('dados')
  const [reprovando, setReprovando] = useState(false)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useMudancas(['coleta'], recarregar)

  useEffect(() => {
    let cancelado = false
    setErro(null)
    setD(null)
    analiseDocumento(docId)
      .then((r) => { if (!cancelado) setD(r) })
      .catch((f: unknown) => {
        if (!cancelado) setErro(f instanceof Error ? f.message : String(f))
      })
    return () => { cancelado = true }
  }, [docId, versao])

  const base = `/gendocs/modulo/${slug}/participantes/${participanteId}`

  if (erro) {
    return (
      <Moldura modulo="Análise">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-gd-red">{erro}</p>
      </Moldura>
    )
  }

  if (!d) {
    return (
      <Moldura modulo="Análise">
        <p className="py-16 text-center text-gd-gray-400">Carregando…</p>
      </Moldura>
    )
  }

  const campos = Object.entries(d.campos)

  return (
    <Moldura modulo={d.modulo}>
      <div className="flex w-full flex-col gap-6 transition-all">
        <p className="text-neutral-400/80">
          <b>Participantes e Coletas</b>
          <span className="px-2">&gt;</span>
          <Link to={base} className="font-bold text-gd-blue hover:underline">
            {d.participante}
          </Link>
        </p>

        <div className="flex w-full flex-wrap items-center justify-between gap-4 transition-all">
          <b className="text-2xl text-gd-blue-200">{d.nome}</b>
          <div className="flex items-center gap-3">
            <BotaoNavegacao
              rotulo="Documento anterior"
              lado="esquerda"
              destino={d.anterior ? `${base}/documento/${d.anterior}` : null}
              onIr={navegar}
            />
            <BotaoNavegacao
              rotulo="Próximo Documento"
              lado="direita"
              destino={d.proximo ? `${base}/documento/${d.proximo}` : null}
              onIr={navegar}
            />
          </div>
        </div>

        {/* Abas */}
        <div className="flex w-full overflow-hidden rounded-t-xl border-b border-gd-gray-100">
          <Aba ativa={aba === 'dados'} onClick={() => setAba('dados')}>
            Dados do documento
          </Aba>
          <Aba ativa={aba === 'uploads'} onClick={() => setAba('uploads')}>
            Histórico de Uploads
          </Aba>
        </div>

        {aba === 'dados' ? (
          <div className="flex w-full flex-col gap-6 rounded-b-xl border border-t-0 border-gd-gray-100 p-8 shadow-gd-collections-card lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <b className="text-lg text-gd-blue">Imagem</b>
              <b className={cn('text-sm', ROTULO_COR[d.rotulo])}>{d.rotulo}</b>

              {d.arquivo ? (
                <VisorDoArquivo
                  d={d}
                  onAprovar={recarregar}
                  onReprovar={() => setReprovando(true)}
                />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gd-gray-100 bg-gd-gray-50 p-8 text-center">
                  <b className="text-gd-gray-400">Nenhum arquivo enviado</b>
                  <p className="text-sm text-gd-gray-100">
                    {d.resolvido
                      ? 'Este campo foi validado por equivalência — o arquivo está no documento que o substitui.'
                      : 'O candidato ainda não anexou este documento.'}
                  </p>
                </div>
              )}

              {d.motivo_recusa && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm leading-relaxed text-gd-red">
                  {d.motivo_recusa}
                </p>
              )}
              {d.analisado_por && (
                <p className="text-xs text-gd-gray-100">
                  Última ação por <b>{d.analisado_por}</b>
                  {d.analisado_em && ` em ${dataBr(d.analisado_em)}`}
                </p>
              )}
            </div>

            {/* Painel lateral: só os documentos de identificação têm. */}
            {campos.length > 0 && (
              <div className="w-full shrink-0 rounded-xl border border-gd-gray-100 p-6 lg:w-[42%]">
                <b className="text-lg text-gd-blue">Campos do Documento</b>
                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  {campos.map(([nome, campo]) => (
                    <div key={nome} className="min-w-0 border-b border-gd-gray-100 pb-1">
                      <p className="truncate text-xs text-gd-gray-100" title={nome}>{nome}</p>
                      <div className="flex items-end justify-between gap-2">
                        <b className="min-w-0 truncate text-sm text-gd-black" title={campo.valor}>
                          {campo.valor}
                        </b>
                        <span className="shrink-0 text-xs tabular-nums text-gd-gray-400">
                          {campo.confianca}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <NotaDosCampos />
              </div>
            )}
          </div>
        ) : (
          <HistoricoDeUploads d={d} />
        )}
      </div>

      <ModalReprovar
        aberto={reprovando}
        d={d}
        onFechar={() => setReprovando(false)}
        onReprovado={() => { setReprovando(false); recarregar() }}
      />
    </Moldura>
  )
}

function BotaoNavegacao({
  rotulo, lado, destino, onIr,
}: {
  rotulo: string
  lado: 'esquerda' | 'direita'
  destino: string | null
  onIr: (to: string) => void
}) {
  return (
    <button
      type="button"
      disabled={!destino}
      onClick={() => destino && onIr(destino)}
      className="flex h-11 items-center gap-2 rounded-md border-2 border-gd-blue px-4 text-sm font-bold text-gd-blue transition-colors hover:bg-gd-blue-10 disabled:cursor-not-allowed disabled:border-gd-gray-100 disabled:text-gd-gray-100"
    >
      {lado === 'esquerda' && <FaChevronLeft className="size-3.5" />}
      {rotulo}
      {lado === 'direita' && <FaChevronRight className="size-3.5" />}
    </button>
  )
}

function Aba({
  ativa, onClick, children,
}: { ativa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 px-6 py-4 text-left text-lg transition-colors',
        ativa ? 'bg-white font-bold text-gd-blue-200' : 'bg-gd-blue-10 font-semibold text-gd-gray-100',
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* O visor e o menu Ações                                              */
/* ------------------------------------------------------------------ */

function VisorDoArquivo({
  d, onAprovar, onReprovar,
}: { d: AnaliseDocumento; onAprovar: () => void; onReprovar: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!d.arquivo) return
    let cancelado = false
    setUrl(null)
    urlDoArquivo(d.arquivo.storage_path)
      .then((u) => { if (!cancelado) setUrl(u) })
      .catch((f: unknown) => {
        if (!cancelado) setFalha(f instanceof Error ? f.message : String(f))
      })
    return () => { cancelado = true }
  }, [d.arquivo])

  if (!d.arquivo) return null
  const daEquivalencia = d.arquivo.documento_de !== d.nome

  return (
    <div className="mt-2 flex flex-col gap-2">
      {daEquivalencia && (
        <p className="rounded-md bg-gd-white-green px-3 py-2 text-xs text-gd-green-200">
          O arquivo abaixo é do documento <b>{d.arquivo.documento_de}</b>, que cobre este campo por
          equivalência.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-gd-gray-100">
        <div className="flex items-center justify-between gap-4 bg-gd-blue-200 px-4 py-3 text-white">
          <b className="min-w-0 truncate">{d.arquivo.nome_original}</b>
          <MenuAcoes d={d} onAprovar={onAprovar} onReprovar={onReprovar} />
        </div>

        {falha ? (
          <p className="p-6 text-sm text-gd-red">{falha}</p>
        ) : url ? (
          <iframe
            src={url}
            title={d.arquivo.nome_original}
            className="h-[34rem] w-full bg-gd-gray-50"
          />
        ) : (
          <p className="p-16 text-center text-gd-gray-400">Abrindo o arquivo…</p>
        )}
      </div>

      <p className="text-xs text-gd-gray-100">
        Versão {d.arquivo.versao}
        {d.arquivo.tamanho_bytes != null &&
          ` · ${(d.arquivo.tamanho_bytes / 1024).toFixed(0)} KB`}
        {` · enviado em ${dataBr(d.arquivo.enviado_em)}`}
      </p>
    </div>
  )
}

function MenuAcoes({
  d, onAprovar, onReprovar,
}: { d: AnaliseDocumento; onAprovar: () => void; onReprovar: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  /* Clique fora fecha — o menu fica sobre o visor do PDF, e sem isto ele
     esconderia o documento que a pessoa está tentando olhar. */
  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const finalizada = d.status_coleta === 'finalizada'

  async function aprovar() {
    setOcupado(true)
    try {
      await aprovarDocumento(d.documento_coleta_id)
      setAberto(false)
      onAprovar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div ref={caixa} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={finalizada}
        title={finalizada ? 'Coleta finalizada — sem ações' : undefined}
        className="flex h-9 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-gd-blue-200 transition-colors hover:bg-gd-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ações
        <FaChevronDown className={cn('size-3 transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-md border border-gd-gray-100 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={aprovar}
            disabled={ocupado}
            className="block w-full px-4 py-2 text-left text-sm text-gd-green-200 transition-colors hover:bg-gd-white-green disabled:opacity-50"
          >
            Aprovação manual
          </button>
          <button
            type="button"
            onClick={() => { setAberto(false); onReprovar() }}
            className="block w-full px-4 py-2 text-left text-sm text-gd-red transition-colors hover:bg-red-50"
          >
            Reprovação manual
          </button>
        </div>
      )}
    </div>
  )
}

function ModalReprovar({
  aberto, d, onFechar, onReprovado,
}: { aberto: boolean; d: AnaliseDocumento; onFechar: () => void; onReprovado: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (aberto) { setMotivo(''); setFalha(null) }
  }, [aberto])

  async function reprovar() {
    setOcupado(true)
    setFalha(null)
    try {
      await reprovarDocumento(d.documento_coleta_id, motivo)
      onReprovado()
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <GdModal aberto={aberto} onFechar={onFechar} titulo="Reprovação manual">
      <div className="flex flex-col gap-4">
        <p className="text-gd-gray-400">
          Reprovar <b className="text-gd-blue-200">{d.nome}</b> devolve o documento para{' '}
          <b>{d.participante}</b> corrigir. A coleta volta a ficar editável na tela dele.
        </p>

        <GdField label="Motivo (o candidato vê este texto)">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ex.: o arquivo está ilegível na parte do número do RG."
            className="w-full rounded-md border border-gd-gray-100 px-3 py-2 text-sm text-gd-black outline-none transition-colors focus:border-gd-blue"
          />
        </GdField>
        <p className="-mt-2 text-xs text-gd-gray-100">
          Em branco, o candidato recebe "Reprovado na análise. Envie o documento correto."
        </p>

        {falha && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-gd-red">{falha}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFechar}
            className="h-10 rounded-md border-2 border-gd-gray-100 px-5 text-sm font-bold text-gd-gray-400 transition-colors hover:bg-gd-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={reprovar}
            disabled={ocupado}
            className="h-10 rounded-md bg-gd-red px-5 text-sm font-bold text-white shadow transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {ocupado ? 'Reprovando…' : 'Reprovar documento'}
          </button>
        </div>
      </div>
    </GdModal>
  )
}

/* ------------------------------------------------------------------ */
/* Aba "Histórico de Uploads"                                          */
/* ------------------------------------------------------------------ */

const UPLOAD_ROTULO: Record<string, string> = {
  enviado: 'Enviado',
  analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  aprovado_ia: 'Aprovado',
  reprovado_ia: 'Reprovado',
  pendente: 'Pendente',
}

const UPLOAD_COR: Record<string, string> = {
  aprovado: 'text-gd-green-100',
  aprovado_ia: 'text-gd-green-100',
  reprovado: 'text-gd-red',
  reprovado_ia: 'text-gd-red',
  enviado: 'text-gd-orange',
  analise: 'text-gd-orange',
  pendente: 'text-gd-gray-100',
}

function HistoricoDeUploads({ d }: { d: AnaliseDocumento }) {
  const horaBr = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })

  return (
    <div className="min-h-[28rem] w-full rounded-b-xl border border-t-0 border-gd-gray-100 p-8 shadow-gd-collections-card">
      <table className="w-full border-separate border-spacing-y-3 text-left">
        <thead>
          <tr className="text-gd-gray-400">
            <th className="px-4 pb-2 font-bold">Nome do arquivo</th>
            <th className="px-4 pb-2 font-bold">Revisor</th>
            <th className="px-4 pb-2 font-bold">Data</th>
            <th className="px-4 pb-2 font-bold">Hora</th>
            <th className="px-4 pb-2 text-right font-bold">Status do upload</th>
          </tr>
        </thead>
        <tbody>
          {d.uploads.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gd-gray-100">
                Nenhum upload para este documento.
              </td>
            </tr>
          )}
          {d.uploads.map((u) => (
            <tr key={u.versao} className="rounded-lg border border-gd-gray-100 bg-white shadow-sm">
              <td className="rounded-l-lg border-y border-l border-gd-gray-100 px-4 py-4 font-semibold text-gd-gray-400">
                {u.nome_original}
              </td>
              <td className="border-y border-gd-gray-100 px-4 py-4 font-semibold text-gd-gray-400">
                {u.revisor ?? 'GenDocs'}
              </td>
              <td className="border-y border-gd-gray-100 px-4 py-4 font-semibold text-gd-gray-400">
                {dataBr(u.enviado_em)}
              </td>
              <td className="border-y border-gd-gray-100 px-4 py-4 font-semibold text-gd-gray-400">
                {horaBr(u.enviado_em)}
              </td>
              <td
                className={cn(
                  'rounded-r-lg border-y border-r border-gd-gray-100 px-4 py-4 text-right font-bold',
                  UPLOAD_COR[u.status],
                )}
              >
                {UPLOAD_ROTULO[u.status] ?? u.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ==================================================================
 * Nota de desenvolvimento do painel de campos
 *
 * O painel imita o que o GenDocs real entrega: os campos que o OCR leu e a
 * confiança de cada um. Aqui não há OCR — os valores vêm do cadastro da
 * própria pessoa. Sem dizer isso, alguém testando concluiria que a leitura
 * do documento funciona.
 * ================================================================== */

function NotaDosCampos() {
  return (
    <p className="mt-6 rounded-md border border-dashed border-amber-400 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900/90">
      <b className="uppercase tracking-wide text-amber-700">Nota de desenvolvimento:</b> nenhum OCR
      leu este arquivo. Os valores vêm do cadastro da própria pessoa e a confiança é gerada a
      partir do nome do campo — fixa, para a tela não mudar a cada abertura. Quando um modelo de
      verdade for conectado, ele passa a gravar estes campos e a tela continua igual.
    </p>
  )
}
