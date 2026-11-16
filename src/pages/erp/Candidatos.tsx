import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import {
  FileSpreadsheet, Eye, TriangleAlert, Copy, Check, CircleCheck, Loader2,
  ArrowRight, Ban, GraduationCap, RefreshCcw, ChevronDown,
} from 'lucide-react'
import {
  RouteHeader, SearchInput, FilterButton, SolidButton, ErpTable, Th, Tr, Td,
  StatusBadge, Pagination, EmptyRow, DetailsHeader, DetailsContainer, SectionTitle,
  InnerTitle, Divider, Field, FieldRow, OutlineButton, ErpModal, ErpListaPesquisavel,
  type OpcaoCombo,
} from '../../components/erp/ui'
import { getCandidato, type Candidato, type Endereco, type StatusCandidato } from '../../data/erp'
import type { BadgeTom } from '../../components/erp/ui'
import {
  coletasDoCandidatoErp, consultarWae, dataHoraBr, negarCandidato, listarCandidatosErp,
  mascararCpf, matricular, reabrirInscricao, situacaoMatricula, FuncaoAusente,
  definirFiliais, listarPolos,
  type CandidatoErp, type ColetaDoCandidatoErp, type ConsultaWae, type SituacaoMatricula,
  type Polo,
} from '../../lib/api'
import { STATUS_LABEL, STATUS_TEXT, type ColetaStatus } from '../../data/gendocs'
import { cn } from '../../lib/cn'
import { candidatoDoBanco } from '../../lib/erpCandidato'
import { useMudancas } from '../../lib/tempo-real'

const TOM: Record<StatusCandidato, BadgeTom> = {
  Matriculado: 'verde',
  Desistente: 'cinza',
  Negado: 'cinza',
  Inscrito: 'azul',
  'Em análise': 'laranja',
}

/**
 * Listagem de Candidatos do módulo Processos Seletivos.
 * Réplica do print e do HTML `Menu_Candidatos.html` (mesmo layout de tabela).
 */
export function ErpCandidatos() {
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  /* Candidatos reais: são os que se inscreveram pela landing page. A lista
     fixa de 500 linhas que existia aqui só servia para a paginação ter volume
     — agora o volume é o real. */
  const [lista, setLista] = useState<CandidatoErp[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useMudancas(['candidato', 'coleta', 'grupo'], useCallback(() => setVersao((v) => v + 1), []))

  useEffect(() => {
    let cancelado = false
    listarCandidatosErp()
      .then((c) => { if (!cancelado) setLista(c) })
      .catch((f: unknown) => { if (!cancelado) setErro(f instanceof Error ? f.message : String(f)) })
    return () => { cancelado = true }
  }, [versao])

  const filtrada = useMemo(() => {
    const base = lista ?? []
    const q = busca.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.cpf.includes(q.replace(/\D/g, '')) ||
        c.email.toLowerCase().includes(q) ||
        (c.curso ?? '').toLowerCase().includes(q) ||
        c.protocolo.toLowerCase().includes(q),
    )
  }, [busca, lista])

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtrada.slice((atual - 1) * porPagina, atual * porPagina)

  return (
    <div>
      <RouteHeader crumbs={[{ label: 'Processos Seletivos' }]} titulo="Candidatos" voltar={false} />

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
                <Th className="min-w-[200px]">Nome do Candidato</Th>
                <Th className="min-w-[150px]">CPF</Th>
                <Th className="min-w-[200px]">Data e Hora Inscrição</Th>
                <Th className="min-w-[300px]">E-mail</Th>
                <Th className="min-w-[200px]">Curso</Th>
                <Th className="min-w-[170px]">Filial de Captação</Th>
                <Th className="min-w-[170px]">Status</Th>
                <Th className="min-w-[250px]">Nome do Concurso</Th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => {
                const to = `/erp/candidatos/${c.id}`
                const status = (c.status ?? 'Inscrito') as StatusCandidato
                return (
                  <Tr key={c.id} to={to}>
                    <Td to={to} className="min-w-[200px] max-w-[260px]">{c.nome}</Td>
                    <Td to={to} className="min-w-[150px]">{mascararCpf(c.cpf)}</Td>
                    <Td to={to} className="min-w-[200px]">{dataHoraBr(c.inscricao)}</Td>
                    <Td to={to} className="min-w-[300px]">{c.email}</Td>
                    <Td to={to} className="min-w-[200px] max-w-[280px]">{c.curso ?? '--'}</Td>
                    <Td to={to} className="min-w-[170px] max-w-[200px]">{c.filial_captacao ?? '--'}</Td>
                    <Td to={to} className="min-w-[170px]">
                      <StatusBadge label={status} tom={TOM[status] ?? 'azul'} />
                    </Td>
                    <Td to={to} className="min-w-[250px]">{c.concurso ?? '--'}</Td>
                  </Tr>
                )
              })}
              {lista === null && !erro && <EmptyRow colSpan={8} texto="Carregando candidatos…" />}
              {erro && <EmptyRow colSpan={8} texto={`Falha ao carregar: ${erro}`} />}
              {lista !== null && visiveis.length === 0 && (
                <EmptyRow colSpan={8} texto="Nenhum candidato encontrado." />
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
 * Detalhes do candidato — réplica de `Candidatos_Detalhes.html` (prints 3 e 4).
 */
export function ErpCandidatoDetalhes() {
  const { id = '' } = useParams()

  /* O id decide a fonte: uuid é candidato do banco (veio da landing page);
     numérico é uma das linhas dos prints, que continuam fixas em data/erp.ts. */
  const doBanco = id.includes('-')
  const [c, setC] = useState<Candidato | null>(doBanco ? null : (getCandidato(id) ?? null))
  const [erro, setErro] = useState<string | null>(null)

  /* As coletas que a inscrição abriu no GenDocs. Só existem para candidato do
     banco — as linhas dos prints não passaram por inscrição nenhuma. */
  const [coletas, setColetas] = useState<ColetaDoCandidatoErp[] | null>(doBanco ? null : [])
  /* Onde a inscrição está no funil: dá para matricular? já foi? foi
     negada? Só existe para candidato do banco. */
  const [situacao, setSituacao] = useState<SituacaoMatricula | null>(null)
  /* A migração que cria `erp_situacao_matricula` ainda pode não ter rodado.
     Sem separar isto de "não tem inscrição", o rodapé mentiria o motivo. */
  const [semRecurso, setSemRecurso] = useState(false)
  const [versao, setVersao] = useState(0)

  /* A seção GenDocs desta ficha é a mesma coleta que o analista está julgando
     na outra tela: um parecer lá muda o status daqui. */
  useMudancas(['candidato', 'coleta', 'grupo'], useCallback(() => setVersao((v) => v + 1), []))

  useEffect(() => {
    if (!doBanco) return
    let cancelado = false
    candidatoDoBanco(id)
      .then((r) => { if (!cancelado) setC(r) })
      .catch((f: unknown) => { if (!cancelado) setErro(f instanceof Error ? f.message : String(f)) })
    return () => { cancelado = true }
  }, [doBanco, id, versao])

  useEffect(() => {
    if (!doBanco) return
    let cancelado = false
    coletasDoCandidatoErp(id)
      .then((r) => { if (!cancelado) setColetas(r) })
      .catch(() => { if (!cancelado) setColetas([]) })
    return () => { cancelado = true }
  }, [doBanco, id, versao])

  useEffect(() => {
    if (!doBanco) return
    let cancelado = false
    situacaoMatricula(id)
      .then((r) => { if (!cancelado) { setSituacao(r); setSemRecurso(false) } })
      .catch((f: unknown) => {
        if (!cancelado) { setSituacao(null); setSemRecurso(f instanceof FuncaoAusente) }
      })
    return () => { cancelado = true }
  }, [doBanco, id, versao])

  if (!doBanco && !c) return <Navigate to="/erp/candidatos" replace />

  if (erro) {
    return (
      <div>
        <RouteHeader
          crumbs={[
            { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
            { label: 'Candidatos', to: '/erp/candidatos' },
          ]}
          titulo="Detalhes"
        />
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>Não foi possível carregar o candidato: {erro}</span>
        </div>
      </div>
    )
  }

  if (!c) {
    return (
      <div>
        <RouteHeader
          crumbs={[
            { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
            { label: 'Candidatos', to: '/erp/candidatos' },
          ]}
          titulo="Detalhes"
        />
        <p className="py-16 text-center text-erp-dark-gray">Carregando candidato…</p>
      </div>
    )
  }

  return (
    <div>
      <RouteHeader
        crumbs={[
          { label: 'Processos Seletivos', to: '/erp/processos-seletivos' },
          { label: 'Candidatos', to: '/erp/candidatos' },
        ]}
        titulo="Detalhes"
      />

      <DetailsHeader titulo={c.nome} laranja />

      <DetailsContainer>
        <h1 className="text-2xl font-bold text-gray-800">
          {c.nome} - CPF: {c.cpf}
        </h1>

        {/* Dados do Processo Seletivo */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Dados do Processo Seletivo</SectionTitle>
          <FieldRow>
            <Field label="Processo Seletivo" value={c.processoSeletivo} />
            <Field label="Concurso" value={c.concurso} />
            <Field label="Valor da Oferta" value={c.valorOferta} />
          </FieldRow>
        </section>

        <Divider />

        {/* Dados Pessoais */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Dados Pessoais</SectionTitle>
          <FieldRow>
            <Field label="Nome Completo" value={c.nome} />
            <Field label="Data de Nascimento" value={c.nascimento} />
          </FieldRow>
          <FieldRow>
            <Field label="Gênero" value={c.genero} />
            <Field label="Raça" value={c.raca} />
          </FieldRow>
          <FieldRow>
            <Field label="CPF" value={c.cpf} />
          </FieldRow>
        </section>

        <Divider />

        {/* Endereços */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Endereços</SectionTitle>
          <BlocoEndereco titulo="Pessoal" e={c.enderecoPessoal} />
          <BlocoEndereco titulo="Cobrança" e={c.enderecoCobranca} />
        </section>

        <Divider />

        {/* Contatos */}
        <section className="flex flex-col gap-4">
          <InnerTitle>Contatos</InnerTitle>
          <div className="grid w-full grid-cols-2 gap-3">
            <Field label="Telefone" value={c.telefone} className="w-2/3" />
            <Field label="E-mail Acadêmico" value={c.emailAcademico} className="w-2/3" />
          </div>
        </section>

        <Divider />

        {/* Oferta */}
        <section className="flex flex-col gap-4">
          <SectionTitle>Oferta</SectionTitle>

          <InnerTitle>Curso</InnerTitle>
          <ErpTable>
            <thead>
              <tr>
                <Th>Nome do Curso</Th>
                <Th>Área de Conhecimento</Th>
                <Th>Tipo de Formação</Th>
                <Th>Modalidade</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td className="min-w-[420px] max-w-[450px]">{c.curso}</Td>
                <Td className="min-w-16 max-w-56">{c.areaConhecimento}</Td>
                <Td className="min-w-16 max-w-40">{c.tipoFormacao}</Td>
                <Td className="min-w-24 max-w-32">{c.modalidade}</Td>
              </Tr>
            </tbody>
          </ErpTable>

          <SecaoGenDocs coletas={coletas} />

          <SecaoFiliais
            candidatoId={id}
            doBanco={doBanco}
            captacao={situacao?.polo_id ?? null}
            praticas={situacao?.polo_praticas_id ?? null}
            aoMudar={() => setVersao((v) => v + 1)}
          />

          <InnerTitle>Plano de Pagamento</InnerTitle>
          <ErpTable>
            <thead>
              <tr>
                <Th>Nome do Pagamento</Th>
                <Th>Quant. Parcelas</Th>
                <Th>Taxa</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td className="min-w-[420px] max-w-[450px]">{c.planoPagamento.nome}</Td>
                <Td className="min-w-48 max-w-64">{c.planoPagamento.parcelas}</Td>
                <Td className="min-w-48 max-w-64">{c.planoPagamento.taxa}</Td>
                <Td className="min-w-16 max-w-20">
                  <button className="p-0" title="Visualizar plano">
                    <Eye className="size-5 text-gray-600" />
                  </button>
                </Td>
              </Tr>
            </tbody>
          </ErpTable>
        </section>

        <Divider />

        {/* Rodapé — a decisão final sobre o candidato */}
        <section className="flex flex-col gap-4">
          <FieldRow>
            <Field label="Data de Criação" value={c.criadoEm} />
            <Field label="Última Alteração" value={c.alteradoEm} />
            <Decisao
              candidatoId={id}
              situacao={situacao}
              doBanco={doBanco}
              semRecurso={semRecurso}
              aoMudar={() => setVersao((v) => v + 1)}
            />
          </FieldRow>
        </section>
      </DetailsContainer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Seção GenDocs da ficha                                              */
/* ------------------------------------------------------------------ */

/**
 * As coletas que a inscrição abriu no GenDocs, uma por linha. O titular
 * aparece no módulo PROUNI e em cada declaração que marcou "Sim"; cada
 * familiar do grupo aparece no PROUNI.
 *
 * O e-mail repetido nas linhas dos familiares não é engano: familiar não tem
 * e-mail próprio no sistema — a comunicação da coleta dele vai para o titular.
 *
 * A linha leva para a lista de participantes do módulo, já filtrada na pessoa.
 * É o mais perto de "análise da coleta" que existe hoje; quando a tela de
 * análise do analista for feita, só o destino muda.
 */
function SecaoGenDocs({ coletas }: { coletas: ColetaDoCandidatoErp[] | null }) {
  return (
    <>
      <InnerTitle>GenDocs</InnerTitle>
      <ErpTable>
        <thead>
          <tr>
            <Th>Nome do Candidato</Th>
            <Th>E-mail do Candidato</Th>
            <Th>Status da Coleta</Th>
            <Th>Link da Coleta</Th>
          </tr>
        </thead>
        <tbody>
          {coletas?.map((l) => {
            /* A linha abre a análise daquela coleta, não a lista do módulo. */
            const to = `/gendocs/modulo/${l.modulo_slug}/participantes/${l.participante_id}`
            const status = l.status as ColetaStatus
            return (
              <Tr key={l.participante_id} to={to}>
                <Td to={to} className="min-w-[420px] max-w-[450px]">
                  <span className="block">{l.nome}</span>
                  <span className="block text-sm text-erp-dark-gray">
                    {l.modulo}
                    {!l.titular && ` · ${l.parentesco ?? 'Familiar'}`}
                  </span>
                </Td>
                <Td to={to} className="min-w-64 max-w-72">{l.email}</Td>
                <Td to={to} className="min-w-48 max-w-64">
                  <span className={cn('font-semibold', STATUS_TEXT[status])}>
                    {STATUS_LABEL[status] ?? l.status}
                  </span>
                  <span className="block text-sm text-erp-dark-gray">
                    {l.resolvidos} de {l.documentos} obrigatórios
                  </span>
                </Td>
                <Td className="min-w-72 max-w-96">
                  <LinkDaColeta slug={l.modulo_slug} />
                </Td>
              </Tr>
            )
          })}
          {coletas === null && <EmptyRow colSpan={4} texto="Carregando coletas…" />}
          {coletas?.length === 0 && (
            <EmptyRow colSpan={4} texto="Nenhuma coleta aberta no GenDocs para este candidato." />
          )}
        </tbody>
      </ErpTable>
    </>
  )
}

/**
 * O link que o candidato usa para preencher a documentação. É o link puro,
 * para o atendente copiar e mandar por onde quiser — clicar copia, não navega.
 * Navegar levaria para a tela do aluno, que exige a sessão dele; quem quer
 * conferir usa a linha, que abre a análise.
 */
function LinkDaColeta({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false)
  const url = `${window.location.origin}/gendocs/coleta/${slug}`

  async function copiar(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* Sem permissão de área de transferência: o texto continua à vista
         para copiar na mão. */
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title="Clique para copiar o link"
      className="flex w-full min-w-0 items-center gap-2 text-left"
    >
      <span className="min-w-0 truncate text-erp-blue underline">{url}</span>
      {copiado ? (
        <Check className="size-5 shrink-0 text-erp-success" />
      ) : (
        <Copy className="size-5 shrink-0 text-erp-dark-gray" />
      )}
    </button>
  )
}

function BlocoEndereco({ titulo, e }: { titulo: string; e: Endereco }) {
  return (
    <div className="flex w-full flex-col gap-2 transition-all">
      <InnerTitle>{titulo}</InnerTitle>
      <div className="grid w-full grid-cols-3 gap-2 gap-y-7">
        <Field label="Endereço" value={e.endereco} />
        <Field label="Número" value={e.numero} />
        <Field label="Complemento" value={e.complemento} />
        <Field label="CEP" value={e.cep} />
        <Field label="Cidade" value={e.cidade} />
        <Field label="Bairro" value={e.bairro} />
        <Field label="País" value={e.pais} />
        <Field label="UF" value={e.uf} />
        <Field label="Região" value={e.regiao} />
      </div>
    </div>
  )
}

/**
 * Listagem de Candidatos dentro de um processo seletivo — mesma tabela, com
 * botão "Gerar Excel" e trilha própria (print 11 / `Menu_Candidatos.html`).
 */
export function ErpCandidatosDoProcesso({ lista, psId }: { lista: Candidato[]; psId: string }) {
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((c) => c.nome.toLowerCase().includes(q) || c.cpf.includes(q))
  }, [lista, busca])

  const totalPaginas = Math.max(1, Math.ceil(filtrada.length / porPagina))
  const atual = Math.min(pagina, totalPaginas)
  const visiveis = filtrada.slice((atual - 1) * porPagina, atual * porPagina)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4 transition-all">
        <SearchInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..." />
        <FilterButton />
        <SolidButton>
          <p>Gerar Excel</p>
          <FileSpreadsheet />
        </SolidButton>
      </div>

      <div className="flex flex-col gap-4 transition-all">
        <ErpTable>
          <thead>
            <tr>
              <Th className="min-w-[200px]">Nome do Candidato</Th>
              <Th className="min-w-[150px]">CPF</Th>
              <Th className="min-w-[200px]">Data e Hora Inscrição</Th>
              <Th className="min-w-[300px]">E-mail</Th>
              <Th className="min-w-[200px]">Curso</Th>
              <Th className="min-w-[170px]">Filial de Captação</Th>
              <Th className="min-w-[170px]">Status</Th>
              <Th className="min-w-[250px]">Nome do Concurso</Th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => {
              const to = `/erp/candidatos/${c.id}`
              return (
                <Tr key={`${psId}-${c.id}`} to={to}>
                  <Td to={to}>{c.nome}</Td>
                  <Td to={to}>{c.cpf}</Td>
                  <Td to={to}>{c.inscricao}</Td>
                  <Td to={to}>{c.email}</Td>
                  <Td to={to}>{c.curso}</Td>
                  <Td to={to}>{c.filialCaptacao}</Td>
                  <Td to={to}>
                    <StatusBadge label={c.status} tom={TOM[c.status]} />
                  </Td>
                  <Td to={to}>{c.concurso}</Td>
                </Tr>
              )
            })}
          </tbody>
        </ErpTable>

        <Pagination
          porPagina={porPagina}
          onPorPagina={setPorPagina}
          pagina={atual}
          totalPaginas={lista.length === 0 ? 0 : totalPaginas}
          onPagina={setPagina}
        />
      </div>
    </div>
  )
}

/* ==================================================================
 * A decisão final: MATRICULAR ou NEGAR CANDIDATO
 *
 * Substitui "Validar Pagamento" e "Gerar Cobrança de Matrícula" do print.
 * Cobrança não faz sentido em bolsa integral, e a decisão que a Secretaria
 * de fato toma nesta tela é outra: matricular quem passou na análise ou
 * negar quem não passou.
 *
 * MATRICULAR tem dois caminhos, e quem escolhe é o sistema — não a pessoa
 * que atende. Ele pergunta ao WAE se aquele CPF já tem matrícula vigente no
 * curso contemplado e segue por um dos dois. O modal existe para MOSTRAR
 * essa decisão acontecendo, com a especificação de cada caminho para o time
 * de desenvolvimento: é um mockup do processo, não a integração.
 * ================================================================== */

/**
 * O QUE cada caminho precisa fazer — não COMO.
 *
 * Isto é representação de requisito, não desenho técnico: descreve o efeito
 * esperado no aluno e no contrato dele. Quais chamadas fazer, em que ordem,
 * de forma síncrona ou por fila, com qual API do WAE — é decisão do time de
 * desenvolvimento, que conhece o sistema de verdade. Endpoints inventados aqui
 * só criariam a impressão de que o contrato de integração já está fechado.
 */
const CAMINHOS = {
  aluno_novo: {
    titulo: 'Nova matrícula',
    quando: 'O WAE não encontrou matrícula vigente deste CPF no curso contemplado.',
    passos: [
      'Chamar a API do WAE e criar a matrícula do aluno no curso, polo e turno da oferta, com o plano de bolsa integral do ProUni.',
      'Guardar na inscrição o RA que o WAE devolver.',
    ],
    naoFaz:
      'Não há contrato anterior neste curso: nada é estornado e nada é isentado retroativamente.',
  },
  ja_matriculado: {
    titulo: 'Alteração de matrícula vigente',
    quando: 'O WAE encontrou matrícula ativa deste CPF no mesmo curso.',
    passos: [
      'NÃO criar matrícula nova. Substituir o contrato que o aluno já tem naquele curso pelo contrato do ProUni.',
      'Isentar as mensalidades da troca em diante — bolsa integral, 100%.',
      'Estornar as mensalidades já pagas dentro do período coberto pela bolsa.',
    ],
    naoFaz:
      'RA, histórico e turma continuam os mesmos: muda o contrato financeiro, não o vínculo acadêmico.',
  },
} as const

type ChaveCaminho = keyof typeof CAMINHOS

/* ------------------------------------------------------------------ */
/* Bloco do rodapé                                                     */
/* ------------------------------------------------------------------ */

function Decisao({
  candidatoId,
  situacao,
  doBanco,
  semRecurso,
  aoMudar,
}: {
  candidatoId: string
  situacao: SituacaoMatricula | null
  /** Linha de print não tem inscrição no banco — só o desenho dos botões. */
  doBanco: boolean
  /** O banco ainda não tem as funções de matrícula (migrações 27 e 28). */
  semRecurso: boolean
  aoMudar: () => void
}) {
  const [matriculando, setMatriculando] = useState(false)
  const [negando, setNegando] = useState(false)

  const pode = !!situacao?.pode_matricular
  const decidido = situacao?.status === 'Matriculado' || situacao?.status === 'Negado'

  const motivoBloqueio = !doBanco
    ? 'Linha de demonstração dos prints — não tem inscrição no banco'
    : semRecurso
      ? 'As funções de matrícula ainda não existem neste banco (migrações 27 e 28)'
      : !situacao?.inscricao_id
        ? 'Candidato sem inscrição em concurso'
        : situacao.status === 'Matriculado'
          ? 'Candidato já matriculado'
          : situacao.status === 'Negado'
            ? 'Candidato negado'
            : situacao.coletas_total === 0
              ? 'Nenhuma coleta aberta no GenDocs'
              : `Faltam ${situacao.coletas_pendentes.length} coleta(s) finalizar no GenDocs`

  return (
    <div className="flex flex-1 flex-col items-end gap-2 transition-all">
      <div className="flex items-center gap-2 transition-all">
        <OutlineButton
          onClick={() => setNegando(true)}
          disabled={
            !doBanco || semRecurso || !situacao?.inscricao_id ||
            situacao.status === 'Matriculado'
          }
          title={
            semRecurso
              ? motivoBloqueio
              : situacao?.status === 'Matriculado'
                ? 'Candidato já matriculado'
                : 'Marcar como negado — nenhuma matrícula é criada'
          }
          className="text-xl"
        >
          <Ban className="size-5" /> NEGAR CANDIDATO
        </OutlineButton>
        <SolidButton
          onClick={() => setMatriculando(true)}
          disabled={!pode}
          title={pode ? 'Matricular no WAE' : motivoBloqueio}
          className="h-9 rounded-xl px-4 py-2 text-xl"
        >
          <GraduationCap className="size-5" /> MATRICULAR
        </SolidButton>
      </div>

      {doBanco && semRecurso && (
        <p className="max-w-xl rounded-md border border-dashed border-amber-400 bg-amber-50/70 px-4 py-3 text-right text-sm text-amber-900/90">
          <b>Matricular e negar ainda não estão ligados neste banco.</b> As telas existem; o
          que falta é aplicar as migrações <b>27</b> e <b>28</b> em{' '}
          <code>Representação/prouni-app/supabase</code>.
        </p>
      )}

      {doBanco && !semRecurso && situacao && !decidido && !pode && (
        <ColetasQueFaltam situacao={situacao} />
      )}

      {doBanco && situacao && decidido && <DecisaoTomada situacao={situacao} aoMudar={aoMudar} />}

      {situacao && (
        <>
          <ModalMatricula
            aberto={matriculando}
            situacao={situacao}
            aoFechar={() => setMatriculando(false)}
            aoConcluir={aoMudar}
          />
          <ModalNegar
            aberto={negando}
            candidatoId={candidatoId}
            nome={situacao.nome}
            aoFechar={() => setNegando(false)}
            aoConcluir={aoMudar}
          />
        </>
      )}
    </div>
  )
}

/** Por que o MATRICULAR está cinza. Botão desabilitado sem motivo vira chamado. */
function ColetasQueFaltam({ situacao }: { situacao: SituacaoMatricula }) {
  if (!situacao.inscricao_id) {
    return (
      <p className="max-w-xl text-right text-sm text-erp-dark-gray">
        Este candidato não tem inscrição em concurso nenhum.
      </p>
    )
  }
  if (situacao.coletas_total === 0) {
    return (
      <p className="max-w-xl text-right text-sm text-erp-dark-gray">
        Nenhuma coleta aberta no GenDocs para este candidato.
      </p>
    )
  }
  return (
    <div className="max-w-xl rounded-md border border-erp-primary/40 bg-erp-primary-opacity px-4 py-3 text-sm text-gray-700">
      <b className="block">A matrícula só é liberada com todas as coletas finalizadas.</b>
      <ul className="mt-1 flex flex-col gap-0.5">
        {situacao.coletas_pendentes.map((p) => (
          <li key={`${p.nome}-${p.modulo}`}>
            {p.nome} <span className="text-erp-dark-gray">— {p.modulo}</span>{' '}
            <span className={cn('font-semibold', STATUS_TEXT[p.status as ColetaStatus])}>
              {STATUS_LABEL[p.status as ColetaStatus] ?? p.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** O que já foi decidido, para a ficha não esquecer. */
function DecisaoTomada({
  situacao,
  aoMudar,
}: {
  situacao: SituacaoMatricula
  aoMudar: () => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const matriculado = situacao.status === 'Matriculado'
  const caminho =
    matriculado && situacao.fluxo !== 'nao_definido'
      ? CAMINHOS[situacao.fluxo as ChaveCaminho]
      : null

  async function reabrir() {
    setOcupado(true)
    try {
      await reabrirInscricao(situacao.candidato_id)
      aoMudar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex max-w-xl flex-col items-end gap-2">
      <div
        className={cn(
          'w-full rounded-md border px-4 py-3 text-sm',
          matriculado
            ? 'border-erp-success/40 bg-erp-success/10 text-gray-700'
            : 'border-erp-light-gray bg-erp-white-gray text-gray-700',
        )}
      >
        {matriculado ? (
          <>
            <b className="block text-erp-success">
              Matriculado em {dataHoraBr(situacao.matriculado_em)}
            </b>
            <p className="mt-0.5">
              Caminho: <b>{caminho?.titulo ?? '--'}</b>
              {situacao.ra_wae && (
                <>
                  {' '}
                  · RA <b>{situacao.ra_wae}</b>
                </>
              )}
            </p>
            {situacao.matriculado_por && (
              <p className="text-erp-dark-gray">por {situacao.matriculado_por}</p>
            )}
          </>
        ) : (
          <>
            <b className="block">Negado em {dataHoraBr(situacao.negado_em)}</b>
            {situacao.negacao_motivo && <p className="mt-0.5">{situacao.negacao_motivo}</p>}
            {situacao.negado_por && (
              <p className="text-erp-dark-gray">por {situacao.negado_por}</p>
            )}
          </>
        )}
      </div>

      {/* ANDAIME: sem isto a demonstração só roda uma vez por candidato. */}
      <button
        type="button"
        onClick={reabrir}
        disabled={ocupado}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-amber-400 bg-amber-50/60 px-3 py-1.5 text-xs text-amber-800 transition-colors hover:bg-amber-100/60 disabled:opacity-50"
      >
        <RefreshCcw className="size-3.5" />
        {ocupado ? 'Desfazendo…' : 'Apenas para desenvolvimento: desfazer e mostrar de novo'}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal de matrícula — o processo acontecendo                         */
/* ------------------------------------------------------------------ */

function ModalMatricula({
  aberto,
  situacao,
  aoFechar,
  aoConcluir,
}: {
  aberto: boolean
  situacao: SituacaoMatricula
  aoFechar: () => void
  aoConcluir: () => void
}) {
  const [wae, setWae] = useState<ConsultaWae | null>(null)
  /* ANDAIME: força a resposta da consulta, para o time ver os dois caminhos
     sem precisar de dois candidatos em estados diferentes. */
  const [forcar, setForcar] = useState<ChaveCaminho | undefined>(undefined)
  const [falha, setFalha] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [feito, setFeito] = useState<{ fluxo: ChaveCaminho; ra: string } | null>(null)

  /* A consulta é refeita a cada abertura. O atraso é proposital: o processo
     precisa ser VISTO acontecendo — é essa a razão de ser desta tela. */
  useEffect(() => {
    if (!aberto) return
    let cancelado = false
    setWae(null)
    setFalha(null)
    setFeito(null)
    const t = setTimeout(() => {
      consultarWae(situacao.candidato_id, forcar)
        .then((r) => {
          if (!cancelado) setWae(r)
        })
        .catch((f: unknown) => {
          if (!cancelado) setFalha(f instanceof Error ? f.message : String(f))
        })
    }, 900)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [aberto, forcar, situacao.candidato_id])

  async function confirmar() {
    if (!wae) return
    setConfirmando(true)
    setFalha(null)
    try {
      const r = await matricular(situacao.candidato_id, wae.fluxo)
      if (!r.ok) setFalha(r.motivo ?? 'Não foi possível matricular.')
      else {
        setFeito({ fluxo: wae.fluxo, ra: r.ra ?? '--' })
        aoConcluir()
      }
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setConfirmando(false)
    }
  }

  const escolhido = wae?.fluxo

  return (
    <ErpModal
      aberto={aberto}
      onFechar={aoFechar}
      titulo="Matricular candidato"
      subtitulo={`${situacao.nome} · CPF ${mascararCpf(situacao.cpf)} · ${situacao.curso ?? '--'}`}
      largura="max-w-3xl"
    >
      {feito ? (
        <Concluido feito={feito} onFechar={aoFechar} />
      ) : (
        <div className="flex flex-col gap-5 text-left">
          <Passo n={1} titulo="Documentação conferida" estado="ok">
            {situacao.coletas_total} de {situacao.coletas_total} coletas do grupo finalizadas no
            GenDocs — a do titular e a de cada familiar.
          </Passo>

          <Passo n={2} titulo="Consulta ao WAE" estado={wae ? 'ok' : 'rodando'}>
            <code className="block break-all rounded bg-erp-white-gray px-2 py-1 font-mono text-xs text-gray-700">
              {wae?.endpoint ?? `GET /wae/matriculas?cpf=${situacao.cpf}&curso=…`}
            </code>
            <p className="mt-1.5">
              {wae ? (
                wae.matricula_vigente ? (
                  <>
                    Resposta: <b>matrícula ativa encontrada</b> para este CPF no mesmo curso
                    {wae.ra ? ` (RA ${wae.ra})` : ''}.
                  </>
                ) : (
                  <>
                    Resposta: <b>nenhuma matrícula ativa</b> deste CPF no curso contemplado.
                  </>
                )
              ) : (
                'Consultando…'
              )}
            </p>
          </Passo>

          <Passo n={3} titulo="Caminho escolhido pelo sistema" estado={wae ? 'ok' : 'espera'}>
            <p className="mb-3">
              Quem decide é a resposta acima, não quem atende. Os dois caminhos ficam à vista
              para o time de desenvolvimento — o descartado aparece apagado.
            </p>
            <p className="mb-3 rounded-md border border-erp-light-gray bg-erp-white-gray px-3 py-2 text-xs leading-relaxed">
              <b>Este fluxo é representativo.</b> O que está descrito abaixo é o efeito
              esperado — o que muda para o aluno e para o contrato dele. <b>Como</b> chegar lá é
              decisão do time de desenvolvimento: quais APIs do WAE usar, em que ordem, de forma
              síncrona ou por fila, e o que fazer quando uma etapa falhar.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(Object.keys(CAMINHOS) as ChaveCaminho[]).map((k) => (
                <CartaoCaminho key={k} chave={k} ativo={escolhido === k} indefinido={!escolhido} />
              ))}
            </div>
          </Passo>

          <NotaWae forcar={forcar} onForcar={setForcar} />

          {falha && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {falha}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-erp-white-gray pt-4">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-md border border-erp-light-gray px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-black/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={!wae || confirmando}
              className="inline-flex items-center gap-2 rounded-md bg-erp-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmando && <Loader2 className="size-4 animate-spin" />}
              {wae ? `Confirmar — ${CAMINHOS[wae.fluxo].titulo}` : 'Aguardando a consulta…'}
              {wae && !confirmando && <ArrowRight className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </ErpModal>
  )
}

function Passo({
  n,
  titulo,
  estado,
  children,
}: {
  n: number
  titulo: string
  estado: 'ok' | 'rodando' | 'espera'
  children: ReactNode
}) {
  return (
    <section className="flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-erp-light-gray text-sm font-bold text-erp-dark-gray">
        {estado === 'ok' ? (
          <CircleCheck className="size-7 text-erp-success" />
        ) : estado === 'rodando' ? (
          <Loader2 className="size-4 animate-spin text-erp-primary" />
        ) : (
          n
        )}
      </div>
      <div className={cn('min-w-0 flex-1 text-sm', estado === 'espera' && 'opacity-50')}>
        <b className="block text-base text-gray-800">{titulo}</b>
        <div className="mt-1 text-erp-dark-gray">{children}</div>
      </div>
    </section>
  )
}

function CartaoCaminho({
  chave,
  ativo,
  indefinido,
}: {
  chave: ChaveCaminho
  ativo: boolean
  indefinido: boolean
}) {
  const c = CAMINHOS[chave]
  return (
    <article
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 transition-all',
        indefinido
          ? 'border-erp-light-gray'
          : ativo
            ? 'border-erp-primary bg-erp-primary-opacity shadow'
            : 'border-erp-light-gray opacity-40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm text-gray-800">{c.titulo}</b>
        {ativo && (
          <span className="shrink-0 rounded-full bg-erp-primary px-2 py-0.5 text-[11px] font-bold text-white">
            escolhido
          </span>
        )}
      </div>
      <p className="text-xs text-erp-dark-gray">{c.quando}</p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-gray-700">
        {c.passos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="text-xs italic text-erp-dark-gray">{c.naoFaz}</p>
    </article>
  )
}

/**
 * Nota de desenvolvimento. Sem ela a tela mente por omissão: quem testar vai
 * supor que existe uma integração com o WAE respondendo de verdade.
 */
function NotaWae({
  forcar,
  onForcar,
}: {
  forcar: ChaveCaminho | undefined
  onForcar: (v: ChaveCaminho | undefined) => void
}) {
  return (
    <section className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/70 p-4 text-sm text-amber-900/90">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
        Nota de desenvolvimento — não existe no produto final
      </p>
      <p className="mt-2 leading-relaxed">
        <b>Não há integração com o WAE nesta demonstração.</b> Nenhuma chamada sai daqui. A
        consulta acima devolve uma resposta no formato que a API real teria, para o fluxo poder
        ser percorrido inteiro. Sem forçar, ela responde a partir de um dado nosso: este
        candidato já tem outra inscrição matriculada?
      </p>
      <p className="mt-2 leading-relaxed">
        No produto quem responde é o WAE, e ninguém escolhe o caminho. Os botões abaixo existem
        só para o time ver os dois fluxos sem precisar de dois candidatos em estados diferentes:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {([undefined, 'aluno_novo', 'ja_matriculado'] as const).map((op) => (
          <button
            key={String(op)}
            type="button"
            onClick={() => onForcar(op)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
              forcar === op
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-amber-400 bg-white text-amber-800 hover:bg-amber-100',
            )}
          >
            {op === undefined ? 'Resposta do banco' : CAMINHOS[op].titulo}
          </button>
        ))}
      </div>
    </section>
  )
}

function Concluido({
  feito,
  onFechar,
}: {
  feito: { fluxo: ChaveCaminho; ra: string }
  onFechar: () => void
}) {
  const c = CAMINHOS[feito.fluxo]
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-3">
        <CircleCheck className="size-8 shrink-0 text-erp-success" />
        <div>
          <b className="block text-lg text-gray-800">Candidato matriculado</b>
          <p className="text-sm text-erp-dark-gray">
            Caminho: {c.titulo} · RA {feito.ra}
          </p>
        </div>
      </div>

      <div className="w-full rounded-lg border border-erp-light-gray p-4 text-sm">
        <b className="block text-gray-800">O que o sistema faria neste ponto</b>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-gray-700">
          {c.passos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs italic text-erp-dark-gray">{c.naoFaz}</p>
      </div>

      <p className="rounded-md border border-dashed border-amber-400 bg-amber-50/70 px-3 py-2 text-xs text-amber-900/90">
        <b>Nesta demonstração nada foi enviado ao WAE.</b> O que mudou de verdade foi o status da
        inscrição, que passou a <b>Matriculado</b> — é o que a listagem e a ficha mostram.
      </p>

      <button
        type="button"
        onClick={onFechar}
        className="self-end rounded-md bg-erp-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-erp-hover"
      >
        Fechar
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal da negativa                                                   */
/* ------------------------------------------------------------------ */

function ModalNegar({
  aberto,
  candidatoId,
  nome,
  aoFechar,
  aoConcluir,
}: {
  aberto: boolean
  candidatoId: string
  nome: string
  aoFechar: () => void
  aoConcluir: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (aberto) {
      setMotivo('')
      setFalha(null)
    }
  }, [aberto])

  async function confirmar() {
    setOcupado(true)
    setFalha(null)
    try {
      const r = await negarCandidato(candidatoId, motivo)
      if (!r.ok) setFalha(r.motivo ?? 'Não foi possível negar o candidato.')
      else {
        aoConcluir()
        aoFechar()
      }
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <ErpModal aberto={aberto} onFechar={aoFechar} titulo="Negar candidato" subtitulo={nome}>
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-gray-700">
          O candidato passa a constar como <b>Negado</b> na listagem e na ficha. Nenhuma matrícula
          é criada e <b>nada é enviado ao WAE</b>. As coletas do GenDocs continuam como estão —
          negar não apaga documentação.
        </p>

        <label className="flex flex-col gap-1">
          <span className="font-semibold text-gray-700">Motivo (opcional)</span>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Ex.: documentação de renda incompatível com a faixa da bolsa."
            className="w-full rounded-md border border-erp-light-gray px-3 py-2 text-sm outline-none focus:border-erp-primary"
          />
          <span className="text-xs text-erp-dark-gray">
            Fica registrado na inscrição e aparece na ficha.
          </span>
        </label>

        {falha && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
            {falha}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-erp-white-gray pt-4">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-md border border-erp-light-gray px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-md bg-erp-error px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-erp-error-hover disabled:opacity-40"
          >
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
            {ocupado ? 'Negando…' : 'Negar candidato'}
          </button>
        </div>
      </div>
    </ErpModal>
  )
}

/* ==================================================================
 * Filiais — captação e práticas
 *
 * Eram duas tabelas de leitura, espelhando o polo do candidato. Viraram dois
 * campos escolhíveis porque, no ProUni, o polo NÃO chega: a landing do ProUni
 * não pergunta local de oferta — quem escolhe é o Sisprouni, e o dado não vem
 * para nós. Sem filial não há matrícula, então alguém precisa preencher, e
 * esse alguém é o analista.
 * ================================================================== */

function SecaoFiliais({
  candidatoId,
  doBanco,
  captacao,
  praticas,
  aoMudar,
}: {
  candidatoId: string
  doBanco: boolean
  /** Filial já gravada, ou null quando a inscrição chegou sem ela. */
  captacao: string | null
  praticas: string | null
  aoMudar: () => void
}) {
  const [polos, setPolos] = useState<Polo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<'captacao' | 'praticas' | null>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (!doBanco) return
    let cancelado = false
    listarPolos()
      .then((p) => { if (!cancelado) setPolos(p) })
      .catch((f: unknown) => {
        if (!cancelado) setErro(f instanceof Error ? f.message : String(f))
      })
    return () => { cancelado = true }
  }, [doBanco])

  const opcoes: OpcaoCombo[] = useMemo(
    () =>
      (polos ?? []).map((p) => ({
        valor: p.id,
        rotulo: p.nome,
        /* O código do MEC entra no apoio para a busca aceitar tanto
           "1156465" quanto "maringa". */
        apoio: [p.codigo_sispro, p.cidade && p.uf ? `${p.cidade}/${p.uf}` : null, p.tipo]
          .filter(Boolean)
          .join(' · '),
      })),
    [polos],
  )

  async function salvar(qual: 'captacao' | 'praticas', valor: string | null) {
    setSalvando(qual)
    setErro(null)
    try {
      await definirFiliais(
        candidatoId,
        qual === 'captacao' ? valor : captacao,
        qual === 'praticas' ? valor : praticas,
      )
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
      aoMudar()
    } catch (f: unknown) {
      setErro(f instanceof Error ? f.message : String(f))
    } finally {
      setSalvando(null)
    }
  }

  const escolhido = (id: string | null) => (polos ?? []).find((p) => p.id === id) ?? null

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InnerTitle>Filiais</InnerTitle>
        {salvo && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-erp-success">
            <Check className="size-4" /> salvo
          </span>
        )}
      </div>

      <NotaFiliais />

      {erro && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <LinhaFilial
        titulo="Nome da Filial de Captação"
        valor={captacao}
        polo={escolhido(captacao)}
        opcoes={opcoes}
        carregando={doBanco && polos === null}
        desabilitado={!doBanco || salvando !== null}
        onChange={(v) => salvar('captacao', v)}
      />

      <LinhaFilial
        titulo="Nome da Filial de Práticas"
        valor={praticas}
        polo={escolhido(praticas)}
        opcoes={opcoes}
        carregando={doBanco && polos === null}
        desabilitado={!doBanco || salvando !== null}
        onChange={(v) => salvar('praticas', v)}
      />
    </>
  )
}

/** "BRASÍLIA - DF". Sem UF (só a Unidade SEDE BR), mostra o que houver. */
function cidadeUf(p: Polo | null): string {
  if (!p?.cidade) return '--'
  return p.uf ? `${p.cidade} - ${p.uf}` : p.cidade
}

/**
 * A linha INTEIRA é o seletor.
 *
 * Não há campo dentro da célula: clicar em qualquer ponto da linha abre a
 * lista, que cobre a largura toda da tabela. Escolhido o nome, as outras duas
 * colunas se preenchem sozinhas — tipo e cidade vêm do banco, não são digitadas.
 *
 * O painel abre para baixo, e para CIMA quando não cabe: a segunda linha
 * (Filial de Práticas) costuma estar perto do fim da tela, e uma lista de 80
 * pixels visíveis não serve para nada.
 */
function LinhaFilial({
  titulo,
  valor,
  polo,
  opcoes,
  carregando,
  desabilitado,
  onChange,
}: {
  titulo: string
  valor: string | null
  polo: Polo | null
  opcoes: OpcaoCombo[]
  carregando: boolean
  desabilitado: boolean
  onChange: (v: string | null) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [acima, setAcima] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  function alternar() {
    if (desabilitado || carregando) return
    if (!aberto) {
      /* Decide o lado ANTES de abrir, com o espaço que a linha tem embaixo.
         O painel pede ~26rem; abaixo disso é melhor subir. */
      const r = caixa.current?.getBoundingClientRect()
      const abaixo = r ? window.innerHeight - r.bottom : 0
      const emCima = r ? r.top : 0
      setAcima(abaixo < 420 && emCima > abaixo)
    }
    setAberto((v) => !v)
  }

  return (
    <div ref={caixa} className="relative">
      <ErpTable>
        <thead>
          <tr>
            <Th>{titulo}</Th>
            <Th>Tipo da Filial</Th>
            <Th>Cidade/UF</Th>
          </tr>
        </thead>
        <tbody>
          <Tr
            onClick={alternar}
            ativo={aberto}
            className={cn(!desabilitado && !carregando && 'hover:brightness-[0.98]')}
          >
            <Td className="min-w-[420px] max-w-[450px]">
              <span className="flex items-center justify-between gap-3">
                <span className={cn('min-w-0 truncate', !polo && 'text-erp-dark-gray')}>
                  {carregando
                    ? 'Carregando locais de oferta…'
                    : (polo?.nome ?? 'Clique para escolher a filial')}
                </span>
                {!desabilitado && !carregando && (
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-erp-dark-gray transition-transform',
                      aberto && 'rotate-180',
                    )}
                  />
                )}
              </span>
            </Td>
            <Td className="min-w-16 max-w-40">{polo?.tipo ?? '--'}</Td>
            <Td className="min-w-64 max-w-72">{cidadeUf(polo)}</Td>
          </Tr>
        </tbody>
      </ErpTable>

      {/* Fora do `ErpTable` de propósito: aquele contêiner tem `overflow-auto`
          e recortaria o painel. */}
      {aberto && (
        <div
          className={cn(
            'absolute left-2 right-2 z-40',
            acima ? 'bottom-full mb-1' : 'top-full -mt-2',
          )}
        >
          <ErpListaPesquisavel
            valor={valor}
            opcoes={opcoes}
            onEscolher={(v) => {
              setAberto(false)
              onChange(v)
            }}
            placeholder="Busque por cidade, nome ou código do MEC"
            vazio="Nenhum local de oferta com esse termo"
          />
        </div>
      )}
    </div>
  )
}

/**
 * A nota que o time de desenvolvimento precisa ler antes de implementar isto.
 *
 * O ponto não é o combo: é de ONDE vem a lista, e por que ela não pode ser a
 * mesma dos outros processos seletivos.
 */
function NotaFiliais() {
  return (
    <section className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/70 p-4 text-sm text-amber-900/90">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
        Nota de desenvolvimento — este campo precisa de implementação própria
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 leading-relaxed">
        <li>
          <b>A filial é obrigatória para matricular.</b> É ela que define onde o aluno vai
          estudar e fazer as práticas, e vai junto na criação da matrícula.
        </li>
        <li>
          <b>No ProUni ela chega vazia.</b> A landing do ProUni não pergunta local de oferta —
          quem escolhe é o Sisprouni, e esse dado não vem para nós. Por isso o campo é
          preenchido aqui, pelo analista.
        </li>
        <li>
          <b>Vindo preenchido, não precisa mexer</b> — mas continua alterável. É o caso dos
          processos em que o aluno escolhe o polo na própria landing.
        </li>
        <li>
          <b>Não reaproveite a lista dos outros processos.</b> A consulta de locais de oferta
          precisa ser própria daqui: a listagem da pós e da graduação regular alimenta a landing
          delas, e mexer nela para atender ao ProUni quebraria aqueles fluxos.
        </li>
        <li>
          A lista carregada nesta demonstração é o cadastro de <b>Locais de Oferta da
          UniFatecie no ProUni/MEC</b> (938 unidades). Em produção ela precisa vir do sistema
          que for a fonte da verdade e refletir ativações e desativações.
        </li>
      </ul>
    </section>
  )
}
