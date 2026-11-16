import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Megaphone, FolderOpen, Building2, UserRound, ArrowRight, ListChecks, Send,
  UserPlus, FolderPlus, FileCheck2, GraduationCap, Plug,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GlobalBar } from '../components/GlobalBar'
import { listarProcessosSeletivos } from '../lib/erp'
import { cn } from '../lib/cn'

/* ==================================================================
 * Hub — a primeira tela da representação.
 *
 * Ele não explica mais de onde saiu cada réplica nem repete as etapas do
 * processo antigo. O que interessa a quem abre isto é o processo que
 * desenhamos e como andar por ele: o roteiro, e depois cada superfície com os
 * seus atalhos, cada um descrito pelo papel que cumpre no processo.
 * ================================================================== */

/* ------------------------------------------------------------------ */
/* O roteiro                                                           */
/* ------------------------------------------------------------------ */

interface Passo {
  n: number
  icone: LucideIcon
  titulo: string
  onde: string
  desc: string
  /** Sai do nosso controle — é o governo que faz. */
  externo?: boolean
}

const ROTEIRO: Passo[] = [
  {
    n: 1,
    icone: ListChecks,
    titulo: 'O governo divulga a lista',
    onde: 'Sisprouni · MEC',
    desc: 'Os pré-selecionados de cada chamada saem no portal do ProUni. É a única entrada de candidato no processo — ninguém se inscreve por conta própria.',
    externo: true,
  },
  {
    n: 2,
    icone: Send,
    titulo: 'Enviamos a pré-inscrição',
    onde: 'Landing de Pré-inscrição',
    desc: 'O candidato recebe o link e preenche seus dados, as declarações do Sisprouni e os aceites. A data em que ele preenche define a chamada em que entra.',
  },
  {
    n: 3,
    icone: UserPlus,
    titulo: 'O candidato nasce no ERP',
    onde: 'ERP Acadêmico',
    desc: 'A pré-inscrição cria o candidato e a inscrição no concurso da chamada correspondente, com curso, cota e plano. Nada é redigitado.',
  },
  {
    n: 4,
    icone: FolderPlus,
    titulo: 'E entra no GenDocs',
    onde: 'GenDocs',
    desc: 'A combinação das declarações escolhe o módulo de coleta e abre a coleta do titular. Cada familiar inserido abre a sua, no módulo da idade dele.',
  },
  {
    n: 5,
    icone: FileCheck2,
    titulo: 'Documentação coletada e analisada',
    onde: 'Portal do Candidato · GenDocs',
    desc: 'O candidato anexa; a Secretaria defere ou indefere item a item. Indeferido volta para troca — e só o item indeferido pode ser trocado.',
  },
  {
    n: 6,
    icone: GraduationCap,
    titulo: 'Matrícula',
    onde: 'ERP Acadêmico',
    desc: 'Com todas as coletas finalizadas, a ficha libera MATRICULAR. O sistema consulta o WAE e decide entre matrícula nova e alteração da matrícula vigente.',
  },
]

/* ------------------------------------------------------------------ */
/* As superfícies e seus atalhos                                       */
/* ------------------------------------------------------------------ */

interface Atalho {
  label: string
  to: string
  desc: string
}

interface Superficie {
  chave: string
  icone: LucideIcon
  nome: string
  papel: string
  cor: string
  corSuave: string
  quemUsa: string
  resumo: string
  atalhos: Atalho[]
}

/** `psId` é resolvido em tempo de execução — ver `useProcessoSeletivo` abaixo. */
function superficies(psId: string | null): Superficie[] {
  const concursos = psId ? `/erp/processos-seletivos/${psId}/concursos` : '/erp/processos-seletivos'

  return [
    {
      chave: 'lp',
      icone: Megaphone,
      nome: 'Landing de Pré-inscrição',
      papel: 'Passo 2 do roteiro',
      cor: 'text-emerald-600',
      corSuave: 'bg-emerald-50 border-emerald-200',
      quemUsa: 'Candidato pré-selecionado no ProUni',
      resumo:
        'A porta de entrada. Três etapas — dados pessoais, endereço, formação e curso — mais as declarações do Sisprouni e os aceites. Tudo o que o resto do processo usa sai daqui.',
      atalhos: [
        {
          label: 'Abrir a pré-inscrição',
          to: '/lp',
          desc: 'O formulário completo, com a simulação de chamada para demonstrar 1ª, 2ª e lista de espera fora da data.',
        },
        {
          label: 'Contrato de prestação de serviços',
          to: '/contrato',
          desc: 'O contrato que o aceite abre — o documento vigente da UniFatecie, não um resumo.',
        },
      ],
    },
    {
      chave: 'aluno',
      icone: UserRound,
      nome: 'Portal do Candidato',
      papel: 'Passo 5 do roteiro',
      cor: 'text-violet-600',
      corSuave: 'bg-violet-50 border-violet-200',
      quemUsa: 'Candidato, com CPF e data de nascimento',
      resumo:
        'Onde o candidato acompanha a inscrição, vê a chamada em que caiu, monta o grupo familiar e é levado ao envio dos documentos.',
      atalhos: [
        {
          label: 'Entrar',
          to: '/aluno/entrar',
          desc: 'CPF e data de nascimento. A lista de candidatos cadastrados aparece abaixo do formulário, só na representação.',
        },
        {
          label: 'Início',
          to: '/aluno',
          desc: 'Situação da inscrição, protocolo, chamada e o cartão que puxa para as coletas.',
        },
        {
          label: 'Dados cadastrais',
          to: '/aluno/dados',
          desc: 'Tudo o que a pré-inscrição gravou, incluindo as declarações do Sisprouni e o módulo de coleta.',
        },
        {
          label: 'Coletas de documentos',
          to: '/aluno/coletas',
          desc: 'A coleta do titular e a de cada familiar, com o botão de inserir familiar e o estado de cada envio.',
        },
        {
          label: 'Contrato e termos',
          to: '/aluno/termos',
          desc: 'O contrato na íntegra e o que cada declaração feita na inscrição exige de documento.',
        },
      ],
    },
    {
      chave: 'gendocs',
      icone: FolderOpen,
      nome: 'GenDocs',
      papel: 'Passos 4 e 5 do roteiro',
      cor: 'text-[#1c3f73]',
      corSuave: 'bg-[#f0f7ff] border-[#bdd7f5]',
      quemUsa: 'Secretaria ProUni · Candidato pelo link do e-mail',
      resumo:
        'Onde a coleta acontece. Um módulo por combinação de declarações, mais três de grupo familiar; a Secretaria analisa documento a documento e devolve o que estiver errado.',
      atalhos: [
        {
          label: 'Módulos',
          to: '/gendocs',
          desc: 'Os 19 módulos do processo, com participantes e taxa de aprovação de cada um.',
        },
        {
          label: 'Consulta de participantes e coletas',
          to: '/gendocs?aba=participantes',
          desc: 'Todas as pessoas de todos os módulos numa lista só, com busca e filtro pesquisável por coluna.',
        },
        {
          label: 'Documentos e regras de um módulo',
          to: '/gendocs/modulo/prouni/documentos',
          desc: 'A lista documental exigida, com obrigatoriedade, equivalências e SLA de cada item.',
        },
        {
          label: 'Participantes de um módulo',
          to: '/gendocs/modulo/prouni/participantes',
          desc: 'De onde se entra na análise de uma coleta: deferir, indeferir e devolver item a item.',
        },
        {
          label: 'Coleta pelos olhos do candidato',
          to: '/gendocs/coleta/prouni',
          desc: 'A mesma tela que o candidato abre pelo link do e-mail, com o envio e a trava por item.',
        },
      ],
    },
    {
      chave: 'erp',
      icone: Building2,
      nome: 'ERP Acadêmico',
      papel: 'Passos 3 e 6 do roteiro',
      cor: 'text-[#ED8020]',
      corSuave: 'bg-orange-50 border-orange-200',
      quemUsa: 'Secretaria ProUni',
      resumo:
        'Onde o candidato nasce e onde ele vira aluno. O módulo Processos Seletivos guarda o processo, os três concursos das chamadas e a ficha de cada candidato.',
      atalhos: [
        {
          label: 'Candidatos',
          to: '/erp/candidatos',
          desc: 'A lista de inscritos. A ficha de cada um traz as coletas do GenDocs, as filiais e os botões de matricular e negar.',
        },
        {
          label: 'Processos seletivos',
          to: '/erp/processos-seletivos',
          desc: 'O PROUNI 2027, com período letivo, nível de ensino e situação.',
        },
        {
          label: 'Concursos das três chamadas',
          to: concursos,
          desc: '1ª chamada, 2ª chamada e lista de espera. É a janela de cada concurso que decide onde o candidato entra.',
        },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ */

export function Hub() {
  const psId = useProcessoSeletivo()
  const lista = superficies(psId)

  return (
    <div className="min-h-screen bg-slate-50">
      <GlobalBar />

      <div className="mx-auto max-w-[1180px] px-6 py-14 md:px-10">
        <Cabecalho />

        <Roteiro />

        <section className="mb-16">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            As telas, uma a uma
          </h2>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-500">
            Cada bloco é uma superfície do processo, e cada atalho abre uma tela construída. A
            descrição diz o que aquela tela faz <b>dentro do roteiro acima</b> — não o que ela era
            antes.
          </p>

          <div className="flex flex-col gap-5">
            {lista.map((s) => (
              <CartaoSuperficie key={s.chave} s={s} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * O deep link para os concursos precisa do id do processo seletivo, que é um
 * UUID do banco. Guardá-lo escrito aqui já quebrou uma vez: o processo foi
 * recriado e o hub continuou apontando para o antigo. Falhando a consulta, o
 * atalho cai na lista de processos — um clique a mais, e nunca um link morto.
 */
function useProcessoSeletivo(): string | null {
  const [id, setId] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarProcessosSeletivos()
      .then((ps) => {
        if (cancelado) return
        const ativo = ps.find((p) => p.ativo) ?? ps[0]
        if (ativo) setId(ativo.id)
      })
      .catch(() => {
        /* Sem banco o hub continua de pé — só sem os atalhos profundos. */
      })
    return () => { cancelado = true }
  }, [])

  return id
}

function Cabecalho() {
  return (
    <header className="mb-14">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
        Representação de requisitos · UniFatecie
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
        Processo Seletivo <span className="text-[#ED8020]">ProUni</span>
      </h1>

      <div className="mt-5 flex max-w-3xl flex-col gap-4 text-lg leading-relaxed text-slate-600">
        <p>
          Esta representação foi construída para resolver a dor do processo seletivo do ProUni.{' '}
          <b className="text-slate-800">
            O que está aqui é o processo ideal, desenhado sobre os sistemas da Inova
          </b>{' '}
          — e é assim que eles devem se comportar.
        </p>
        <p className="text-base">
          Encaixar este processo nos sistemas exige{' '}
          <b className="text-slate-800">mudar alguns racionais já estabelecidos</b>. São mudanças que
          fazem sentido para o ProUni e que provavelmente fazem sentido para os outros processos —
          graduação e pós-graduação inclusive. Cada uma delas está marcada na tela onde aparece,
          como nota de desenvolvimento.
        </p>
      </div>

      <p className="mt-5 flex max-w-3xl items-start gap-2.5 rounded-xl border border-[#ED8020]/30 bg-orange-50/60 p-4 text-sm leading-relaxed text-slate-700">
        <Plug className="mt-0.5 size-4 shrink-0 text-[#ED8020]" />
        <span>
          <b>As integrações apresentadas são indispensáveis.</b> Sem elas o processo volta a ser
          feito à mão, planilha a planilha — que é exatamente o custo que esta representação existe
          para eliminar.
        </span>
      </p>
    </header>
  )
}

function Roteiro() {
  return (
    <section className="mb-16">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">
        O roteiro do processo
      </h2>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-500">
        Seis passos, do anúncio do governo à matrícula. Só o primeiro está fora das nossas mãos.
      </p>

      <ol className="flex flex-col gap-3">
        {ROTEIRO.map((p) => {
          const Icone = p.icone
          return (
            <li
              key={p.n}
              className={cn(
                'flex gap-4 rounded-2xl border p-5',
                p.externo ? 'border-dashed border-slate-300 bg-white/60' : 'border-slate-200 bg-white',
              )}
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg text-sm font-bold',
                    p.externo ? 'bg-slate-100 text-slate-400' : 'bg-[#ED8020] text-white',
                  )}
                >
                  {p.n}
                </span>
                <Icone className={cn('size-4', p.externo ? 'text-slate-300' : 'text-[#ED8020]')} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <b className="text-base text-slate-900">{p.titulo}</b>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      p.externo ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-[#ED8020]',
                    )}
                  >
                    {p.onde}
                  </span>
                  {p.externo && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      fora do nosso controle
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.desc}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function CartaoSuperficie({ s }: { s: Superficie }) {
  const Icone = s.icone
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl border', s.corSuave)}>
          <Icone className={cn('size-5', s.cor)} />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight text-slate-900">{s.nome}</h3>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {s.papel} · {s.quemUsa}
          </p>
        </div>
      </div>

      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-slate-600">{s.resumo}</p>

      <div className="grid gap-2 md:grid-cols-2">
        {s.atalhos.map((a) => (
          <Link
            key={a.to + a.label}
            to={a.to}
            className="group flex flex-col rounded-xl border border-slate-200 p-3.5 transition-all hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{a.label}</span>
              <ArrowRight className="ml-auto size-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
            </span>
            <span className="mt-1 text-xs leading-relaxed text-slate-500">{a.desc}</span>
          </Link>
        ))}
      </div>
    </article>
  )
}

