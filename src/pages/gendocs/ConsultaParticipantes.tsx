import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaSort, FaXmark, FaDownload,
} from 'react-icons/fa6'
import { GdFiltroColuna, GdOutlineButton, GdPaginacao, GdSearch } from '../../components/gendocs/ui'
import { STATUS_LABEL, STATUS_TEXT, type ColetaStatus } from '../../data/gendocs'
import { AcoesParticipante } from '../../components/gendocs/AcoesParticipante'
import { consultarColetas, dataBr, type LinhaConsulta } from '../../lib/api'
import { useMudancas } from '../../lib/tempo-real'
import { cn } from '../../lib/cn'

/* ==================================================================
 * "Consulta de Participantes e Coletas" — a terceira aba da tela
 * inicial do GenDocs.
 *
 * As duas primeiras abas olham para MÓDULOS. Esta olha para PESSOAS:
 * todos os participantes de todos os módulos numa lista só, que é o
 * que a Secretaria precisa quando procura alguém sem saber em qual
 * módulo ele caiu.
 *
 * Busca geral (varre todas as colunas) e um filtro por coluna, que se
 * somam: a busca reduz o conjunto, os filtros afinam dentro dele.
 * ================================================================== */

type Campo = 'nome' | 'email' | 'modulo' | 'recebimento' | 'sla' | 'status'
type Ordem = { campo: Campo | null; asc: boolean }

const COLUNAS: { campo: Campo; titulo: string; largura: string }[] = [
  { campo: 'nome', titulo: 'Nome do Participante', largura: 'min-w-[220px]' },
  { campo: 'email', titulo: 'E-mail', largura: 'min-w-[240px]' },
  { campo: 'modulo', titulo: 'Módulo', largura: 'min-w-[230px]' },
  { campo: 'recebimento', titulo: 'Recebimento da Coleta', largura: 'min-w-[170px]' },
  { campo: 'sla', titulo: 'SLA', largura: 'min-w-[120px]' },
  { campo: 'status', titulo: 'Status', largura: 'min-w-[150px]' },
]

/** O texto pelo qual cada coluna é buscada, filtrada e ordenada. */
function valorDe(l: LinhaConsulta, campo: Campo): string {
  switch (campo) {
    case 'nome': return l.nome
    case 'email': return l.email
    case 'modulo': return l.modulo
    case 'recebimento': return l.recebida_em ? dataBr(l.recebida_em) : '-'
    case 'sla': return textoSla(l)
    case 'status': return STATUS_LABEL[l.status as ColetaStatus] ?? l.status
  }
}

function textoSla(l: LinhaConsulta): string {
  if (l.vencido) return 'Vencido'
  if (l.sla_horas == null || l.sla_horas === 0) return 'N/A'
  return `${l.sla_horas}h`
}

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function GdConsultaParticipantes() {
  const navegar = useNavigate()

  const [linhas, setLinhas] = useState<LinhaConsulta[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Partial<Record<Campo, string>>>({})
  const [ordem, setOrdem] = useState<Ordem>({ campo: null, asc: true })
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const [versao, setVersao] = useState(0)

  /* Editar ou excluir um participante muda a tabela — daí o recarregar que
     as ações da linha chamam. */
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useMudancas(['coleta', 'grupo', 'candidato'], recarregar)

  useEffect(() => {
    let cancelado = false
    consultarColetas()
      .then((l) => { if (!cancelado) setLinhas(l) })
      .catch((f: unknown) => { if (!cancelado) setErro(f instanceof Error ? f.message : String(f)) })
    return () => { cancelado = true }
  }, [versao])

  /* Opções dos filtros de coluna: as que existem de fato nos dados, para o
     menu nunca oferecer um valor que devolveria lista vazia. */
  const opcoes = useMemo(() => {
    const mapa = {} as Record<Campo, string[]>
    for (const { campo } of COLUNAS) {
      mapa[campo] = Array.from(new Set((linhas ?? []).map((l) => valorDe(l, campo)))).sort()
    }
    return mapa
  }, [linhas])

  const filtradas = useMemo(() => {
    let saida = linhas ?? []

    const q = semAcento(busca.trim())
    if (q) {
      /* Busca geral: casa em qualquer coluna, mais protocolo e identificador,
         que não são colunas mas é por eles que a Secretaria costuma procurar. */
      saida = saida.filter((l) =>
        [...COLUNAS.map((c) => valorDe(l, c.campo)), l.protocolo, l.identificador_externo ?? '']
          .some((v) => semAcento(v).includes(q)),
      )
    }

    for (const [campo, valor] of Object.entries(filtros)) {
      if (!valor) continue
      saida = saida.filter((l) => valorDe(l, campo as Campo) === valor)
    }

    if (ordem.campo) {
      const c = ordem.campo
      saida = [...saida].sort((a, b) => {
        const cmp = valorDe(a, c).localeCompare(valorDe(b, c), 'pt-BR')
        return ordem.asc ? cmp : -cmp
      })
    }

    return saida
  }, [linhas, busca, filtros, ordem])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const visiveis = filtradas.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina)

  const filtrosAtivos = Object.values(filtros).filter(Boolean).length
  const temFiltro = filtrosAtivos > 0 || busca.trim().length > 0

  function alternarOrdem(campo: Campo) {
    setOrdem((o) => (o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: true }))
  }

  function limpar() {
    setBusca('')
    setFiltros({})
    setPagina(1)
  }

  return (
    <div className="flex w-full flex-col gap-5 px-6 py-4 pb-6 transition-all">
      <div className="flex w-full flex-col gap-2 transition-all">
        <b className="text-2xl text-gd-blue">Consulta de Participantes e Coletas</b>
        <b className="text-sm text-gray-400">
          Todos os participantes de todos os módulos. Use a busca para procurar em qualquer coluna,
          ou os filtros de cada coluna para afinar o resultado.
        </b>
      </div>

      <div className="flex w-full items-center gap-4 transition-all">
        <GdSearch
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setPagina(1)
          }}
          placeholder="Pesquise por nome, e-mail, módulo, status, protocolo…"
        />
        {temFiltro && (
          <GdOutlineButton className="h-12 shrink-0 px-5 text-base" onClick={limpar}>
            Limpar <FaXmark className="size-4" />
          </GdOutlineButton>
        )}
        <GdOutlineButton className="h-12 shrink-0 px-5 text-base" onClick={() => baixarCsv(filtradas)}>
          Exportar <FaDownload className="size-4" />
        </GdOutlineButton>
      </div>

      {erro && (
        <p className="rounded-lg border border-gd-red/40 bg-red-50 px-4 py-3 text-gd-red">
          Não foi possível carregar a consulta: {erro}
        </p>
      )}

      <div className="flex min-h-[40vh] flex-col">
        <div className="relative w-full overflow-auto px-2">
          <table className="gd-table">
            <thead>
              <tr>
                {COLUNAS.map((c) => (
                  <th
                    key={c.campo}
                    className={cn('px-6 text-left align-top text-xl font-bold text-gray-500', c.largura)}
                  >
                    <button
                      type="button"
                      onClick={() => alternarOrdem(c.campo)}
                      className="flex cursor-pointer select-none items-center gap-1.5"
                    >
                      {c.titulo}
                      <FaSort
                        className={cn(
                          'size-3.5',
                          ordem.campo === c.campo ? 'text-gd-blue' : 'text-gray-300',
                        )}
                      />
                    </button>

                    {/* Filtro da coluna. Só as opções presentes nos dados. */}
                    <GdFiltroColuna
                      rotulo={c.titulo}
                      valor={filtros[c.campo] ?? ''}
                      opcoes={opcoes[c.campo] ?? []}
                      onChange={(v) => {
                        setFiltros((f) => ({ ...f, [c.campo]: v }))
                        setPagina(1)
                      }}
                    />
                  </th>
                ))}
                <th className="min-w-[160px] px-6 text-left align-top text-xl font-bold text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {linhas === null && !erro && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-lg text-gd-gray-400">
                    Carregando…
                  </td>
                </tr>
              )}

              {linhas !== null && visiveis.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-lg text-gd-gray-400">
                    {linhas.length === 0
                      ? 'Nenhum participante ainda — eles entram pela inscrição da landing page.'
                      : 'Nenhum participante encontrado com esses filtros.'}
                  </td>
                </tr>
              )}

              {visiveis.map((l) => (
                <tr
                  key={l.participante_id}
                  className="gd-row cursor-pointer bg-white"
                  onClick={() => navegar(`/gendocs/modulo/${l.modulo_slug}/participantes/${l.participante_id}`)}
                >
                  <Td>
                    <div className="truncate font-medium">{l.nome}</div>
                    <div className="truncate text-xs text-gd-gray-400">
                      {l.protocolo}
                      {!l.titular && l.parentesco && ` · ${l.parentesco}`}
                    </div>
                  </Td>
                  <Td>
                    <div className="truncate">{l.email}</div>
                  </Td>
                  <Td>
                    <div className="truncate">{l.modulo}</div>
                    <div className="text-xs text-gd-gray-400">
                      {l.resolvidos}/{l.documentos} obrigatórios
                    </div>
                  </Td>
                  <Td>
                    <p>{l.recebida_em ? dataBr(l.recebida_em) : '-'}</p>
                  </Td>
                  <Td>
                    <p className={cn(l.vencido && 'font-bold text-gd-red')}>{textoSla(l)}</p>
                  </Td>
                  <Td>
                    <p className={cn('text-start', STATUS_TEXT[l.status as ColetaStatus])}>
                      {STATUS_LABEL[l.status as ColetaStatus] ?? l.status}
                    </p>
                  </Td>
                  <Td>
                    <AcoesParticipante
                      alvo={{
                        participanteId: l.participante_id,
                        nome: l.nome,
                        email: l.email,
                        moduloSlug: l.modulo_slug,
                        modulo: l.modulo,
                      }}
                      aoMudar={recarregar}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-sm text-gd-gray-400">
            {filtradas.length}
            {linhas && filtradas.length !== linhas.length && ` de ${linhas.length}`} participante(s)
          </p>
          <GdPaginacao
            porPagina={porPagina}
            onPorPagina={(n) => {
              setPorPagina(n)
              setPagina(1)
            }}
            pagina={paginaSegura}
            totalPaginas={totalPaginas}
            onPagina={setPagina}
          />
        </div>
      </div>
    </div>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="max-w-[280px] px-6 py-4 align-middle text-gd-gray-400">{children}</td>
}

/**
 * Exporta o que está na tela — com os filtros aplicados, não a base inteira.
 * É o que a Secretaria espera de um "Exportar" ao lado de um filtro.
 */
function baixarCsv(linhas: LinhaConsulta[]) {
  const cabecalho = ['Nome', 'E-mail', 'Módulo', 'Recebimento', 'SLA', 'Status', 'Protocolo', 'Documentos']
  const corpo = linhas.map((l) => [
    l.nome,
    l.email,
    l.modulo,
    l.recebida_em ? dataBr(l.recebida_em) : '',
    textoSla(l),
    STATUS_LABEL[l.status as ColetaStatus] ?? l.status,
    l.protocolo,
    `${l.resolvidos}/${l.documentos}`,
  ])

  const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [cabecalho, ...corpo].map((linha) => linha.map((c) => escapar(String(c))).join(';')).join('\n')

  /* BOM para o Excel abrir os acentos direito. */
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `participantes-coletas-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
