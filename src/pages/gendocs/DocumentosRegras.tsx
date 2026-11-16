import { useParams, Navigate } from 'react-router-dom'
import { FaGripLines, FaPen, FaCircleInfo, FaChevronDown } from 'react-icons/fa6'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { GdButton, GdLinkButton } from '../../components/gendocs/ui'
import { getModulo, STATUS_LABEL, STATUS_ORDEM, STATUS_TEXT } from '../../data/gendocs'
import { cn } from '../../lib/cn'

/**
 * "Documentos e Regras do Módulo" + "SLAs Status".
 * Réplica de `GenDocs - DOCUMENTOS E REGRAS DO MÓDULO.html`.
 */
export function GdDocumentosRegras() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)
  if (!m) return <Navigate to="/gendocs" replace />

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full select-none flex-col gap-6 transition-all">
        <div className="flex w-full items-center justify-between transition-all">
          <b className="text-2xl text-gd-blue">Documentos e Regras do Módulo</b>
          <div className="flex w-fit items-center justify-end gap-2 transition-all">
            <GdLinkButton>
              <FaPen className="size-4" /> Editar documentos
            </GdLinkButton>
            <GdButton className="h-11 rounded-md px-12 text-sm font-bold shadow-gd-document-card">
              Novo <span className="text-lg">+</span>
            </GdButton>
          </div>
        </div>

        <form className="flex w-full flex-col items-start gap-4 transition-all">
          <div className="flex w-full flex-col gap-3 rounded-lg border bg-gd-gray-50 py-4 text-black transition-all">
            <div className="flex w-full items-center justify-between px-6 text-black/75 transition-all">
              <b className="w-1/5">Sequência</b>
              <b className="w-1/3 px-2">Nome do Documento</b>
              <b className="w-1/3 px-2">Obrigatoriedade de envio</b>
              <b className="w-1/3">Substituição</b>
            </div>

            <div className="flex flex-col gap-4">
              {m.documentos.map((d) => (
                <div key={d.seq}>
                  <div className="relative flex h-12 w-full items-center justify-between border-gd-gray-100 bg-white px-6 text-black/75 transition-all">
                    <div className="flex h-full w-1/5 items-center gap-2 border-r-2 transition-all">
                      <FaGripLines className="size-4 shrink-0 cursor-grab text-gd-gray-100" />
                      <p>{d.seq}</p>
                    </div>
                    <div className="flex h-full w-1/3 items-center truncate border-r-2 px-2 transition-all">
                      {d.nome}
                    </div>
                    <div className="flex h-full w-1/3 items-center gap-3 border-r-2 px-2 transition-all">
                      <p>{d.obrigatorio ? 'Obrigatório' : 'Opcional'}</p>
                    </div>
                    <div className="flex h-full w-1/3 items-center gap-1.5 truncate px-2 transition-all">
                      {d.substituicao.map((s) => (
                        <div
                          key={s}
                          className="w-auto select-none items-center truncate rounded-full border border-transparent bg-gray-100 p-1 px-1.5 text-xs font-medium text-gd-gray-400 transition-colors hover:bg-gray-200 sm:p-2"
                        >
                          <p className="truncate">{s}</p>
                        </div>
                      ))}
                    </div>
                    <FaChevronDown className="ml-2 size-3 shrink-0 text-gd-gray-100" />
                  </div>
                </div>
              ))}

              <div className="mt-1 flex w-full items-center gap-2 px-6 text-sm font-medium text-gd-gray-400/70 transition-all">
                <FaCircleInfo className="size-4 shrink-0" />
                Todo módulo necessita de pelo menos um documento obrigatório. Se o seu módulo possui somente um
                documento ele necessariamente será obrigatório!
              </div>
            </div>
          </div>
        </form>

        {/* SLAs */}
        <form className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between transition-all">
            <b className="text-2xl text-gd-blue">SLAs Status</b>
            <GdLinkButton>
              <FaPen className="size-4" /> Editar SLAs
            </GdLinkButton>
          </div>

          <div className="flex w-full flex-col transition-all">
            <div className="flex w-full items-center justify-between gap-4 border-b border-gray-400 px-6 pb-2 text-black transition-all">
              <b>Status</b>
              <b>SLA (horas)</b>
            </div>
            {STATUS_ORDEM.map((s) => (
              <div
                key={s}
                className="flex w-full items-center justify-between gap-4 border-b border-gray-400 px-6 py-4 text-black transition-all"
              >
                <span className={cn(STATUS_TEXT[s])}>{STATUS_LABEL[s]}</span>
                <span className="w-24">{m.slas[s]}</span>
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  )
}
