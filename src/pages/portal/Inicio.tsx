import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowRight, CalendarClock, CheckCircle2, FileText, IdCard, Upload } from 'lucide-react'
import { GenDocsMark } from '../../components/GenDocsMark'
import { Cartao } from '../../components/portal/ui'
import { cn } from '../../lib/cn'
import { dataBr, meuGrupo, type ParticipanteGrupo } from '../../lib/api'
import { useMudancas } from '../../lib/tempo-real'
import type { ContextoPortal } from '../../layouts/PortalLayout'

/**
 * Início do Portal do Candidato — um hub com um card por item do menu.
 *
 * Serve de porta de entrada: quem acabou de chegar da inscrição vê num relance
 * o que existe no portal e para onde ir primeiro.
 */

interface Atalho {
  to: string
  titulo: string
  icone: ComponentType<{ className?: string }>
  descricao: string
  acao: string
  /* Um card, e só um, sai do tom dos outros. A coleta é a única coisa desta
     tela que tem prazo e que depende de o candidato AGIR — os outros dois são
     leitura. Destacar os três seria não destacar nenhum. */
  destaque?: boolean
}

const ATALHOS: Atalho[] = [
  {
    to: '/aluno/dados',
    titulo: 'Dados cadastrais',
    icone: IdCard,
    descricao:
      'Tudo o que você preencheu na inscrição: identificação, naturalidade, contato, endereço, formação e o curso pretendido. Confira se está correto — é esse cadastro que segue para a matrícula.',
    acao: 'Conferir meus dados',
  },
  {
    to: '/aluno/coletas',
    titulo: 'Coletas de documentos',
    icone: GenDocsMark,
    descricao:
      'Acompanhe a análise documento a documento, veja o que ainda falta e monte o seu grupo familiar. O envio dos arquivos acontece no GenDocs: há uma coleta separada por pessoa, e você pode preencher todas elas.',
    acao: 'Ver o que falta enviar',
    destaque: true,
  },
  {
    to: '/aluno/termos',
    titulo: 'Contrato e termos',
    icone: FileText,
    descricao:
      'O contrato de prestação de serviços na íntegra, o que cada declaração que você fez exige de documento e o termo que habilita o envio final.',
    acao: 'Ler o contrato',
  },
]

/** O quanto da documentação já entrou — obrigatórios do grupo inteiro. */
interface Progresso {
  total: number
  aprovados: number
  faltando: number
}

/**
 * A etiqueta que puxa o olho para o card da coleta.
 *
 * Fica montada na borda de cima do card, meio dentro meio fora — o mesmo
 * recurso de um selo em envelope. O ponto pulsante é o único movimento da
 * tela, e some para quem pediu menos animação no sistema.
 */
function Etiqueta({ feito }: { feito: boolean }) {
  if (feito) {
    return (
      <span className="absolute -top-3 left-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-lp-green px-3 py-1 text-xs font-bold text-white shadow-sm">
        <CheckCircle2 className="size-3.5" />
        Documentação enviada
      </span>
    )
  }
  return (
    <span className="absolute -top-3 left-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-lp-primary px-3 py-1 text-xs font-bold text-white shadow-sm">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-white/70 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-white" />
      </span>
      <Upload className="size-3.5" />
      Insira os documentos aqui
    </span>
  )
}

/** Quanto da documentação obrigatória do grupo já entrou. */
function Progresso({ progresso }: { progresso: Progresso }) {
  const { total, aprovados, faltando } = progresso
  const pct = total > 0 ? Math.round((aprovados / total) * 100) : 0

  return (
    <div className="mt-4 flex flex-col gap-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', faltando === 0 ? 'bg-lp-green' : 'bg-lp-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {faltando > 0 ? (
          <>
            <b className="text-gray-800">{faltando}</b> de {total} documentos obrigatórios ainda
            faltam
          </>
        ) : (
          <>Os {total} documentos obrigatórios já foram enviados</>
        )}
      </p>
    </div>
  )
}

export function PortalInicio() {
  const { dados } = useOutletContext<ContextoPortal>()
  const primeiroNome = dados.nome.split(' ')[0]

  /* O card de coletas mostra o número real do que falta, não só um convite.
     Vem daqui porque o `dados` do layout não carrega a contagem do grupo. */
  const [grupo, setGrupo] = useState<ParticipanteGrupo[] | null>(null)
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  useMudancas(['coleta', 'grupo'], recarregar)

  useEffect(() => {
    let cancelado = false
    meuGrupo()
      .then((g) => { if (!cancelado) setGrupo(g) })
      .catch(() => { if (!cancelado) setGrupo(null) })
    return () => { cancelado = true }
  }, [versao])

  const progresso: Progresso | null =
    grupo && grupo.length > 0
      ? grupo.reduce<Progresso>(
          (a, p) => ({
            total: a.total + p.total_documentos,
            aprovados: a.aprovados + p.aprovados,
            faltando: a.faltando + p.pendentes + p.reprovados,
          }),
          { total: 0, aprovados: 0, faltando: 0 },
        )
      : null

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Olá, {primeiroNome}</h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-relaxed text-gray-500">
          <span>
            Sua inscrição {dados.processo_seletivo && <>em <b className="text-gray-700">{dados.processo_seletivo}</b> </>}
            foi recebida em {dataBr(dados.inscrito_em)}, sob o protocolo{' '}
            <b className="text-lp-primary">{dados.protocolo}</b>.
          </span>
          {dados.chamada && (
            <span className="rounded-full bg-lp-primary px-2.5 py-0.5 text-xs font-bold text-white">
              {dados.chamada}
            </span>
          )}
        </p>
      </header>

      {/* A janela é a da CHAMADA em que o candidato caiu, não a do processo
          inteiro: a data em que ele preencheu é que o colocou aqui. */}
      {dados.concurso_fim && (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-lp-primary/5 px-4 py-3 text-sm text-gray-600">
          <CalendarClock className="size-4 shrink-0 text-lp-primary" />
          <span>
            {dados.concurso ?? 'Chamada'}:{' '}
            <b className="text-gray-800">{dataBr(dados.concurso_inicio)}</b> a{' '}
            <b className="text-gray-800">{dataBr(dados.concurso_fim)}</b>.
          </span>
          <span className="text-gray-400">
            {dados.dias_na_chamada && dados.dias_na_chamada > 0
              ? `Faltam ${dados.dias_na_chamada} dias para o encerramento.`
              : 'Chamada encerrada.'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {ATALHOS.map((a) => {
          const Icone = a.icone
          const feito = !!a.destaque && progresso != null && progresso.faltando === 0
          return (
            <Link key={a.to} to={a.to} className="group/card relative block">
              {a.destaque && <Etiqueta feito={feito} />}

              <Cartao
                className={cn(
                  'flex h-full flex-col transition-all group-hover/card:-translate-y-0.5 group-hover/card:shadow-md',
                  a.destaque
                    ? 'border-lp-primary/50 shadow-md ring-1 ring-lp-primary/25 group-hover/card:ring-lp-primary/50'
                    : 'group-hover/card:border-lp-primary',
                )}
              >
                <span
                  className={cn(
                    'mb-4 flex size-12 items-center justify-center rounded-2xl',
                    a.destaque
                      ? 'bg-lp-primary text-white shadow-sm'
                      : 'bg-lp-primary/10 text-lp-primary',
                  )}
                >
                  <Icone className="h-6 w-7" />
                </span>

                <h2 className="text-base font-bold text-gray-900">{a.titulo}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">{a.descricao}</p>

                {a.destaque && progresso && <Progresso progresso={progresso} />}

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-lp-primary">
                  {a.acao}
                  <ArrowRight className="size-4 transition-transform group-hover/card:translate-x-0.5" />
                </span>
              </Cartao>
            </Link>
          )
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-gray-400">
        O menu à esquerda abre ao passar o mouse. Clique no seu nome, no topo dele, para voltar a esta tela.
      </p>
    </>
  )
}
