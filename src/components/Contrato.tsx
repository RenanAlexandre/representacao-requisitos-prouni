import { Printer } from 'lucide-react'
import {
  CONTRATO, CONTRATO_ADESAO, CONTRATO_FECHO, CONTRATO_IDENTIFICACAO,
  CONTRATO_PREAMBULO, CONTRATO_TITULO,
} from '../data/contrato'

/* ==================================================================
 * O contrato, como documento.
 *
 * Mesmo componente nos dois lugares onde ele precisa aparecer: na página
 * aberta pelo aceite da landing (`/contrato`) e dentro do Portal do Candidato.
 * Um contrato que muda de texto conforme a porta por onde se entra não é um
 * contrato.
 *
 * O documento é sempre exibido EM BRANCO, como o papel que o candidato lê
 * antes de aceitar. Ele é firmado na matrícula: preencher a ficha com os dados
 * de quem está lendo daria a entender que já existe contrato assinado.
 * ================================================================== */

export function DocumentoContrato({
  compacto,
}: {
  /** Dentro do Portal o documento já vive num cartão — dispensa a moldura. */
  compacto?: boolean
}) {
  return (
    <article
      className={
        compacto
          ? 'text-gray-800'
          : 'mx-auto w-full max-w-[820px] rounded-xl border border-gray-200 bg-white p-6 text-gray-800 shadow-sm md:p-12'
      }
    >
      <header className="border-b border-gray-200 pb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-lp-primary">
          Centro Universitário UniFatecie
        </p>
        <h1 className="mt-2 text-balance text-lg font-bold uppercase leading-snug md:text-xl">
          {CONTRATO_TITULO}
        </h1>
      </header>

      <FichaCabecalho />

      <p className="mt-6 text-justify text-sm leading-relaxed">{CONTRATO_PREAMBULO}</p>

      <div className="mt-8 flex flex-col gap-8">
        {CONTRATO.map((secao) => (
          <section key={secao.titulo}>
            <h2 className="border-b border-gray-200 pb-1 text-sm font-bold uppercase tracking-wide text-lp-primary">
              {secao.titulo}
            </h2>

            <div className="mt-4 flex flex-col gap-4">
              {secao.clausulas.map((c) => (
                <div key={c.titulo}>
                  <h3 className="text-sm font-bold text-gray-900">{c.titulo}</h3>
                  <div className="mt-1.5 flex flex-col gap-3">
                    {c.paragrafos.map((p, i) => (
                      <div key={i}>
                        <p className="text-justify text-sm leading-relaxed">
                          {p.rotulo && <b className="mr-1 text-gray-900">{p.rotulo}</b>}
                          {p.texto}
                        </p>
                        {p.itens && (
                          <ul className="mt-2 flex flex-col gap-1.5 pl-4">
                            {p.itens.map((item) => (
                              <li key={item} className="text-justify text-sm leading-relaxed text-gray-700">
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6">
        {CONTRATO_FECHO.map((p) => (
          <p key={p} className="text-justify text-sm leading-relaxed">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-gray-300 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Adesão eletrônica</p>
        <p className="mt-2 text-sm leading-relaxed">{CONTRATO_ADESAO}</p>
      </div>

      <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-xs leading-relaxed text-gray-400">
        BR 376, Km 102, S/N — Saída p/ Loanda · CEP 87.701.970 · Paranavaí — Paraná
        <br />
        Telefone/Fax: (44) 3045-9898 · www.unifatecie.edu.br
      </footer>
    </article>
  )
}

/**
 * O quadro de identificação do papel: curso/RA, dados do aluno e dados do
 * responsável. No documento original são caixas com linhas para preencher, e é
 * assim que ficam aqui — o contrato é lido antes de existir aluno para
 * preenchê-lo.
 */
function FichaCabecalho() {
  const blocos: { titulo: string; campos: readonly string[] }[] = [
    { titulo: 'Contrato', campos: CONTRATO_IDENTIFICACAO.contrato },
    { titulo: 'Identificação do contratante — aluno(a)', campos: CONTRATO_IDENTIFICACAO.aluno },
    {
      titulo: 'Identificação e dados pessoais do responsável pelo(a) aluno(a) (menor de 18 anos e/ou dependente financeiramente)',
      campos: CONTRATO_IDENTIFICACAO.responsavel,
    },
  ]

  return (
    <div className="mt-6 flex flex-col gap-4">
      {blocos.map((b) => (
        <div key={b.titulo} className="overflow-hidden rounded-md border border-gray-300">
          <p className="border-b border-gray-300 bg-gray-50 px-3 py-1.5 text-[11px] font-bold uppercase leading-snug tracking-wide text-gray-600">
            {b.titulo}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 sm:grid-cols-3">
            {b.campos.map((campo) => (
              <div key={campo} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wide text-gray-400">{campo}</dt>
                <dd className="mt-1 h-4 border-b border-dotted border-gray-300" />
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

/**
 * Botão de impressão. É por ele que sai o PDF: o navegador imprime a página em
 * arquivo, e o CSS de impressão (em `index.css`) tira barra, botões e sombras.
 */
export function BotaoImprimirContrato({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-md border border-lp-primary px-4 py-2 text-sm font-semibold text-lp-primary transition-colors hover:bg-lp-primary hover:text-white'
      }
    >
      <Printer className="size-4" />
      Imprimir ou salvar em PDF
    </button>
  )
}
