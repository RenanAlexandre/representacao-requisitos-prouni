import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FaCircle, FaFolder, FaUsers, FaEnvelope, FaEnvelopeOpen, FaFileLines, FaFile, FaEnvelopeCircleCheck } from 'react-icons/fa6'
import { GdButton, GdKpi, GdModal, GdField, GdInput, GdSearch, GdOutlineButton } from '../../components/gendocs/ui'
import { MODULOS, agregarKpis, pct, type Modulo } from '../../data/gendocs'
import { listarModulosGenDocs, type ModuloGenDocs } from '../../lib/api'
import { useMudancas } from '../../lib/tempo-real'
import { GdConsultaParticipantes } from './ConsultaParticipantes'
import { cn } from '../../lib/cn'

/**
 * Tela inicial do administrador — "Módulos".
 * Réplica de `GenDocs - tela inicial adm.html`.
 */
export function GdModulos() {
  const navigate = useNavigate()
  /* Duas primeiras abas olham para MÓDULOS; a terceira olha para PESSOAS.
     A aba vive na URL para que o hub (e qualquer link colado num chat) consiga
     mandar direto para a consulta: /gendocs?aba=participantes. */
  const [params, setParams] = useSearchParams()
  const aba = ((): 'active' | 'inactive' | 'participantes' => {
    const p = params.get('aba')
    return p === 'participantes' || p === 'inactive' ? p : 'active'
  })()
  const setAba = (nova: 'active' | 'inactive' | 'participantes') => {
    /* A aba padrão sai da URL — link limpo é o que se cola. */
    if (nova === 'active') params.delete('aba')
    else params.set('aba', nova)
    setParams(params, { replace: true })
  }
  const [busca, setBusca] = useState('')
  const [novoAberto, setNovoAberto] = useState(false)

  /* Contagem ao vivo dos módulos que existem no banco. A configuração (nome,
     datas, lista documental) continua vindo de `data/gendocs.ts`, que também
     guarda as réplicas dos prints; o que o banco sobrepõe são os NÚMEROS e o
     destaque. Módulo que não existe no banco fica com os números do print. */
  const [aoVivo, setAoVivo] = useState<Map<string, ModuloGenDocs>>(new Map())
  const [versao, setVersao] = useState(0)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  useMudancas(['coleta', 'grupo', 'candidato'], recarregar)

  useEffect(() => {
    let cancelado = false
    listarModulosGenDocs()
      .then((ms) => {
        if (!cancelado) setAoVivo(new Map(ms.map((m) => [m.slug, m])))
      })
      .catch(() => {
        /* Sem banco a tela continua de pé com os números do print. */
      })
    return () => { cancelado = true }
  }, [versao])

  const todos = useMemo(
    () =>
      MODULOS.map((m) => {
        const vivo = aoVivo.get(m.slug)
        if (!vivo) return m
        return {
          ...m,
          participantes: vivo.participantes,
          aprovacao: vivo.aprovacao,
          destaque: vivo.destaque,
          situacao: vivo.situacao,
          ativo: vivo.ativo,
          dist: {
            nova: vivo.nova,
            aberta: vivo.aberta,
            progresso: vivo.progresso,
            recebida: vivo.recebida,
            finalizada: vivo.finalizada,
          },
        } satisfies Modulo
      }),
    [aoVivo],
  )

  const lista = useMemo(
    () =>
      todos
        .filter((m) => m.ativo === (aba === 'active'))
        .filter((m) => m.nome.toLowerCase().includes(busca.trim().toLowerCase()))
        /* Os módulos em destaque sobem para o topo da grade. */
        .sort((a, b) => Number(b.destaque ?? false) - Number(a.destaque ?? false)),
    [todos, aba, busca],
  )

  const kpis = useMemo(() => agregarKpis(todos.filter((m) => m.ativo === (aba === 'active'))), [todos, aba])
  const total = kpis.participantes

  return (
    <div className="flex w-full flex-col gap-8 p-10 px-24 pb-14 text-gd-gray-100 transition-all">
      <div className="flex w-full flex-col gap-6 transition-all">
        <b className="text-2xl text-gd-blue-200">Módulos</b>
        {/* A busca e o "Novo" são de módulo — na aba de participantes a
            consulta tem a própria barra, com os filtros de coluna. */}
        {aba !== 'participantes' && (
          <div className="flex w-full items-center justify-between gap-2 transition-all">
            <GdSearch
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquise pelo Projeto..."
            />
            <GdButton className="h-12 px-16 text-base" onClick={() => setNovoAberto(true)}>
              Novo <p className="text-xl">+</p>
            </GdButton>
          </div>
        )}
      </div>

      <div className="flex w-full flex-col rounded-lg border border-t-0 transition-all">
        {/* Abas (ant-tabs card no original) */}
        <div className="flex w-full">
          {(
            [
              ['active', 'Módulos Ativos'],
              ['inactive', 'Módulos Inativos'],
              ['participantes', 'Consulta de Participantes e Coletas'],
            ] as const
          ).map(([key, label]) => {
            const ativo = aba === key
            /* A consulta é a aba nova da tela. Inativa, ela ficava com o mesmo
               cinza das outras duas e passava batida — daí manter a cor da
               marca mesmo desligada e o selo "novo" ao lado. */
            const nova = key === 'participantes'
            return (
              <button
                key={key}
                onClick={() => setAba(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-base transition-all',
                  ativo
                    ? 'border-gd-blue bg-white font-semibold text-gd-blue-200'
                    : nova
                      ? 'border-gd-green-100/40 bg-gd-white-green/40 font-semibold text-gd-blue-200 hover:bg-gd-white-green'
                      : 'border-transparent bg-gd-white-blue text-gray-400 hover:text-gray-600',
                )}
              >
                {nova ? (
                  <FaUsers className={cn('size-4', ativo ? 'text-gd-blue' : 'text-gd-green-200')} />
                ) : (
                  <FaCircle className={cn('size-3', ativo ? 'text-gd-green-100' : 'text-gray-300')} />
                )}
                {label}
                {nova && (
                  <span className="rounded-full bg-gd-green-100 px-2 py-0.5 text-[11px] font-bold uppercase leading-tight tracking-wide text-white">
                    Novo
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {aba === 'participantes' ? (
          <GdConsultaParticipantes />
        ) : (
        <div className="flex w-full flex-col transition-all">
          {/* KPIs */}
          <div className="flex w-full flex-col gap-5 px-6 py-3 transition-all">
            <b className="text-2xl text-gd-gray-400">KPIs</b>

            <div className="flex w-full items-center gap-4 transition-all">
              <GdKpi tom="azul" icon={<FaFolder />} label="Nº de Módulos" valor={kpis.modulos} />
              <GdKpi tom="azul" icon={<FaUsers />} label="Participantes" valor={total} />
            </div>

            <div className="flex w-full items-center gap-4 transition-all">
              <GdKpi tom="branco" icon={<FaEnvelope />} label="Nova Coleta" valor={kpis.dist.nova} sufixo={`(${pct(kpis.dist.nova, total)})`} />
              <GdKpi tom="cinza" icon={<FaEnvelopeOpen />} label="Coleta Aberta" valor={kpis.dist.aberta} sufixo={`(${pct(kpis.dist.aberta, total)})`} />
              <GdKpi tom="laranja" icon={<FaFileLines />} label="Em Progresso" valor={kpis.dist.progresso} sufixo={`(${pct(kpis.dist.progresso, total)})`} />
              <GdKpi tom="info" icon={<FaFile />} label="Recebidas" valor={kpis.dist.recebida} sufixo={`(${pct(kpis.dist.recebida, total)})`} />
              <GdKpi tom="verde" icon={<FaEnvelopeCircleCheck />} label="Finalizadas" valor={kpis.dist.finalizada} sufixo={`(${pct(kpis.dist.finalizada, total)})`} />
            </div>
          </div>

          <div className="mx-0 my-[10px] h-px w-full border-b" />

          {/* Cards dos módulos */}
          <div className="flex w-full flex-col px-6 py-3 pb-5 transition-all">
            <div className="flex w-full flex-col gap-2 rounded-lg bg-gd-gray-50 p-4 transition-all">
              <b className="text-gd-gray-400">
                {aba === 'active' ? 'Modulos Ativos na Plataforma' : 'Modulos Inativos na Plataforma'}
              </b>
              <div className="grid w-full grid-cols-3 gap-5 p-4">
                {lista.map((m) => (
                  <ModuloCard key={m.slug} modulo={m} onClick={() => navigate(`/gendocs/modulo/${m.slug}`)} />
                ))}
                {lista.length === 0 && (
                  <p className="col-span-3 py-8 text-center text-gd-gray-400">Nenhum módulo encontrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      <NovoModuloModal aberto={novoAberto} onFechar={() => setNovoAberto(false)} />
    </div>
  )
}

function ModuloCard({ modulo, onClick }: { modulo: Modulo; onClick: () => void }) {
  const corSituacao =
    modulo.situacao === 'Iniciado'
      ? 'text-gd-green-100'
      : modulo.situacao === 'Finalizado'
        ? 'text-gd-gray-400'
        : 'text-gd-orange'

  return (
    <div className="relative">
      {modulo.destaque && (
        <span className="absolute -right-2 -top-2 z-10 rounded-full bg-gd-orange px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
          Novo
        </span>
      )}
      <div
        onClick={onClick}
        className={cn(
          'relative flex w-full cursor-pointer flex-col items-center justify-between overflow-hidden rounded-[8px] bg-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl',
          modulo.destaque && 'border-2 border-gd-orange shadow-lg',
        )}
      >
        <div className="flex w-full items-center justify-between border-b p-4 transition-all">
          <div className="flex w-full items-center gap-3 text-xl text-black/75 transition-all">
            <FaCircle className={cn('size-3 shrink-0', corSituacao)} />
            <b className="uppercase text-gd-blue-200">{modulo.nome}</b>
          </div>
          <div className={cn('flex w-auto items-center text-end text-nowrap transition-all', corSituacao)}>
            <b>{modulo.situacao}</b>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 border-b p-3 px-4 text-sm leading-5 text-gd-gray-400/70 transition-all">
          <div className="flex w-full items-center justify-center gap-2 transition-all">
            <b>Data de Inicio:</b>
            <p>{modulo.inicio}</p>
          </div>
          <div className="flex w-full items-center justify-center gap-2 transition-all">
            <b>Data de Término:</b>
            <p>{modulo.termino}</p>
          </div>
        </div>

        <div className="flex w-full items-center p-5 py-10 transition-all">
          <div className="flex w-full flex-col items-center text-center text-nowrap text-gd-blue-100 transition-all">
            <b>{modulo.participantes}</b>
            <b>Participantes</b>
          </div>
          <div className="flex w-full flex-col items-center text-center text-nowrap text-gd-blue-100 transition-all">
            <b>{modulo.aprovacao}%</b>
            <b>Percentual de aprovação</b>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Modal "Novo Módulo" (print 14). */
function NovoModuloModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <GdModal aberto={aberto} onFechar={onFechar} titulo="Novo Módulo" largura="max-w-xl">
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          onFechar()
        }}
      >
        <GdField label="Nome do Módulo*">
          <GdInput placeholder="Digite" />
        </GdField>

        <div className="grid grid-cols-2 gap-4">
          <GdField label="Data de Início*">
            <GdInput type="date" />
          </GdField>
          <GdField label="Data Fim*">
            <GdInput type="date" />
          </GdField>
        </div>

        <GdField label="Descrição do Módulo*">
          <textarea
            rows={3}
            placeholder="Escreva um pouco sobre o módulo"
            className="w-full rounded-md border border-gd-gray-100 px-4 py-2 text-base text-black/80 transition-all placeholder:text-gd-gray-100 focus-visible:border-gd-blue-100 focus-visible:outline-none"
          />
        </GdField>

        <GdField label="Tipo da Coleta*">
          <select className="h-11 w-full rounded-md border border-gd-gray-100 px-4 text-base text-black/80 focus-visible:border-gd-blue-100 focus-visible:outline-none">
            <option>Selecione</option>
            <option>Documentos de matrícula</option>
            <option>Documentos de processo seletivo (ProUni)</option>
            <option>Documentos de estágio</option>
          </select>
        </GdField>

        <div className="mt-2 flex items-center justify-between">
          <GdOutlineButton type="button" className="h-11 px-10 text-base" onClick={onFechar}>
            Cancelar
          </GdOutlineButton>
          <GdButton type="submit" className="h-11 px-10 text-base">
            Adicionar
          </GdButton>
        </div>
      </form>
    </GdModal>
  )
}
