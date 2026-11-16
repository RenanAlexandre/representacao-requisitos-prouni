import { Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import {
  FaUsers, FaEnvelope, FaEnvelopeOpen, FaFileLines, FaFile, FaEnvelopeCircleCheck,
  FaRegFolder, FaRegFileLines, FaRegComments, FaChartColumn, FaGear, FaChevronRight,
} from 'react-icons/fa6'
import { GdKpi, GdMenuCard } from '../../components/gendocs/ui'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { getModulo, pct } from '../../data/gendocs'

/**
 * Tela de entrada de um módulo — KPIs do módulo + grade de "Menus".
 * Réplica de `GenDocs - Tela dentro de um módulo.html`.
 */
export function GdModulo() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const m = getModulo(slug)
  if (!m) return <Navigate to="/gendocs" replace />

  const total = m.participantes
  const ir = (sub: string) => navigate(`/gendocs/modulo/${slug}/${sub}`)

  const menus = [
    { icon: <FaRegFolder className="size-6 shrink-0" />, label: 'Dados do Módulo', to: 'dados' },
    { icon: <FaRegFileLines className="size-6 shrink-0" />, label: 'Documentos e Regras do Projeto', to: 'documentos' },
    { icon: <FaUsers className="size-6 shrink-0" />, label: 'Participantes e Coletas', to: 'participantes' },
    { icon: <FaRegComments className="size-6 shrink-0" />, label: 'Comunicações e E-mails', to: 'comunicacoes' },
    { icon: <FaChartColumn className="size-6 shrink-0" />, label: 'Relatórios', to: 'relatorios' },
    { icon: <FaGear className="size-6 shrink-0" />, label: 'Integrações', to: 'integracoes' },
  ]

  /* A tela que o participante vê ao abrir o link da coleta. Fora da grade de
     menus porque não é do administrador — é pré-visualização. */
  const linkAluno = `/gendocs/coleta/${slug}`

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col gap-5 px-0 py-3 transition-all">
        <b className="text-2xl text-gd-gray-400">KPIs</b>

        <div className="flex w-full items-center gap-4 transition-all">
          <GdKpi tom="azul" icon={<FaUsers />} label="Participantes" valor={total} />
        </div>

        <div className="flex w-full items-center gap-4 transition-all">
          <GdKpi tom="branco" icon={<FaEnvelope />} label="Nova Coleta" valor={m.dist.nova} sufixo={`(${pct(m.dist.nova, total)})`} />
          <GdKpi tom="cinza" icon={<FaEnvelopeOpen />} label="Coleta Aberta" valor={m.dist.aberta} sufixo={`(${pct(m.dist.aberta, total)})`} />
          <GdKpi tom="laranja" icon={<FaFileLines />} label="Em Progresso" valor={m.dist.progresso} sufixo={`(${pct(m.dist.progresso, total)})`} />
          <GdKpi tom="info" icon={<FaFile />} label="Recebidas" valor={m.dist.recebida} sufixo={`(${pct(m.dist.recebida, total)})`} />
          <GdKpi tom="verde" icon={<FaEnvelopeCircleCheck />} label="Finalizadas" valor={m.dist.finalizada} sufixo={`(${pct(m.dist.finalizada, total)})`} />
        </div>
      </div>

      <div className="flex w-full flex-col transition-all">
        <b className="mb-2 text-lg text-gd-gray-400">Menus</b>
        <div className="grid w-full grid-cols-2 gap-x-8 gap-y-7 xl:gap-x-14">
          {menus.map((it) => (
            <GdMenuCard
              key={it.to}
              icon={it.icon}
              label={it.label}
              chevron={<FaChevronRight className="size-4" />}
              onClick={() => ir(it.to)}
            />
          ))}
        </div>

        {/* Pré-visualização da tela que o participante recebe. Não é menu do
            administrador — por isso fica separada, abaixo da grade. */}
        <Link
          to={linkAluno}
          className="mt-7 flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-gd-blue/50 bg-gd-white-blue px-5 py-4 text-gd-blue transition-all hover:border-gd-blue hover:bg-gd-blue-50"
        >
          <span className="flex flex-col">
            <b>Ver a coleta como o participante vê</b>
            <span className="text-sm text-gd-gray-400">
              Tela de envio de documentos deste módulo, na visão do aluno
            </span>
          </span>
          <FaChevronRight className="size-4 shrink-0" />
        </Link>
      </div>
    </div>
  )
}
