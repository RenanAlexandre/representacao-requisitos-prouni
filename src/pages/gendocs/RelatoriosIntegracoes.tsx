import { useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { FaRegPenToSquare, FaRegTrashCan } from 'react-icons/fa6'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { GdButton, GdIconButton, GdPaginacao, GdSearch } from '../../components/gendocs/ui'
import { getModulo, RELATORIO_TEMPLATES } from '../../data/gendocs'

/**
 * "Relatórios" — grade de templates com miniatura da planilha.
 * Réplica de `GenDocs - tela relatórios.html` (print 9).
 */
export function GdRelatorios() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)
  if (!m) return <Navigate to="/gendocs" replace />

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col transition-all">
        <b className="mb-5 text-xl text-gd-gray-400">Templates</b>
        <div className="flex w-full flex-wrap items-center gap-10 transition-all">
          {RELATORIO_TEMPLATES.map((t) => (
            <div key={t} className="flex w-full max-w-sm cursor-pointer flex-col rounded-xl bg-white transition-all">
              <img src="/standardTemplate.png" alt="" className="bg-transparent" />
              <div className="flex h-20 w-auto items-center justify-center rounded-xl rounded-t-none border border-gd-gray-100 p-4 px-10 text-center text-lg text-black/75 transition-all">
                <b className="line-clamp-2">{t}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * "Integrações" — lista de webhooks do módulo.
 * Réplica de `GenDocs - TELA INTEGRAÇÕES.html`.
 */
export function GdIntegracoes() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)

  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const lista = useMemo(
    () => (m ? m.integracoes.filter((i) => i.url.toLowerCase().includes(busca.trim().toLowerCase())) : []),
    [m, busca],
  )

  if (!m) return <Navigate to="/gendocs" replace />

  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const visiveis = lista.slice((pagina - 1) * porPagina, pagina * porPagina)

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col transition-all">
        <div className="mb-5 flex w-full items-center text-xl font-bold text-gd-blue-200 transition-all">
          Integrações
        </div>

        <div className="flex w-full items-center justify-between gap-4 transition-all">
          <div className="relative w-full">
            <GdSearch value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquise pela integração..." />
          </div>
          <GdButton className="h-12 px-16 text-base">
            Novo <p className="text-xl">+</p>
          </GdButton>
        </div>

        <div className="mt-8 flex w-full flex-col transition-all">
          <div className="w-full overflow-hidden rounded-lg">
            <div className="relative w-full overflow-auto px-2">
              <table className="gd-table">
                <thead className="text-lg">
                  <tr>
                    <th className="px-6 text-left align-middle font-bold text-gray-500">
                      <div className="flex min-w-52 gap-2">URL Webhook</div>
                    </th>
                    <th className="px-6 text-left align-middle font-bold text-gray-500">
                      <div className="flex min-w-32 items-center justify-center">Máximo de Tentativas</div>
                    </th>
                    <th className="px-6 text-left align-middle font-bold text-gray-500">
                      <div className="flex min-w-32 items-center justify-center">Token de Integração</div>
                    </th>
                    <th className="px-6 text-left align-middle font-bold text-gray-500">
                      <div className="flex min-w-32 items-center justify-center">Ações</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((i) => (
                    <tr key={i.url} className="gd-row h-14 cursor-pointer bg-white">
                      <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-gray-700">
                        <div className="flex min-w-52 items-center gap-2">
                          <span className="truncate">{i.url}</span>
                        </div>
                      </td>
                      <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-gray-700">
                        <div className="flex min-w-32 items-center justify-center gap-2">{i.tentativas}</div>
                      </td>
                      <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-gray-700">
                        <div className="flex min-w-32 items-center justify-center gap-2">{i.token}</div>
                      </td>
                      <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-gray-700">
                        <div className="flex min-w-32 items-center justify-center gap-2">
                          <GdIconButton title="Editar">
                            <FaRegPenToSquare />
                          </GdIconButton>
                          <GdIconButton title="Excluir">
                            <FaRegTrashCan />
                          </GdIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visiveis.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gd-gray-400">
                        Nenhuma integração cadastrada neste módulo.
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
            pagina={pagina}
            totalPaginas={totalPaginas}
            onPagina={setPagina}
          />
        </div>
      </div>
    </div>
  )
}
