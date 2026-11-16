import { Outlet, useNavigate } from 'react-router-dom'
import { FaChevronLeft } from 'react-icons/fa6'
import { GlobalBar } from '../components/GlobalBar'

/**
 * Casco do GenDocs — transcrito do HTML salvo da plataforma:
 * barra fixa azul (#1c3f73) com a logo à esquerda e o botão de conta à direita,
 * conteúdo com `pt-20` para descontar a barra.
 */
export function GenDocsLayout() {
  return (
    <div className="min-h-screen w-full bg-white">
      <GlobalBar />

      <div className="flex w-full flex-col transition-all pt-20">
        {/* Barra fixa superior */}
        <div className="fixed left-0 top-10 z-30 flex h-auto w-full items-center justify-between bg-gd-blue-200 px-4 py-4 text-white shadow-lg transition-all sm:px-20">
          <img src="/genDocsLogo.svg" alt="GenDocs" className="w-40 sm:w-fit" />
          <button
            type="button"
            className="flex h-14 cursor-pointer items-center justify-center gap-4 whitespace-nowrap rounded-md border-2 border-gd-gray-100 bg-transparent px-4 py-2 text-sm font-semibold text-gray-200 shadow-sm transition-all hover:bg-white/5"
          >
            <span className="relative flex size-8 shrink-0 select-none overflow-hidden rounded-full">
              <span
                className="flex size-full items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: 'rgb(210,120,120)', color: 'rgb(238,238,238)', border: '2px solid rgb(197,82,82)' }}
              >
                RR
              </span>
            </span>
            Renan Ribeiro
          </button>
        </div>

        <Outlet />
      </div>
    </div>
  )
}

/**
 * Trilha dentro de um módulo: seta de voltar + "Módulos >" + nome do módulo,
 * separada do conteúdo por uma linha cinza. Idêntica ao original.
 */
export function GdModuloHeader({ nome }: { nome: string }) {
  const navigate = useNavigate()
  return (
    <div className="flex w-full items-center gap-2 border-b border-gd-gray-100 pb-4 text-gd-blue-200 transition-all">
      <button onClick={() => navigate(-1)} aria-label="Voltar" className="cursor-pointer p-1">
        <FaChevronLeft className="size-5" />
      </button>
      <b className="ml-3 text-gd-gray-100">Módulos &gt;</b>
      <b className="text-2xl">{nome}</b>
    </div>
  )
}
