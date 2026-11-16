import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, ChevronRight } from 'lucide-react'
import { cn } from '../lib/cn'

/**
 * Faixa de navegação do PROTÓTIPO — vive acima dos cascos (Landing, GenDocs,
 * ERP e Portal do Candidato). É deliberadamente uma barra à parte, e não parte
 * do cabeçalho de cada sistema: assim cada réplica segue fiel ao original e
 * fica claro que este atalho é andaime de demonstração, não produto.
 */
/* Na ordem em que o candidato encontra os sistemas: ele se inscreve na
   landing, acompanha pelo portal, envia no GenDocs — e o ERP é a ponta da
   Secretaria. */
const SISTEMAS = [
  { to: '/lp', label: 'Landing page', cor: 'bg-emerald-500' },
  { to: '/aluno', label: 'Portal do Candidato', cor: 'bg-violet-500' },
  { to: '/gendocs', label: 'GenDocs', cor: 'bg-[#4b91e2]' },
  { to: '/erp', label: 'ERP Acadêmico', cor: 'bg-[#ED8020]' },
]

export function GlobalBar() {
  const { pathname } = useLocation()

  return (
    <div className="sticky top-0 z-[60] h-10 border-b border-slate-700 bg-slate-900 text-slate-200 print:hidden">
      <div className="flex h-full items-center gap-1 px-3 md:px-4">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Hub
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />

        {SISTEMAS.map((s) => {
          const ativo = pathname.startsWith(s.to)
          return (
            <Link
              key={s.to}
              to={s.to}
              className={cn(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                ativo ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', s.cor)} />
              {s.label}
            </Link>
          )
        })}

        <span className="ml-auto hidden text-[11px] text-slate-500 sm:inline">
          Representação de requisitos · Processo Seletivo ProUni · UniFatecie
        </span>
      </div>
    </div>
  )
}
