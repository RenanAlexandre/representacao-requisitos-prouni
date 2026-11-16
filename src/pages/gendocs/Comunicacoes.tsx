import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { FaRegPenToSquare, FaRegEnvelope, FaChevronRight } from 'react-icons/fa6'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { GdMenuCard, GdSearch } from '../../components/gendocs/ui'
import { getModulo } from '../../data/gendocs'

/**
 * "Comunicações e E-mails" — grade com dois cards de menu.
 * Réplica de `GenDocs - tela comunicações e emails.html`.
 */
export function GdComunicacoes() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const m = getModulo(slug)
  if (!m) return <Navigate to="/gendocs" replace />

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col transition-all">
        <div className="mt-2 flex w-full items-center text-xl font-bold text-gd-blue transition-all">
          Comunicações e E-mails
        </div>

        <div className="mt-4 flex w-full flex-col transition-all">
          <b className="mb-2 text-lg text-gd-gray-400">Menus</b>
          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-7 xl:gap-x-14">
            <GdMenuCard
              icon={<FaRegPenToSquare className="size-6 shrink-0" />}
              label="Layout do E-mail"
              chevron={<FaChevronRight className="size-4" />}
              onClick={() => navigate(`/gendocs/modulo/${slug}/comunicacoes/layout`)}
            />
            <GdMenuCard
              icon={<FaRegEnvelope className="size-6 shrink-0" />}
              label="Textos dos E-mails"
              chevron={<FaChevronRight className="size-4" />}
              onClick={() => navigate(`/gendocs/modulo/${slug}/comunicacoes/textos`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * "Textos dos E-mails" — busca + tabela (Assunto / Tipo).
 * Réplica de `GenDocs - TEXTOS DOS EMAILS.html`.
 */
export function GdTextosEmails() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)
  const [busca, setBusca] = useState('')
  if (!m) return <Navigate to="/gendocs" replace />

  const lista = m.emails.filter(
    (e) =>
      e.assunto.toLowerCase().includes(busca.trim().toLowerCase()) ||
      e.tipo.toLowerCase().includes(busca.trim().toLowerCase()),
  )

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col transition-all">
        <div className="flex w-full items-center gap-2 transition-all">
          <b className="text-gd-gray-400">Comunicação e E-mails</b>
          <b className="text-gd-gray-400">&gt;</b>
          <b className="text-lg text-gd-blue">Textos dos E-mails</b>
        </div>

        <div className="mt-5 flex w-full items-center transition-all">
          <div className="relative w-full">
            <GdSearch value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquise" />
          </div>
        </div>

        <div className="mt-2 w-full overflow-hidden rounded-lg">
          <div className="relative w-full overflow-auto px-2">
            <table className="gd-table">
              <thead className="text-lg">
                <tr>
                  <th className="px-6 text-left align-middle font-bold text-gray-500" style={{ minWidth: 150 }}>
                    Assunto do E-mail
                  </th>
                  <th className="px-6 text-left align-middle font-bold text-gray-500" style={{ minWidth: 150 }}>
                    Tipo de E-mail
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.tipo} className="gd-row h-14 cursor-pointer bg-white">
                    <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-gray-700">
                      {e.assunto}
                    </td>
                    <td className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle text-gray-700">
                      {e.tipo}
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-6 py-10 text-center text-gd-gray-400">
                      Nenhum e-mail encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
