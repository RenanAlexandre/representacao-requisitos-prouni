import {
  SquarePen, GraduationCap, CalendarDays, ClipboardList, FileSearch, Contact,
  Headphones, AlignJustify, TrendingUp, CircleDollarSign, KeyRound, MonitorCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface ErpSubItem {
  label: string
  to: string
}

export interface ErpMenuGroup {
  label: string
  icon: LucideIcon
  items?: ErpSubItem[]
}

/**
 * Menu lateral do ERP UniFatecie (System by Inova).
 *
 * Os doze grupos e os dois sub-itens de Processos Seletivos são os do ERP real
 * (`dev.erp.inovacarreira.com.br`), conforme os prints e os HTMLs salvos em
 * `ERP html e referencias/`. Os demais grupos não têm telas neste protótipo.
 */
export const ERP_MENU: ErpMenuGroup[] = [
  { label: 'Cadastros', icon: SquarePen },
  { label: 'Acadêmico', icon: GraduationCap },
  { label: 'Calendário Acadêmico', icon: CalendarDays },
  {
    label: 'Processos Seletivos',
    icon: ClipboardList,
    items: [
      { label: 'Candidatos', to: '/erp/candidatos' },
      { label: 'Processos seletivos', to: '/erp/processos-seletivos' },
    ],
  },
  { label: 'Banco e Repositório', icon: FileSearch },
  { label: 'Portal do Aluno', icon: Contact },
  { label: 'Mensageria', icon: Headphones },
  { label: 'Requerimentos', icon: AlignJustify },
  { label: 'Análises e Relatórios', icon: TrendingUp },
  { label: 'Financeiro', icon: CircleDollarSign },
  { label: 'Acesso', icon: KeyRound },
  { label: 'Sistema', icon: MonitorCog },
]

/** Grupo e sub-item ativos a partir da rota (prefixo mais longo vence). */
export function localizar(pathname: string) {
  let grupo: ErpMenuGroup | undefined
  let item: ErpSubItem | undefined

  for (const g of ERP_MENU) {
    for (const it of g.items ?? []) {
      if (pathname === it.to || pathname.startsWith(it.to + '/')) {
        if (!item || it.to.length > item.to.length) {
          item = it
          grupo = g
        }
      }
    }
  }
  return { grupo, item }
}
