import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  CalendarClock, ChevronDown, ExternalLink, Mail, TriangleAlert, UserPlus, Users, X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { GenDocsMark } from '../../components/GenDocsMark'
import { Campo, Entrada, Selecao, SimNao } from '../../components/lp/ui'
import { Titulo, Cartao, Etiqueta } from '../../components/portal/ui'
import { carregarParentescos } from '../../lib/dominio'
import {
  dataBr, documentosDe, inserirFamiliar, meuGrupo, removerFamiliar,
  type DocumentoColeta, type ParticipanteGrupo,
} from '../../lib/api'
import { useMudancas } from '../../lib/tempo-real'
import type { ContextoPortal } from '../../layouts/PortalLayout'

/* ==================================================================
 * Coletas de documentos — acompanhamento da análise.
 *
 * O envio dos arquivos não acontece aqui: o portal mostra o que falta e leva
 * ao GenDocs, que é onde a coleta roda. Cada pessoa tem o seu próprio botão,
 * porque no GenDocs a documentação é enviada por participante.
 *
 * O grupo familiar é montado pelo candidato e persiste no banco: inserir um
 * familiar grava o membro e abre a coleta dele no módulo PROUNI FAMILIARES.
 * ================================================================== */

/* Rótulos do ESTADO efetivo, não do status cru: um obrigatório coberto por
   substituto aparece como resolvido, e um substituto recusado aparece como
   problema do obrigatório que ele cobria. */
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
}

const STATUS_CLASSE: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-500',
  analise: 'bg-lp-primary/10 text-lp-primary-dark',
  aprovado: 'bg-lp-green/10 text-lp-green-dark',
  reprovado: 'bg-red-50 text-red-600',
}

const COLETA_LABEL: Record<string, string> = {
  nova: 'Nova coleta',
  aberta: 'Coleta aberta',
  progresso: 'Em progresso',
  recebida: 'Recebida',
  finalizada: 'Finalizada',
}

export function PortalColetas() {
  const { dados } = useOutletContext<ContextoPortal>()

  const [grupo, setGrupo] = useState<ParticipanteGrupo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [inserindo, setInserindo] = useState(false)
  const [versao, setVersao] = useState(0)

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  /* Um parecer do analista muda o progresso desta tela. Sem isto o candidato
     só veria a mudança recarregando a página. */
  useMudancas(['coleta', 'grupo'], recarregar)

  useEffect(() => {
    let cancelado = false
    setErro(null)
    meuGrupo()
      .then((g) => {
        if (!cancelado) setGrupo(g)
      })
      .catch((f: unknown) => {
        if (!cancelado) setErro(f instanceof Error ? f.message : String(f))
      })
    return () => {
      cancelado = true
    }
  }, [versao])

  const resumo = (grupo ?? []).reduce(
    (a, p) => ({
      total: a.total + p.total_documentos,
      aprovados: a.aprovados + p.aprovados,
      analise: a.analise + p.em_analise,
      reprovados: a.reprovados + p.reprovados,
      pendentes: a.pendentes + p.pendentes,
    }),
    { total: 0, aprovados: 0, analise: 0, reprovados: 0, pendentes: 0 },
  )

  return (
    <>
      <Titulo
        apoio={`${dados.processo_seletivo ?? 'ProUni'}${
          dados.chamada ? ` · ${dados.chamada}` : ''
        } · protocolo ${dados.protocolo}`}
      >
        Coletas de documentos
      </Titulo>

      <div className="flex flex-col gap-5">
        {/* ---------------- Prazo e progresso ---------------- */}
        <Cartao>
          {/* O prazo é o da CHAMADA em que a inscrição caiu — foi a data do
              preenchimento que colocou o candidato nela. */}
          {dados.concurso_fim ? (
            <>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-gray-900">
                <CalendarClock className="size-4 shrink-0 text-lp-primary" />
                {dados.concurso ?? 'Chamada'}: {dataBr(dados.concurso_inicio)} a{' '}
                {dataBr(dados.concurso_fim)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {dados.dias_na_chamada && dados.dias_na_chamada > 0 ? (
                  <>
                    Faltam <b className="text-lp-primary">{dados.dias_na_chamada} dias</b> para o
                    encerramento. Depois disso o sistema bloqueia envios e reenvios.
                  </>
                ) : (
                  'O prazo desta chamada está encerrado — envios e reenvios estão bloqueados.'
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Prazo da chamada ainda não definido.</p>
          )}

          <div className="mt-5 border-t border-gray-200 pt-5">
            <Barra {...resumo} />
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Contagem cor="bg-lp-green" n={resumo.aprovados} label="aprovados" />
              <Contagem cor="bg-lp-primary" n={resumo.analise} label="em análise" />
              <Contagem cor="bg-red-500" n={resumo.reprovados} label="reprovados" />
              <Contagem cor="bg-gray-300" n={resumo.pendentes} label="pendentes" />
              <li className="ml-auto text-gray-400">
                {resumo.total} documentos obrigatórios
              </li>
            </ul>
          </div>
        </Cartao>

        {erro && (
          <Cartao className="border-red-200 bg-red-50/40">
            <p className="flex items-center gap-2 text-sm font-bold text-red-700">
              <TriangleAlert className="size-4" /> Não foi possível carregar o grupo
            </p>
            <p className="text-sm text-gray-700">{erro}</p>
            <button
              type="button"
              onClick={recarregar}
              className="mt-1 self-start rounded-md bg-lp-primary px-4 py-2 text-sm font-bold text-white"
            >
              Tentar de novo
            </button>
          </Cartao>
        )}

        <Reprovados grupo={grupo ?? []} />

        {/* O mesmo comando em cima e embaixo: o de baixo é o convite grande, no
            fim da leitura; este é o atalho para quem já sabe o que quer e não
            precisa rolar a lista inteira. */}
        <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-sm text-gray-500">
            <Users className="mt-0.5 size-4 shrink-0 text-lp-primary" />
            <p>
              A documentação é sua e de todos os membros do seu grupo familiar. Insira quem mora com
              você: a lista de documentos de cada um depende da idade, e é você quem anexa a
              documentação de todos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInserindo(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-lp-primary px-3 py-1.5 text-xs font-bold text-lp-primary transition-colors hover:bg-lp-primary/10"
          >
            <UserPlus className="size-4" />
            Inserir familiar
          </button>
        </div>

        {grupo === null && !erro ? (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-500">
            <span
              aria-hidden="true"
              className="size-7 animate-spin rounded-full border-2 border-lp-primary/30 border-t-lp-primary"
            />
            <p className="text-sm">Carregando o grupo…</p>
          </div>
        ) : (
          (grupo ?? []).map((p) => (
            <Participante
              key={p.participante_id}
              p={p}
              aoRemover={async () => {
                if (!p.membro_id) return
                await removerFamiliar(p.membro_id)
                recarregar()
              }}
            />
          ))
        )}

        <button
          type="button"
          onClick={() => setInserindo(true)}
          className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-lp-primary/40 bg-lp-primary/5 px-5 py-5 text-sm font-bold text-lp-primary transition-colors hover:border-lp-primary hover:bg-lp-primary/10"
        >
          <UserPlus className="size-5" />
          Inserir participante do grupo familiar
        </button>

        <p className="text-xs leading-relaxed text-gray-400">
          A análise é feita documento a documento pela Secretaria ProUni no GenDocs. A cada aprovação ou
          recusa você recebe um e-mail em{' '}
          <Link to="/aluno/dados" className="underline">
            {dados.email}
          </Link>
          — inclusive as dos seus familiares.
        </p>
      </div>

      {inserindo && (
        <ModalMembro
          emailTitular={dados.email}
          aoFechar={() => setInserindo(false)}
          aoInserir={() => {
            setInserindo(false)
            recarregar()
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Progresso                                                           */
/* ------------------------------------------------------------------ */

function Barra({
  aprovados, analise, reprovados, total,
}: { aprovados: number; analise: number; reprovados: number; total: number }) {
  const p = (n: number) => `${total ? (n / total) * 100 : 0}%`
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
      <span className="bg-lp-green" style={{ width: p(aprovados) }} />
      <span className="bg-lp-primary" style={{ width: p(analise) }} />
      <span className="bg-red-500" style={{ width: p(reprovados) }} />
    </div>
  )
}

function Contagem({ cor, n, label }: { cor: string; n: number; label: string }) {
  return (
    <li className="flex items-center gap-2 text-gray-600">
      <span className={cn('size-2.5 rounded-full', cor)} />
      <b className="text-gray-900">{n}</b> {label}
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Pendências que exigem reenvio                                       */
/* ------------------------------------------------------------------ */

function Reprovados({ grupo }: { grupo: ParticipanteGrupo[] }) {
  const comReprovado = grupo.filter((p) => p.reprovados > 0)
  if (comReprovado.length === 0) return null

  const total = comReprovado.reduce((n, p) => n + p.reprovados, 0)
  const plural = total > 1

  return (
    <Cartao className="border-red-200 bg-red-50/40">
      <p className="flex items-center gap-2 text-sm font-bold text-red-700">
        <TriangleAlert className="size-4" />
        {total} documento{plural ? 's' : ''} precisa{plural ? 'm' : ''} ser reenviado{plural ? 's' : ''}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {comReprovado.map((p) => (
          <li key={p.participante_id} className="border-l-2 border-red-300 pl-3 text-sm text-gray-900">
            {p.reprovados} item{p.reprovados > 1 ? 'ns' : ''} <span className="text-gray-500">— {p.nome}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-gray-500">
        O motivo de cada recusa aparece no GenDocs, ao lado do campo de reenvio.
      </p>
    </Cartao>
  )
}

/* ------------------------------------------------------------------ */
/* Bloco de uma pessoa do grupo                                        */
/* ------------------------------------------------------------------ */

function Participante({ p, aoRemover }: { p: ParticipanteGrupo; aoRemover: () => Promise<void> }) {
  /* Aberto por padrão: a lista de documentos é o conteúdo desta tela, não um
     detalhe a pedir. Fechado, o candidato via só um número. */
  const [aberto, setAberto] = useState(true)
  const [docs, setDocs] = useState<DocumentoColeta[] | null>(null)
  const [removendo, setRemovendo] = useState(false)

  /* Zerar a lista faz o efeito abaixo buscar de novo: é assim que um parecer
     do analista chega aqui sem recarregar a página. */
  useMudancas(['coleta'], () => setDocs(null))

  useEffect(() => {
    if (!aberto || docs) return
    let cancelado = false
    documentosDe(p.participante_id)
      .then((d) => {
        if (!cancelado) setDocs(d)
      })
      .catch(() => {
        if (!cancelado) setDocs([])
      })
    return () => {
      cancelado = true
    }
  }, [aberto, docs, p.participante_id])

  /* Leva à visão do ALUNO da coleta, que é onde ele anexa — não à tela da
     Secretaria. O participante vai na query porque o familiar tem módulo
     próprio: sem ele a tela abriria a coleta do titular. */
  const linkGenDocs = `/gendocs/coleta/${p.modulo_slug}?participante=${p.participante_id}`

  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 pb-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900">{p.nome}</p>
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {p.titular ? 'Candidato (titular)' : p.parentesco}
            {p.nascimento && ` · ${dataBr(p.nascimento)}`}
            {!p.titular && ` · ${p.maior_de_idade ? 'maior de idade' : 'menor de idade'}`}
          </p>
          <p className="mt-1 text-xs text-gray-400">{p.modulo}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Etiqueta classe="bg-lp-primary/10 text-lp-primary-dark">
            {COLETA_LABEL[p.status_coleta] ?? p.status_coleta}
          </Etiqueta>
          <p className="text-sm text-gray-500">
            {p.aprovados} de {p.total_documentos} obrigatórios
          </p>
          {!p.titular && (
            <button
              type="button"
              disabled={removendo}
              onClick={async () => {
                setRemovendo(true)
                try {
                  await aoRemover()
                } finally {
                  setRemovendo(false)
                }
              }}
              title={`Remover ${p.nome} do grupo familiar`}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 disabled:opacity-40"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {!p.titular && (
        <p className="mb-3 flex items-center gap-1.5 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <Mail className="size-3.5 shrink-0 text-lp-primary" />
          <span>
            Comunicações desta coleta vão para <b className="text-gray-700">{p.email}</b>, o seu e-mail.
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 self-start text-sm font-semibold text-lp-primary"
      >
        <ChevronDown className={cn('size-4 transition-transform', aberto && 'rotate-180')} />
        {aberto ? 'Ocultar' : 'Ver'} os {p.total_documentos} obrigatórios
        {p.opcionais > 0 && ` e ${p.opcionais} opcionais`}
      </button>

      {aberto && (
        <ul className="mt-3 flex flex-col divide-y divide-gray-100 border-y border-gray-100">
          {docs === null ? (
            <li className="py-4 text-center text-sm text-gray-400">Carregando…</li>
          ) : docs.length === 0 ? (
            <li className="py-4 text-center text-sm text-gray-400">Nenhum documento exigido.</li>
          ) : (
            docs.map((d) => (
              <li key={d.sequencia} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    {d.nome}
                    {d.obrigatorio ? (
                      <span className="ml-1 font-bold text-red-500">*</span>
                    ) : (
                      <span className="ml-2 text-xs text-gray-400">(Opcional)</span>
                    )}
                  </p>
                  {d.substitui.length > 0 && (
                    <p className="text-xs text-gray-400">Substitui: {d.substitui.join(' e ')}</p>
                  )}
                  {d.enviado_em && (
                    <p className="text-xs text-gray-400">enviado em {dataBr(d.enviado_em)}</p>
                  )}
                </div>
                <Etiqueta classe={STATUS_CLASSE[d.estado] ?? 'bg-gray-100 text-gray-500'}>
                  {STATUS_LABEL[d.estado] ?? d.estado}
                </Etiqueta>
              </li>
            ))
          )}
        </ul>
      )}

      {aberto && docs && docs.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          <span className="font-bold text-red-500">*</span> obrigatório. Os opcionais só existem
          para substituir um obrigatório — enviar um deles já resolve o item que ele cobre, e não
          é preciso enviar os dois.
        </p>
      )}

      <Link
        to={linkGenDocs}
        className="mt-4 inline-flex items-center justify-center gap-2 self-start rounded-md bg-lp-primary px-5 py-3 text-sm font-bold text-white transition-all hover:bg-lp-primary-dark"
      >
        <GenDocsMark className="h-4 w-6" />
        {p.titular
          ? 'Enviar meus documentos no GenDocs'
          : `Enviar documentos de ${p.nome.split(' ')[0]} no GenDocs`}
        <ExternalLink className="size-4" />
      </Link>
    </Cartao>
  )
}

/* ------------------------------------------------------------------ */
/* Inserir participante do grupo familiar                              */
/* ------------------------------------------------------------------ */

function calcularIdade(iso: string): number {
  const n = new Date(`${iso}T00:00:00`)
  const hoje = new Date()
  let idade = hoje.getFullYear() - n.getFullYear()
  const meses = hoje.getMonth() - n.getMonth()
  if (meses < 0 || (meses === 0 && hoje.getDate() < n.getDate())) idade--
  return idade
}

function ModalMembro({
  emailTitular,
  aoFechar,
  aoInserir,
}: {
  emailTitular: string
  aoFechar: () => void
  aoInserir: () => void
}) {
  const [nome, setNome] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [parentescos, setParentescos] = useState<string[]>([])
  /* Sem resposta até alguém responder: para o menor de idade é isto que
     escolhe entre a lista de RG + CPF e a da certidão de nascimento. */
  const [temIdentificacao, setTemIdentificacao] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregarParentescos().then(setParentescos).catch(() => setParentescos([]))
  }, [])

  const idade = nascimento ? calcularIdade(nascimento) : null
  const idadeOk = idade !== null && idade >= 0 && idade < 120
  const maior = idadeOk && (idade as number) >= 18
  /* A pergunta só muda alguma coisa para o menor de idade: é ela que escolhe
     entre a lista de RG e CPF e a da certidão de nascimento. Do maior o ProUni
     exige identificação de qualquer forma, então perguntar seria decorativo. */
  const perguntaIdentificacao = idadeOk && !maior
  const valido =
    nome.trim().length > 3 &&
    !!parentesco &&
    idadeOk &&
    (!perguntaIdentificacao || temIdentificacao !== null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!valido || salvando) return
    setSalvando(true)
    setErro(null)
    try {
      await inserirFamiliar(nome.trim(), nascimento, parentesco, maior || temIdentificacao === true)
      aoInserir()
    } catch (f: unknown) {
      setErro(f instanceof Error ? f.message : String(f))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={aoFechar}
      role="presentation"
    >
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Inserir participante do grupo familiar"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Inserir participante do grupo familiar</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              Informe quem mora com você. A data de nascimento define a lista de documentos —
              e, para menores de 18 anos, também a resposta sobre RG e CPF.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="mt-5 flex flex-col gap-4" onSubmit={salvar}>
          <Campo label="Nome completo *">
            <Entrada
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome completo do familiar"
              autoFocus
            />
          </Campo>

          <Campo label="Data de nascimento *">
            <Entrada type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
          </Campo>

          {idadeOk && (
            <p className="-mt-2 text-xs text-gray-500">
              {idade} anos —{' '}
              <b className={maior ? 'text-lp-primary' : 'text-lp-green-dark'}>
                {maior ? 'maior de idade' : 'menor de idade'}
              </b>
            </p>
          )}

          <Campo label="Relação de parentesco *">
            <Selecao
              value={parentesco}
              onChange={setParentesco}
              placeholder={parentescos.length ? 'Selecione o parentesco' : 'Carregando…'}
              opcoes={parentescos}
              disabled={parentescos.length === 0}
            />
          </Campo>

          {perguntaIdentificacao && (
            <SimNao
              rotulo="Esta pessoa possui documentos de identificação (RG e CPF)?"
              descricao="É o que define a lista de documentos dela."
              valor={temIdentificacao}
              onChange={setTemIdentificacao}
            />
          )}

          {idadeOk && (maior || temIdentificacao !== null) && (
            <p className="-mt-2 flex items-start gap-1.5 rounded-md bg-lp-green/10 px-3 py-2 text-xs leading-relaxed text-lp-green-dark">
              <Users className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Serão pedidos{' '}
                <b>
                  {maior
                    ? 'RG, CPF, carteira de trabalho e um comprovante de renda'
                    : temIdentificacao
                      ? 'RG e CPF'
                      : 'a certidão de nascimento'}
                </b>
                .{' '}
                {maior
                  ? 'Quem tiver CNH pode enviá-la no lugar do RG e do CPF.'
                  : 'Menor de idade não comprova renda nem vínculo de trabalho.'}
              </span>
            </p>
          )}

          <p className="flex items-start gap-1.5 rounded-md bg-lp-primary/5 px-3 py-2 text-xs leading-relaxed text-gray-600">
            <Mail className="mt-0.5 size-3.5 shrink-0 text-lp-primary" />
            <span>
              A coleta deste familiar será aberta no GenDocs em seu nome, mas todas as comunicações
              vão para <b className="text-gray-800">{emailTitular}</b> — é você quem acompanha o
              processo.
            </span>
          </p>

          {erro && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={aoFechar}
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valido || salvando}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-white transition-all',
                !valido || salvando
                  ? 'cursor-not-allowed bg-lp-primary/40'
                  : 'bg-lp-primary hover:bg-lp-primary-dark',
              )}
            >
              {salvando && (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {salvando ? 'Inserindo…' : 'Inserir participante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
