import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertCircle, Database, FileBadge, Loader2, User, Users, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  RouteHeader, SearchInput, FilterButton, NewButton, ErpTable, Th, Tr, Td,
  StatusBadge, Pagination, EmptyRow, DetailsHeader, DetailsContainer, SectionTitle,
  InnerTitle, Divider, Field, FieldRow, OutlineButton, type Crumb,
} from '../../components/erp/ui'
import { candidatosDoProcesso } from '../../data/erp'
import { modulosDoConcurso, type ModuloDoConcurso } from '../../lib/api'
import {
  useProcessosSeletivos, useProcessoSeletivo, useConcursos, useConcurso, useTurmas,
} from '../../lib/erp'
import { ErpCandidatosDoProcesso } from './Candidatos'

/** Trilha padrão das telas internas de um processo seletivo. */
function trilhaInterna(psId: string): Crumb[] {
  return [
    { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
    { label: '...', to: '/erp/processos-seletivos' },
    { label: 'Menu', to: `/erp/processos-seletivos/${psId}/menu` },
  ]
}

/* ------------------------------------------------------------------ */
/* Carregamento e erro — consulta real ao Supabase                     */
/* ------------------------------------------------------------------ */

function CarregandoErp() {
  return (
    <div className="flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
      <Loader2 className="size-8 animate-spin text-erp-primary" />
      <p className="text-sm text-gray-500">Carregando…</p>
    </div>
  )
}

function ErroErp({ mensagem }: { mensagem: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
      <AlertCircle className="size-8 text-red-500" />
      <p className="text-sm font-semibold text-gray-800">Não foi possível carregar os dados.</p>
      <p className="max-w-sm text-xs text-gray-500">{mensagem}</p>
    </div>
  )
}

/**
 * Listagem de Processos Seletivos.
 * Réplica de `Processos Seletivos - processos seletivosd.html` (print 5).
 */
export function ErpProcessosSeletivos() {
  const { processos, carregando, erro } = useProcessosSeletivos()
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const filtrada = useMemo(() => {
    const base = processos ?? []
    const q = busca.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q),
    )
  }, [processos, busca])

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtrada.slice((atual - 1) * porPagina, atual * porPagina)

  return (
    <div>
      <RouteHeader titulo="Processos Seletivos" voltar={false} acao={<NewButton />} />

      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4 transition-all">
          <SearchInput
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            placeholder="Pesquisar..."
          />
          <FilterButton />
        </div>

        <div className="flex flex-col gap-4 transition-all">
          <ErpTable>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Código</Th>
                <Th>Período Letivo</Th>
                <Th>Nível de Ensino</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {carregando && <EmptyRow colSpan={5} texto="Carregando…" />}
              {erro && <EmptyRow colSpan={5} texto={`Não foi possível carregar: ${erro}`} />}
              {!carregando && !erro && visiveis.map((p) => {
                const to = `/erp/processos-seletivos/${p.id}/menu`
                return (
                  <Tr key={p.id} to={to}>
                    <Td to={to}>{p.nome}</Td>
                    <Td to={to}>{p.codigo}</Td>
                    <Td to={to}>{p.periodoLetivo}</Td>
                    <Td to={to}>{p.nivelEnsino}</Td>
                    <Td to={to}>
                      <StatusBadge label={p.ativo ? 'Ativo' : 'Inativo'} tom={p.ativo ? 'verde' : 'cinza'} />
                    </Td>
                  </Tr>
                )
              })}
              {!carregando && !erro && visiveis.length === 0 && (
                <EmptyRow colSpan={5} texto="Nenhum processo seletivo encontrado." />
              )}
            </tbody>
          </ErpTable>

          <Pagination
            porPagina={porPagina}
            onPorPagina={setPorPagina}
            pagina={atual}
            totalPaginas={totalPaginas}
            onPagina={setPagina}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Menu do processo seletivo — quatro cards de navegação (print 6).
 */
export function ErpProcessoMenu() {
  const { psId = '' } = useParams()
  const { ps, carregando, erro } = useProcessoSeletivo(psId)
  if (carregando) return <CarregandoErp />
  if (erro) return <ErroErp mensagem={erro} />
  if (!ps) return <Navigate to="/erp/processos-seletivos" replace />

  const cards: Array<{ icone: LucideIcon; titulo: string; desc: string; to: string }> = [
    {
      icone: Database,
      titulo: 'Dados do Processo Seletivo',
      desc: 'Dados e configurações do Proc. Seletivo selecionado',
      to: `/erp/processos-seletivos/${psId}/detalhes`,
    },
    {
      icone: FileBadge,
      titulo: 'Concursos',
      desc: 'Dados de todas os concursos do Proc. Seletivo selecionado',
      to: `/erp/processos-seletivos/${psId}/concursos`,
    },
    {
      icone: User,
      titulo: 'Candidatos',
      desc: 'Listagem de todos os candidatos do Proc. Seletivo selecionado',
      to: `/erp/processos-seletivos/${psId}/candidatos`,
    },
    {
      icone: Users,
      titulo: 'Turmas',
      desc: 'Listagem de todas as turmas pertencentes a esse processo seletivo',
      to: `/erp/processos-seletivos/${psId}/turmas`,
    },
  ]

  return (
    <div>
      <RouteHeader
        crumbs={[
          { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
          { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
        ]}
        titulo="Menu"
      />

      <DetailsHeader titulo={ps.nome} laranja />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {cards.map((c) => {
          const Icone = c.icone
          return (
            <Link
              key={c.to}
              to={c.to}
              className="flex items-center gap-6 rounded-xl border border-gray-100 bg-white px-8 py-6 shadow-erp-table-row transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Icone className="size-8 shrink-0 text-erp-primary" strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-bold text-erp-primary">{c.titulo}</span>
                <span className="block text-base text-gray-500">{c.desc}</span>
              </span>
              <ChevronRight className="size-6 shrink-0 text-erp-primary" />
            </Link>
          )
        })}
      </div>

      <div className="mt-10">
        <OutlineButton className="h-11 px-6">Editar Dados</OutlineButton>
      </div>
    </div>
  )
}

/**
 * Dados do Processo Seletivo — réplica de `Menu_Detalhes.html` (print 7).
 */
export function ErpProcessoDetalhes() {
  const { psId = '' } = useParams()
  const { ps, carregando, erro } = useProcessoSeletivo(psId)
  if (carregando) return <CarregandoErp />
  if (erro) return <ErroErp mensagem={erro} />
  if (!ps) return <Navigate to="/erp/processos-seletivos" replace />

  return (
    <div>
      <RouteHeader crumbs={trilhaInterna(psId)} titulo="Detalhes" />
      <DetailsHeader titulo={ps.nome} laranja />

      <DetailsContainer>
        <section className="flex flex-col gap-4">
          <SectionTitle>Dados Gerais</SectionTitle>
          <FieldRow>
            <Field label="Nome do Processo Seletivo" value={ps.nome} />
            <Field label="Código" value={ps.codigo} />
          </FieldRow>
          <FieldRow>
            <Field label="Período Letivo" value={ps.periodoLetivo} />
            <Field label="Edital" value={ps.edital} />
            <Field label="Nível de Ensino" value={ps.nivelEnsino} />
          </FieldRow>
        </section>

        <Divider />

        <section className="flex flex-col gap-4">
          <FieldRow>
            <Field label="Data de Criação" value={ps.criadoEm} />
            <Field label="Última Alteração" value={ps.alteradoEm} />
          </FieldRow>
        </section>

        <Divider />

        <section className="flex flex-col gap-4">
          <SectionTitle>Sincronização com Moodle</SectionTitle>
          <div className="flex items-center gap-4 transition-all">
            <OutlineButton>Abrir acompanhamento</OutlineButton>
          </div>
        </section>
      </DetailsContainer>
    </div>
  )
}

/**
 * Listagem de Concursos do processo seletivo (print 8).
 */
export function ErpConcursos() {
  const { psId = '' } = useParams()
  const { ps, carregando: carregandoPs, erro: erroPs } = useProcessoSeletivo(psId)
  const { concursos, carregando: carregandoConcursos, erro: erroConcursos } = useConcursos(psId)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const base = concursos ?? []
    return q ? base.filter((c) => c.nome.toLowerCase().includes(q)) : base
  }, [concursos, busca])

  if (carregandoPs) return <CarregandoErp />
  if (erroPs) return <ErroErp mensagem={erroPs} />
  if (!ps) return <Navigate to="/erp/processos-seletivos" replace />

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtrada.slice((atual - 1) * porPagina, atual * porPagina)

  return (
    <div>
      <RouteHeader crumbs={trilhaInterna(psId)} titulo="Concursos" />
      <DetailsHeader titulo="Concursos" laranja />

      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4 transition-all">
          <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." />
          <FilterButton />
        </div>

        <div className="flex flex-col gap-4 transition-all">
          <ErpTable>
            <thead>
              <tr>
                <Th>Nome do Concurso</Th>
                <Th>Tipo do Concurso</Th>
                <Th>Origem</Th>
                <Th className="text-right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {carregandoConcursos && <EmptyRow colSpan={4} texto="Carregando…" />}
              {erroConcursos && <EmptyRow colSpan={4} texto={`Não foi possível carregar: ${erroConcursos}`} />}
              {!carregandoConcursos && !erroConcursos && visiveis.map((c) => {
                const to = `/erp/processos-seletivos/${psId}/concursos/${c.id}`
                return (
                  <Tr key={c.id} to={to}>
                    <Td to={to}>{c.nome}</Td>
                    <Td to={to}>{c.tipo}</Td>
                    <Td to={to}>{c.origem}</Td>
                    <Td to={to} className="text-right">
                      <span className={c.ativo ? 'text-green-600' : 'text-gray-400'}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </Td>
                  </Tr>
                )
              })}
              {!carregandoConcursos && !erroConcursos && visiveis.length === 0 && (
                <EmptyRow colSpan={4} texto="Nenhum concurso cadastrado." />
              )}
            </tbody>
          </ErpTable>

          <Pagination
            porPagina={porPagina}
            onPorPagina={setPorPagina}
            pagina={atual}
            totalPaginas={filtrada.length === 0 ? 0 : totalPaginas}
            onPagina={setPagina}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Detalhes do concurso — réplica de `Concursos_Detalhes.html` (prints 9 e 10).
 */
export function ErpConcursoDetalhes() {
  const { psId = '', concursoId = '' } = useParams()
  const { concurso: c, carregando, erro } = useConcurso(concursoId)
  if (carregando) return <CarregandoErp />
  if (erro) return <ErroErp mensagem={erro} />
  if (!c) return <Navigate to={`/erp/processos-seletivos/${psId}/concursos`} replace />

  return (
    <div>
      <RouteHeader
        crumbs={[
          { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
          { label: '...', to: '/erp/processos-seletivos' },
          { label: 'Concursos', to: `/erp/processos-seletivos/${psId}/concursos` },
        ]}
        titulo="Detalhes"
      />

      <DetailsHeader titulo={c.nome} laranja />

      <DetailsContainer>
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 transition-all">
            <SectionTitle>Dados Gerais</SectionTitle>
            <div className="flex flex-col items-center gap-2 transition-all">
              <span
                className={`inline-flex h-8 w-14 items-center rounded-full border-2 p-0.5 shadow-md transition-colors ${
                  c.ativo ? 'border-transparent bg-erp-blue' : 'border-erp-blue bg-white'
                }`}
              >
                <span
                  className={`block size-6 rounded-full border-2 shadow-lg transition-transform ${
                    c.ativo ? 'translate-x-6 border-erp-blue bg-erp-bg' : 'translate-x-0 border-white bg-erp-blue'
                  }`}
                />
              </span>
              <p className="text-sm font-medium text-gray-400 transition-all">{c.ativo ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Nome do Concurso" value={c.nome} />
            <Field label="Tipo do Concurso" value={c.tipo} />
            <Field label="Origem" value={c.origem} className="col-start-1 w-1/2" />
            <Field label="Início do Concurso" value={c.inicio} />
            <Field label="Fim do Concurso" value={c.fim} />
            <Field label="Requer Prova?" value={c.requerProva} className="col-start-1 w-1/2" />
            <Field label="Taxa de Inscrição" value={c.taxaInscricao} className="col-start-1 w-1/2" />
          </div>

          <Divider />

          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Tipo de Classificação" value={c.tipoClassificacao} />
            <Field label="Data de Vestibular" value={c.dataVestibular} />
            <Field label="Nº de Vagas" value={c.vagas} className="col-start-1 w-1/2" />
            <Field label="Provas Publicadas?" value={c.provasPublicadas} className="col-start-1 w-1/2" />
            <Field label="Resultado Publicado?" value={c.resultadoPublicado} />
            <Field label="Exibir Requerimento de Inscrição?" value={c.exibirRequerimento} className="col-start-1 w-1/2" />
          </div>
        </section>

        <Divider />

        <SecaoModulosGenDocs concursoId={c.id} psId={psId} />

        <Divider />

        {/* Ofertas */}
        <section className="flex size-full flex-col gap-6">
          <div className="flex h-full flex-col gap-4 transition-all">
            <InnerTitle>Ofertas</InnerTitle>

            <div className="flex w-full items-end gap-4 transition-all">
              <div className="flex-1">
                <label className="block text-xl font-semibold">Curso:</label>
                <div className="relative mt-2 flex h-16 w-full items-center overflow-hidden rounded-lg bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                  <button className="flex h-16 w-full items-center justify-between bg-transparent px-4 text-left text-lg text-gray-400">
                    <span className="w-[95%] truncate">Buscar curso...</span>
                    <ChevronRight className="size-5 rotate-90" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xl font-semibold">Filial:</label>
                <div className="relative mt-2 flex h-16 w-full items-center overflow-hidden rounded-lg bg-gray-100 shadow-inner">
                  <button className="flex h-16 w-full items-center justify-between bg-transparent px-4 text-left text-lg text-gray-400">
                    <span className="w-[95%] truncate">Buscar filial...</span>
                    <ChevronRight className="size-5 rotate-90" />
                  </button>
                </div>
              </div>
              <OutlineButton className="h-16 w-64 px-6 text-xl">Editar Ofertas</OutlineButton>
            </div>

            <div className="flex h-[500px] flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-8">
              <p className="text-center text-lg font-medium text-gray-600 transition-all">
                Selecione o curso e a filial para visualizar as ofertas
              </p>
            </div>
          </div>
        </section>

        <Divider />

        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Data de Criação" value={c.criadoEm} />
            <Field label="Ultima Alteração" value={c.alteradoEm} />
          </div>
        </section>
      </DetailsContainer>
    </div>
  )
}

/**
 * Candidatos do processo seletivo (print 11).
 */
export function ErpProcessoCandidatos() {
  const { psId = '' } = useParams()
  const { ps, carregando, erro } = useProcessoSeletivo(psId)
  if (carregando) return <CarregandoErp />
  if (erro) return <ErroErp mensagem={erro} />
  if (!ps) return <Navigate to="/erp/processos-seletivos" replace />

  return (
    <div>
      <RouteHeader crumbs={trilhaInterna(psId)} titulo="Candidatos" />
      <ErpCandidatosDoProcesso lista={candidatosDoProcesso(psId)} psId={psId} />
    </div>
  )
}

/**
 * Turmas do processo seletivo (print 12).
 */
export function ErpTurmas() {
  const { psId = '' } = useParams()
  const { ps, carregando: carregandoPs, erro: erroPs } = useProcessoSeletivo(psId)
  const { turmas, carregando: carregandoTurmas, erro: erroTurmas } = useTurmas(psId)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const base = turmas ?? []
    return q ? base.filter((t) => t.nome.toLowerCase().includes(q)) : base
  }, [turmas, busca])

  if (carregandoPs) return <CarregandoErp />
  if (erroPs) return <ErroErp mensagem={erroPs} />
  if (!ps) return <Navigate to="/erp/processos-seletivos" replace />

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtrada.slice((atual - 1) * porPagina, atual * porPagina)

  return (
    <div>
      <RouteHeader crumbs={trilhaInterna(psId)} titulo="Turmas" />

      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." />
          <FilterButton />
        </div>

        <div className="flex flex-col gap-4 transition-all">
          <ErpTable>
            <thead>
              <tr>
                <Th className="min-w-[200px]">Nome da Turma</Th>
                <Th className="min-w-[200px]">Período Letivo</Th>
                <Th className="min-w-[300px]">Curso</Th>
                <Th className="min-w-[300px]">Currículo</Th>
                <Th className="min-w-[250px]">Processo Seletivo</Th>
                <Th className="min-w-[150px]">Status</Th>
              </tr>
            </thead>
            <tbody>
              {carregandoTurmas && <EmptyRow colSpan={6} texto="Carregando…" />}
              {erroTurmas && <EmptyRow colSpan={6} texto={`Não foi possível carregar: ${erroTurmas}`} />}
              {!carregandoTurmas && !erroTurmas && visiveis.map((t) => (
                <Tr key={t.id}>
                  <Td>{t.nome}</Td>
                  <Td>{t.periodoLetivo}</Td>
                  <Td>{t.curso}</Td>
                  <Td>{t.curriculo}</Td>
                  <Td>{t.processoSeletivo}</Td>
                  <Td>
                    <StatusBadge label={t.ativo ? 'Ativo' : 'Inativo'} tom={t.ativo ? 'verde' : 'cinza'} />
                  </Td>
                </Tr>
              ))}
              {!carregandoTurmas && !erroTurmas && visiveis.length === 0 && (
                <EmptyRow colSpan={6} texto="Nenhuma turma cadastrada." />
              )}
            </tbody>
          </ErpTable>

          <Pagination
            porPagina={porPagina}
            onPorPagina={setPorPagina}
            pagina={atual}
            totalPaginas={filtrada.length === 0 ? 0 : totalPaginas}
            onPagina={setPagina}
          />
        </div>
      </div>
    </div>
  )
}

/* ==================================================================
 * Módulos do GenDocs deste concurso
 *
 * O campo "Módulo do GenDocs" da réplica era de valor único, herdado de
 * quando o GenDocs tinha um módulo por perfil. Hoje o concurso usa 19: as 16
 * combinações de declarações do titular e os 3 módulos de familiar. O vínculo
 * virou N:N na migração 39, e o campo deu lugar a esta lista.
 *
 * Cada linha leva para dentro do módulo no GenDocs — é o caminho que o
 * atendente faz na mão hoje, saindo do ERP e procurando pelo nome.
 * ================================================================== */

function SecaoModulosGenDocs({ concursoId, psId }: { concursoId: string; psId: string }) {
  const [modulos, setModulos] = useState<ModuloDoConcurso[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  /* Os irmãos deste concurso. A nota abaixo precisa do número para fazer a
     conta do 1:1 com dado, e não com um "3" escrito na mão que envelhece na
     primeira chamada que alguém criar. */
  const { concursos } = useConcursos(psId)

  useEffect(() => {
    let cancelado = false
    modulosDoConcurso(concursoId)
      .then((m) => { if (!cancelado) setModulos(m) })
      .catch((f: unknown) => {
        if (!cancelado) setErro(f instanceof Error ? f.message : String(f))
      })
    return () => { cancelado = true }
  }, [concursoId])

  const titulares = (modulos ?? []).filter((m) => m.combinacao !== null)
  const familiares = (modulos ?? []).filter((m) => m.combinacao === null)
  const comGente = (modulos ?? []).filter((m) => m.participantes > 0).length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <InnerTitle>Módulos do GenDocs</InnerTitle>
        {modulos && (
          <p className="text-sm text-erp-dark-gray">
            {modulos.length} módulos · {comGente} com participante
          </p>
        )}
      </div>

      <p className="text-sm leading-relaxed text-erp-dark-gray">
        A coleta documental deste concurso não é um módulo só. Cada combinação de declarações do
        Sisprouni tem a sua lista, e o grupo familiar tem as dele — o candidato cai em um módulo
        de titular, e cada familiar inserido abre a coleta no módulo da idade dele.
      </p>

      {modulos && (
        <NotaVinculoModulos
          modulos={modulos.length}
          titulares={titulares.length}
          familiares={familiares.length}
          chamadas={concursos?.length ?? null}
        />
      )}

      {erro && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar os módulos: {erro}
        </p>
      )}

      {modulos === null && !erro && (
        <p className="py-6 text-center text-sm text-erp-dark-gray">Carregando módulos…</p>
      )}

      {modulos && (
        <>
          <TabelaModulos titulo="Titular — por combinação de declarações" linhas={titulares} />
          <TabelaModulos titulo="Grupo familiar" linhas={familiares} />
        </>
      )}
    </section>
  )
}

/**
 * A nota que explica por que esta tela mostra uma LISTA onde o ERP tem um campo.
 *
 * É a única parte da representação que contraria o sistema atual de propósito,
 * então ela precisa dizer o que muda, quanto custa não mudar, e o que continua
 * igual entre os concursos.
 *
 * Os números vêm do banco (módulos carregados e concursos do processo) em vez
 * de escritos aqui: criar uma quarta chamada ou um módulo novo tem de mexer na
 * conta sozinho, senão a nota vira a primeira coisa desatualizada da tela.
 */
function NotaVinculoModulos({
  modulos,
  titulares,
  familiares,
  chamadas,
}: {
  modulos: number
  titulares: number
  familiares: number
  chamadas: number | null
}) {
  return (
    <section className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/70 p-4 text-sm text-amber-900/90">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
        Nota de desenvolvimento — o vínculo concurso ↔ módulo precisa deixar de ser 1:1
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 leading-relaxed">
        <li>
          <b>Hoje é um módulo por concurso.</b> O ERP guarda a ligação num campo único
          (<code className="rounded bg-amber-100 px-1">concursos.modulo_gendocs_id</code>), modelo
          da época em que o GenDocs tinha um módulo por perfil.
        </li>
        <li>
          <b>Mantendo 1:1, cada variação de módulo viraria um concurso.</b> São {modulos} módulos
          {chamadas ? (
            <>
              {' '}e {chamadas} chamadas: <b>{modulos} × {chamadas} = {modulos * chamadas} concursos</b>{' '}
              dentro do mesmo processo seletivo
            </>
          ) : (
            <> repetidos em cada chamada</>
          )}
          , para representar um vestibular só — e o candidato continua sendo um.
        </li>
        <li>
          <b>De onde vêm os {modulos}:</b> {titulares} são combinações de declarações do titular
          (as perguntas Sim/Não do Sisprouni na landing, todas as combinações possíveis) e{' '}
          {familiares} são do grupo familiar — familiar maior de idade, menor com RG e CPF, e menor
          com certidão de nascimento.
        </li>
        <li>
          <b>O candidato preenche no máximo 4.</b> Um de titular — o da combinação que ele marcou
          na landing — mais até três de familiar, um por variação que existir no grupo dele. As
          outras {Math.max(0, titulares - 1)} combinações de titular nunca aparecem para ele.
        </li>
        <li>
          <b>A sugestão é o que esta tela já mostra:</b> um concurso recebendo vários módulos, por
          tabela de ligação. Os concursos ficam com os mesmos {modulos} módulos, porque a lista
          documental de cada combinação é idêntica na 1ª chamada, na 2ª e na lista de espera —{' '}
          <b>o que muda de um concurso para o outro é a data</b>.
        </li>
      </ul>
    </section>
  )
}

function TabelaModulos({ titulo, linhas }: { titulo: string; linhas: ModuloDoConcurso[] }) {
  if (linhas.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-sm font-semibold text-erp-dark-gray">{titulo}</p>
      <ErpTable>
        <thead>
          <tr>
            <Th className="min-w-[420px]">Nome do Módulo</Th>
            <Th className="min-w-32">Documentos</Th>
            <Th className="min-w-32">Obrigatórios</Th>
            <Th className="min-w-32">Participantes</Th>
            <Th className="min-w-28">Situação</Th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((m) => {
            const to = `/gendocs/modulo/${m.slug}`
            return (
              <Tr key={m.id} to={to}>
                <Td to={to} className="min-w-[420px]">{m.nome}</Td>
                <Td to={to} className="min-w-32">{m.documentos}</Td>
                <Td to={to} className="min-w-32">{m.obrigatorios}</Td>
                <Td to={to} className="min-w-32">
                  {m.participantes > 0 ? (
                    <span className="font-semibold text-erp-primary">{m.participantes}</span>
                  ) : (
                    <span className="text-erp-dark-gray">--</span>
                  )}
                </Td>
                <Td to={to} className="min-w-28">{m.ativo ? m.situacao : 'Inativo'}</Td>
              </Tr>
            )
          })}
        </tbody>
      </ErpTable>
    </div>
  )
}
