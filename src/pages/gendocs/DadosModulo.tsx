import { type ReactNode } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { GdOutlineButton } from '../../components/gendocs/ui'
import { getModulo } from '../../data/gendocs'

/**
 * "Dados do Módulo" — ficha em leitura com os campos sublinhados.
 * Réplica de `GenDocs - tela dados do módulo.html`.
 */
export function GdDadosModulo() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)
  if (!m) return <Navigate to="/gendocs" replace />

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <b className="text-2xl text-gd-blue-200">Dados do Módulo</b>

      <div className="flex w-full flex-col rounded-xl border border-gd-gray-100 p-8 px-10 shadow-gd-document-card transition-all">
        <div className="grid w-full grid-cols-2 gap-8 gap-x-5">
          <Campo label="Nome do Módulo">{m.nome}</Campo>
          <Campo label="Link de Preenchimento">{m.linkPreenchimento}</Campo>
          <Campo label="Data de Início">{m.inicio}</Campo>
          <Campo label="Data de Término">{m.termino}</Campo>

          <div className="relative col-span-full flex w-full flex-col gap-1.5 transition-all">
            <p className="mb-1 font-semibold text-black/80">Descrição do Módulo</p>
            <div className="flex min-h-24 w-full items-start rounded-md border border-gd-gray-100/70 p-2 px-4 text-black/75 transition-all">
              {m.descricao}
            </div>
          </div>
        </div>

        <div className="mt-14 flex w-full items-center justify-between transition-all">
          <GdOutlineButton className="h-12 px-6 text-base">Editar dados</GdOutlineButton>
          <GdOutlineButton tone="red" className="h-12 px-6 text-base">
            Excluir dados
          </GdOutlineButton>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative flex w-full flex-col gap-1.5 transition-all">
      <p className="mb-1 font-semibold text-black/80">{label}</p>
      <div className="flex w-full items-center border-b border-gd-gray-100/70 pb-1 pl-6 text-black/75 transition-all">
        {children}
      </div>
    </div>
  )
}
