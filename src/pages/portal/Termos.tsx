import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  BadgeCheck, ChevronDown, FileSignature, FileCheck2, ShieldCheck, Check, Minus, MessageSquare,
} from 'lucide-react'
import { Titulo, Cartao, Etiqueta } from '../../components/portal/ui'
import { BotaoImprimirContrato, DocumentoContrato } from '../../components/Contrato'
import { CONTRATO_TITULO } from '../../data/contrato'
import { TERMO_COTA } from '../../data/lp'
import { DECLARACOES_SISPROUNI, montarClausulas, TERMO_ACEITE } from '../../data/portal'
import { dataBr, dataHoraBr, type MeusDados } from '../../lib/api'
import { cn } from '../../lib/cn'
import type { ContextoPortal } from '../../layouts/PortalLayout'

/* ==================================================================
 * Contrato e termos.
 *
 * A página inteira mudou de eixo. Ela abria com um termo que NÓS redigimos a
 * partir do documento de requisitos — servia para explicar o processo e não
 * era o contrato que o candidato aceitou na inscrição. Agora o documento é o
 * contrato de verdade da UniFatecie, e o resto da página existe para dizer o
 * que o candidato assinou junto dele.
 *
 * A ordem responde à pergunta que o candidato traz: primeiro o que EU
 * declarei (e o que cada declaração vai me custar em documento), depois o
 * contrato inteiro, depois as regras da coleta.
 * ================================================================== */

export function PortalTermos() {
  const { dados } = useOutletContext<ContextoPortal>()
  const clausulas = montarClausulas(dataBr(dados.envio_inicio), dataBr(dados.envio_fim))

  return (
    <>
      <Titulo
        apoio={`Aplicáveis à inscrição ${dados.protocolo}${dados.processo_seletivo ? ` — ${dados.processo_seletivo}` : ''}.`}
      >
        Contrato e termos
      </Titulo>

      <div className="flex flex-col gap-5">
        <MinhasDeclaracoes dados={dados} />

        <CartaoContrato dados={dados} />

        <TermoDeResponsabilidade />

        <TermoDeCota dados={dados} />

        <AutorizacaoDeContato dados={dados} />

        <Cartao>
          <p className="text-sm font-bold uppercase tracking-wide text-lp-primary">
            Como funciona a coleta de documentos
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            As regras abaixo são as do processo que você está vivendo agora — prazo, análise,
            reenvio e o que acontece quando tudo é aprovado.
          </p>

          <div className="mt-5 flex flex-col gap-7">
            {clausulas.map((c) => (
              <article key={c.titulo}>
                <h2 className="text-sm font-bold text-gray-900">{c.titulo}</h2>
                <div className="mt-2 flex flex-col gap-2">
                  {c.paragrafos.map((p) => (
                    <p key={p} className="text-sm leading-relaxed text-gray-700">
                      {p}
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400">{c.fonte}</p>
              </article>
            ))}
          </div>
        </Cartao>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* O que este candidato declarou                                       */
/* ------------------------------------------------------------------ */

/**
 * As declarações do Sisprouni, com o estado real desta inscrição.
 *
 * É a parte que o candidato mais procura aqui: cada "Sim" que ele deu na
 * inscrição virou documento obrigatório na coleta dele, e essa ligação não
 * estava dita em lugar nenhum. Quem respondeu "Não" continua vendo o item —
 * apagado — porque saber o que NÃO se aplica também evita anexo à toa.
 */
function MinhasDeclaracoes({ dados }: { dados: MeusDados }) {
  const respostas: { chave: keyof typeof DECLARACOES_SISPROUNI; valor: boolean; em: string | null }[] = [
    { chave: 'cota', valor: dados.aceite_cota, em: dados.aceite_cota_em },
    { chave: 'matricula', valor: dados.declara_encerramento_matricula, em: null },
    { chave: 'beneficio', valor: dados.declara_encerramento_beneficio, em: null },
    { chave: 'professor', valor: dados.declara_professor_rede_publica, em: null },
  ]
  const quantas = respostas.filter((r) => r.valor).length

  return (
    <Cartao className="border-lp-primary/30 bg-lp-primary/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lp-primary">
            <FileCheck2 className="size-4" />
            O que você declarou na inscrição
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            Cada &quot;Sim&quot; aqui acrescentou um documento obrigatório à sua coleta. Foram{' '}
            <b className="text-gray-800">{quantas} de {respostas.length}</b>.
          </p>
        </div>
        <Etiqueta classe="bg-lp-primary/10 text-lp-primary-dark">
          Módulo {dados.modulo_coleta ?? 'a definir'}
        </Etiqueta>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {respostas.map(({ chave, valor, em }) => {
          const d = DECLARACOES_SISPROUNI[chave]
          return (
            <div
              key={chave}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                valor ? 'border-lp-primary/40 bg-white' : 'border-gray-200 bg-white/50',
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                    valor ? 'bg-lp-green text-white' : 'bg-gray-200 text-gray-500',
                  )}
                >
                  {valor ? <Check className="size-3" /> : <Minus className="size-3" />}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', valor ? 'text-gray-900' : 'text-gray-500')}>
                    {d.titulo}
                    <span className="ml-2 text-xs font-bold uppercase tracking-wide">
                      {valor ? (
                        <span className="text-lp-green-dark">Sim</span>
                      ) : (
                        <span className="text-gray-400">Não</span>
                      )}
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{d.significa}</p>

                  {valor && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">
                      <b className="text-gray-900">Documento que isto exige:</b> {d.documento}
                    </p>
                  )}
                  {valor && em && (
                    <p className="mt-1 text-xs text-gray-400">Declarado em {dataHoraBr(em)}.</p>
                  )}
                  {!valor && (
                    <p className="mt-1 text-xs text-gray-400">
                      Não se aplica a você — nada a anexar por este item.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Declarou algo por engano? Fale com a Secretaria ProUni antes de enviar a documentação: a
        combinação destas respostas é o que define a sua lista de documentos, e trocá-la depois do
        envio significa refazer a coleta.
      </p>
    </Cartao>
  )
}

/* ------------------------------------------------------------------ */
/* O contrato                                                          */
/* ------------------------------------------------------------------ */

/**
 * O contrato inteiro, recolhido por padrão.
 *
 * São doze páginas: aberto de saída, empurraria todo o resto da página para
 * fora da tela. Recolhido, o candidato vê o que importa de imediato — que
 * aceitou, quando aceitou, e como imprimir — e abre quando quer ler.
 */
function CartaoContrato({ dados }: { dados: MeusDados }) {
  const [aberto, setAberto] = useState(false)

  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lp-primary">
            <FileSignature className="size-4" />
            Contrato de prestação de serviços educacionais
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            {CONTRATO_TITULO}. É o contrato que você aceitou ao marcar a caixa na inscrição, e o
            mesmo que rege a sua matrícula depois que a documentação for aprovada.
          </p>
        </div>
        <Etiqueta
          classe={
            dados.aceite_contrato
              ? 'bg-lp-green/15 text-lp-green-dark'
              : 'bg-amber-100 text-amber-700'
          }
        >
          {dados.aceite_contrato ? 'Aceito' : 'Pendente'}
        </Etiqueta>
      </div>

      {dados.aceite_contrato_em && (
        <p className="mt-2 text-xs text-gray-500">
          Aceite eletrônico registrado em <b>{dataHoraBr(dados.aceite_contrato_em)}</b>, com a
          inscrição {dados.protocolo}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md bg-lp-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-lp-primary-dark"
        >
          <ChevronDown className={cn('size-4 transition-transform', aberto && 'rotate-180')} />
          {aberto ? 'Recolher o contrato' : 'Ler o contrato na íntegra'}
        </button>
        <BotaoImprimirContrato />
      </div>

      {aberto && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <DocumentoContrato compacto />
        </div>
      )}
    </Cartao>
  )
}

/* ------------------------------------------------------------------ */
/* Termos que valem no envio da documentação                           */
/* ------------------------------------------------------------------ */

function TermoDeResponsabilidade() {
  return (
    <Cartao>
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lp-primary">
        <ShieldCheck className="size-4" />
        Termo de responsabilidade pelos documentos
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
        Este é o enunciado que você marca no GenDocs antes do envio final. Enquanto ele não for
        marcado, o botão de envio permanece bloqueado.
      </p>
      <blockquote className="mt-4 border-l-2 border-lp-primary pl-4 text-base italic leading-relaxed text-gray-800">
        “{TERMO_ACEITE}”
      </blockquote>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Ao marcá-lo você assume duas coisas: que os arquivos enviados são seus e verdadeiros, e que
        autoriza a matrícula assim que a Secretaria aprovar a documentação — não há um segundo
        &quot;confirmo&quot; depois da aprovação.
      </p>
    </Cartao>
  )
}

/**
 * O aceite de contato. Pequeno, mas é um aceite que demos ao candidato e que
 * não estava explicado em lugar nenhum — ele autoriza mensagem no celular
 * pessoal, e merece dizer para quê.
 */
function AutorizacaoDeContato({ dados }: { dados: MeusDados }) {
  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lp-primary">
          <MessageSquare className="size-4" />
          Autorização de contato
        </p>
        <Etiqueta
          classe={dados.aceite_contato ? 'bg-lp-green/15 text-lp-green-dark' : 'bg-gray-100 text-gray-500'}
        >
          {dados.aceite_contato ? 'Autorizado' : 'Não autorizado'}
        </Etiqueta>
      </div>

      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
        {dados.aceite_contato
          ? 'Você autorizou a UniFatecie a enviar comunicados deste processo seletivo por SMS, WhatsApp e e-mail.'
          : 'Você não autorizou contato por SMS e WhatsApp. As comunicações obrigatórias do processo continuam sendo enviadas por e-mail, para ' +
            dados.email +
            ' — é por ele que chegam o link da coleta e os avisos de documento recusado.'}
      </p>

      {dados.aceite_contato_em && (
        <p className="mt-2 text-xs text-gray-500">
          Autorização registrada em <b>{dataHoraBr(dados.aceite_contato_em)}</b>.
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Os dados informados são usados na condução deste processo seletivo, na análise documental e
        na eventual matrícula, e trafegam entre os sistemas que executam essas etapas.
      </p>
    </Cartao>
  )
}

function TermoDeCota({ dados }: { dados: MeusDados }) {
  return (
    <Cartao>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-lp-primary">
          <BadgeCheck className="size-4" />
          {TERMO_COTA.titulo}
        </p>
        <Etiqueta
          classe={dados.aceite_cota ? 'bg-lp-green/15 text-lp-green-dark' : 'bg-gray-100 text-gray-500'}
        >
          {dados.aceite_cota ? 'Você se declarou cotista' : 'Não se aplica'}
        </Etiqueta>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{TERMO_COTA.abertura}</p>

      <div className="mt-4 flex flex-col gap-4">
        {TERMO_COTA.clausulas.map((c) => (
          <article key={c.titulo}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{c.titulo}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{c.texto}</p>
          </article>
        ))}
      </div>

      <blockquote className="mt-4 border-l-2 border-lp-primary pl-4 text-sm italic leading-relaxed text-gray-800">
        “{TERMO_COTA.declaracao}”
      </blockquote>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        Sua inscrição está registrada como{' '}
        <b className="text-gray-700">{dados.cota ?? 'não informada'}</b>
        {dados.aceite_cota
          ? ' e você se declarou cotista.'
          : ' — você não se declarou cotista, então este termo não se aplica à sua coleta.'}
      </p>
    </Cartao>
  )
}
