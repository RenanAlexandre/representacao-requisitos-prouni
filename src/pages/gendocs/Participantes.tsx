import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom'
import { FaArrowUpFromBracket, FaSliders, FaSort, FaXmark, FaDownload } from 'react-icons/fa6'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { AcoesParticipante } from '../../components/gendocs/AcoesParticipante'
import {
  GdButton, GdOutlineButton, GdSearch, GdPaginacao, GdModal, GdField, GdInput,
} from '../../components/gendocs/ui'
import {
  getModulo, listarParticipantes, STATUS_LABEL, STATUS_ORDEM, STATUS_TEXT,
  type ColetaStatus, type Participante,
} from '../../data/gendocs'
import { dataBr, listarParticipantesGenDocs } from '../../lib/api'
import { useMudancas } from '../../lib/tempo-real'
import { cn } from '../../lib/cn'

type Ordem = { campo: 'recebimento' | 'sla' | null; asc: boolean }

/**
 * "Participantes e Coletas" — lista, busca, filtro, paginação e os dois modais
 * de cadastro. Réplica de `GenDocs - tela participantes e coletas.html`
 * (prints 5, 6, 7 e 8).
 */
export function GdParticipantes() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)

  /* O Portal do Candidato manda o participante em `?participante=`, para o
     acesso direto de cada pessoa cair já na linha dela. */
  const [parametros] = useSearchParams()
  const [busca, setBusca] = useState(parametros.get('participante') ?? '')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [ordem, setOrdem] = useState<Ordem>({ campo: null, asc: true })
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [fStatus, setFStatus] = useState<ColetaStatus | ''>('')
  const [fSla, setFSla] = useState('')
  const [novoAberto, setNovoAberto] = useState(false)
  const [importarAberto, setImportarAberto] = useState(false)

  /* Participantes reais do módulo — quem entrou pela inscrição da landing ou
     foi inserido como familiar no portal. Módulo que não existe no banco (as
     réplicas dos prints) continua com a lista derivada de `data/gendocs.ts`. */
  const [vivos, setVivos] = useState<Participante[] | null>(null)
  const [versao, setVersao] = useState(0)

  /* Editar ou excluir um participante muda a lista. */
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useMudancas(['coleta', 'grupo'], recarregar)

  useEffect(() => {
    let cancelado = false
    setVivos(null)
    listarParticipantesGenDocs(slug)
      .then((ps) => {
        if (cancelado) return
        setVivos(
          ps.map((p) => ({
            id: p.id,
            nome: p.nome,
            email: p.email,
            recebimento: p.recebida_em ? dataBr(p.recebida_em) : null,
            sla: p.prazo_em ? dataBr(p.prazo_em) : 'N/A',
            status: p.status as ColetaStatus,
            obs1: p.protocolo,
            obs2: p.titular ? 'Titular' : (p.parentesco ?? 'Familiar'),
            obs3: `${p.aprovados}/${p.documentos} aprovados`,
          })),
        )
      })
      .catch(() => {
        if (!cancelado) setVivos([])
      })
    return () => { cancelado = true }
  }, [slug, versao])

  const base = useMemo(() => {
    /* O banco manda quando o módulo existe lá; senão vale a réplica do print. */
    if (vivos && vivos.length > 0) return vivos
    if (vivos && m && m.participantes === 0) return vivos
    return m ? listarParticipantes(m) : []
  }, [m, vivos])

  const filtrada = useMemo(() => {
    let out = base
    const q = busca.trim().toLowerCase()
    if (q) out = out.filter((p) => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    if (fStatus) out = out.filter((p) => p.status === fStatus)
    if (fSla) out = out.filter((p) => p.sla === fSla)
    if (ordem.campo) {
      const c = ordem.campo
      out = [...out].sort((a, b) => {
        const va = (a[c] ?? '') as string
        const vb = (b[c] ?? '') as string
        return ordem.asc ? va.localeCompare(vb) : vb.localeCompare(va)
      })
    }
    return out
  }, [base, busca, fStatus, fSla, ordem])

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const visiveis = filtrada.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina)

  const slasDisponiveis = useMemo(() => Array.from(new Set(base.map((p) => p.sla))), [base])

  if (!m) return <Navigate to="/gendocs" replace />

  function alternarOrdem(campo: 'recebimento' | 'sla') {
    setOrdem((o) => (o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: true }))
  }

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col justify-between gap-3 transition-all">
        <div className="flex w-full items-center justify-between gap-2 transition-all">
          <b className="text-nowrap text-2xl text-gd-blue">Participantes e Coletas</b>
          <div className="flex w-full items-center justify-end gap-4 transition-all">
            <GdButton className="h-12 px-16 text-base" onClick={() => setNovoAberto(true)}>
              Novo <p className="text-xl">+</p>
            </GdButton>
            <GdOutlineButton className="h-12 px-[25px] text-base" onClick={() => setImportarAberto(true)}>
              Importar Lista <FaArrowUpFromBracket className="size-4" />
            </GdOutlineButton>
          </div>
        </div>

        <div className="relative flex w-full items-center justify-between gap-4 transition-all">
          <div className="relative w-full">
            <GdSearch
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(1)
              }}
              placeholder="Pesquise pelo participante..."
            />
          </div>

          <div className="relative">
            <GdOutlineButton
              className="relative h-12 w-52 px-4 text-base"
              onClick={() => setFiltroAberto((v) => !v)}
            >
              Filtro <FaSliders className="size-4" />
              {(fStatus || fSla) && (
                <span className="absolute -right-1 -top-1 size-4 rounded-full border border-gd-blue bg-white" />
              )}
            </GdOutlineButton>

            {filtroAberto && (
              <FiltroPopover
                status={fStatus}
                sla={fSla}
                slasDisponiveis={slasDisponiveis}
                onStatus={setFStatus}
                onSla={setFSla}
                onFechar={() => setFiltroAberto(false)}
                onLimpar={() => {
                  setFStatus('')
                  setFSla('')
                  setPagina(1)
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex min-h-[50vh] flex-col">
        <div className="relative w-full overflow-auto px-2">
          <table className="gd-table">
            <thead>
              <tr>
                <Th>Nome do Participante</Th>
                <Th>Email</Th>
                <Th ordenavel onClick={() => alternarOrdem('recebimento')}>
                  Recebimento da Coleta
                </Th>
                <Th ordenavel onClick={() => alternarOrdem('sla')}>
                  SLA
                </Th>
                <Th>Status</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <Linha key={p.id} p={p} slug={slug} aoMudar={recarregar} />
              ))}
              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-lg text-gd-gray-400">
                    Nenhum participante encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GdPaginacao
        porPagina={porPagina}
        onPorPagina={setPorPagina}
        pagina={paginaSegura}
        totalPaginas={totalPaginas}
        onPagina={setPagina}
      />

      <NovoParticipanteModal aberto={novoAberto} onFechar={() => setNovoAberto(false)} />
      <ImportarListaModal aberto={importarAberto} onFechar={() => setImportarAberto(false)} />
    </div>
  )
}

function Th({
  children,
  ordenavel,
  onClick,
}: {
  children: ReactNode
  ordenavel?: boolean
  onClick?: () => void
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'px-6 text-left align-middle text-xl font-bold text-gray-500',
        ordenavel && 'cursor-pointer select-none',
      )}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {ordenavel && <FaSort className="size-3.5 text-gray-400" />}
      </div>
    </th>
  )
}

/**
 * `id` uuid é participante do banco: a linha abre a análise e as ações valem.
 * As linhas das réplicas dos prints têm id sequencial e continuam inertes —
 * não existem no banco, não há o que analisar nelas.
 */
function Linha({ p, slug, aoMudar }: { p: Participante; slug: string; aoMudar: () => void }) {
  const navegar = useNavigate()
  const doBanco = p.id.includes('-')

  return (
    <tr
      className={cn('gd-row bg-white', doBanco && 'cursor-pointer')}
      onClick={doBanco ? () => navegar(`/gendocs/modulo/${slug}/participantes/${p.id}`) : undefined}
    >
      <Td>
        <div className="truncate">{p.nome}</div>
      </Td>
      <Td>
        <div className="truncate">{p.email}</div>
      </Td>
      <Td>
        <p>{p.recebimento ?? '-'}</p>
      </Td>
      <Td>
        <p>{p.sla}</p>
      </Td>
      <Td>
        <p className={cn('text-start', STATUS_TEXT[p.status])}>{STATUS_LABEL[p.status]}</p>
      </Td>
      <Td>
        {doBanco ? (
          <AcoesParticipante
            alvo={{ participanteId: p.id, nome: p.nome, email: p.email, moduloSlug: slug }}
            aoMudar={aoMudar}
          />
        ) : (
          <span className="text-xs text-gd-gray-100">—</span>
        )}
      </Td>
    </tr>
  )
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-lg text-gray-700">{children}</td>
  )
}

/* ------------------------------------------------------------------ */
/* Popover de filtro (print 8)                                         */
/* ------------------------------------------------------------------ */
function FiltroPopover({
  status,
  sla,
  slasDisponiveis,
  onStatus,
  onSla,
  onFechar,
  onLimpar,
}: {
  status: ColetaStatus | ''
  sla: string
  slasDisponiveis: string[]
  onStatus: (s: ColetaStatus | '') => void
  onSla: (s: string) => void
  onFechar: () => void
  onLimpar: () => void
}) {
  const select =
    'h-11 w-full rounded-md border border-gd-gray-100 px-3 text-base text-black/70 focus-visible:border-gd-blue-100 focus-visible:outline-none'

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onFechar} />
      <div className="absolute right-0 top-0 z-40 w-80 rounded-lg border border-gd-gray-100 bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onLimpar}
            className="rounded border border-gd-blue px-2 py-0.5 text-sm text-gd-blue underline transition-colors hover:bg-gd-white-blue"
          >
            Limpar
          </button>
          <b className="flex items-center gap-2 text-gd-blue-200">
            Filtrar <FaSliders className="size-4" />
          </b>
          <button onClick={onFechar} aria-label="Fechar" className="text-gray-400 hover:text-gray-600">
            <FaXmark className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold text-black/80">Por Status</p>
            <select className={select} value={status} onChange={(e) => onStatus(e.target.value as ColetaStatus | '')}>
              <option value="">Selecione o Status</option>
              {STATUS_ORDEM.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="font-semibold text-black/80">Por SLA</p>
            <select className={select} value={sla} onChange={(e) => onSla(e.target.value)}>
              <option value="">Selecione o prazo do SLA</option>
              {slasDisponiveis.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <GdOutlineButton className="h-10 px-6 text-sm" onClick={onFechar}>
              Cancelar
            </GdOutlineButton>
            <GdButton className="h-10 px-8 text-sm" onClick={onFechar}>
              Aplicar
            </GdButton>
          </div>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Modal "Novo Participante" (print 6)                                 */
/* ------------------------------------------------------------------ */
function NovoParticipanteModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <GdModal aberto={aberto} onFechar={onFechar} titulo="Novo Participante" largura="max-w-lg">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          onFechar()
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <GdField label="Nome Completo*">
            <GdInput placeholder="Insira o nome" />
          </GdField>
          <GdField label="E-mail*">
            <GdInput type="email" placeholder="Insira o email" />
          </GdField>
        </div>

        <GdField label="Observação 1">
          <GdInput placeholder="Insira a observação" />
        </GdField>
        <GdField label="Observação 2">
          <GdInput placeholder="Insira a observação" />
        </GdField>
        <GdField label="Observação 3">
          <GdInput placeholder="Insira a observação" />
        </GdField>

        <div className="mt-2 flex items-center justify-between">
          <GdOutlineButton type="button" className="h-11 px-10 text-base" onClick={onFechar}>
            Cancelar
          </GdOutlineButton>
          <GdButton type="submit" className="h-11 px-10 text-base">
            Aplicar
          </GdButton>
        </div>
      </form>
    </GdModal>
  )
}

/* ------------------------------------------------------------------ */
/* Modal "Importar Participantes" — assistente de 3 passos (print 7)   */
/* ------------------------------------------------------------------ */
function ImportarListaModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [passo, setPasso] = useState(1)

  function fechar() {
    setPasso(1)
    onFechar()
  }

  return (
    <GdModal aberto={aberto} onFechar={fechar} titulo="Importar Participantes" largura="max-w-2xl">
      {/* Stepper */}
      <div className="mb-5 flex items-center gap-3 border-b border-gd-blue pb-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                passo === n ? 'bg-gd-blue text-white' : 'border border-gd-blue text-gd-blue',
              )}
            >
              {n}
            </span>
            {passo === n && <span className="text-sm font-medium text-gd-blue">{TITULO_PASSO[n - 1]}</span>}
          </div>
        ))}
      </div>

      {passo === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-gray-600">
            Para importar uma lista de participantes é necessário que a lista siga o padrão do sistema, então por
            favor faça o download da planilha de exemplo listada abaixo
          </p>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">Planilha Exemplo:</p>
            <div className="flex items-center justify-between border-b border-gd-gray-100 pb-2">
              <a className="text-gd-blue underline" href="#planilha" onClick={(e) => e.preventDefault()}>
                planilhaexemplo.csv
              </a>
              <FaDownload className="size-4 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-4">
          <p className="text-gray-600">
            Selecione o arquivo tratado (.csv, .xls ou .xlsx) com a lista de participantes deste módulo.
          </p>
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gd-gray-100 text-gray-500 transition-colors hover:border-gd-blue hover:text-gd-blue">
            <FaArrowUpFromBracket className="size-6" />
            Clique para selecionar o arquivo
            <input type="file" className="hidden" accept=".csv,.xls,.xlsx" />
          </label>
        </div>
      )}

      {passo === 3 && (
        <div className="flex flex-col gap-4">
          <p className="text-gray-600">
            Confira o mapeamento das colunas antes de concluir. Cada linha da planilha vira um participante com
            coleta em <b>Nova Coleta</b>.
          </p>
          <div className="rounded-lg border border-gd-gray-100">
            {[
              ['Nome Candidato', 'Nome do Participante'],
              ['E-mail', 'Email'],
              ['Curso', 'Observação 1'],
              ['Cidade + UF', 'Observação 2'],
              ['Modalidade', 'Observação 3'],
            ].map(([de, para]) => (
              <div key={de} className="flex items-center justify-between border-b px-4 py-2.5 last:border-b-0">
                <span className="text-gray-600">{de}</span>
                <span className="text-gray-400">→</span>
                <b className="text-gd-blue-200">{para}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        <GdOutlineButton className="h-11 px-8 text-base" onClick={passo === 1 ? fechar : () => setPasso(passo - 1)}>
          {passo === 1 ? 'Cancelar' : 'Voltar'}
        </GdOutlineButton>

        <div className="flex items-center gap-6">
          {passo === 1 && (
            <button onClick={() => setPasso(2)} className="text-gd-blue underline underline-offset-2">
              Já tenho a planilha
            </button>
          )}
          <GdButton
            className="h-11 px-10 text-base"
            onClick={passo === 3 ? fechar : () => setPasso(passo + 1)}
          >
            {passo === 3 ? 'Concluir' : 'Avançar'}
          </GdButton>
        </div>
      </div>
    </GdModal>
  )
}

const TITULO_PASSO = ['Baixe a Planilha de exemplo', 'Envie a planilha preenchida', 'Confirme o mapeamento']
