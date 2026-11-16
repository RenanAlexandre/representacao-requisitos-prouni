import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { GlobalBar } from '../components/GlobalBar'
import { BotaoImprimirContrato, DocumentoContrato } from '../components/Contrato'

/**
 * O contrato aberto pelo aceite da landing page.
 *
 * Fica fora do Portal de propósito: quem está preenchendo a inscrição ainda
 * não é candidato e não tem login. O aceite mandava para `/aluno/termos`, uma
 * área logada com um texto que não era o contrato — duas coisas erradas de uma
 * vez.
 */
export function PaginaContrato() {
  return (
    <div className="min-h-screen bg-gray-50 font-lp">
      <GlobalBar />

      <div className="mx-auto w-full max-w-[900px] px-4 py-8 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/lp"
            className="inline-flex items-center gap-2 text-sm font-semibold text-lp-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Voltar para a inscrição
          </Link>
          <BotaoImprimirContrato />
        </div>

        <DocumentoContrato />
      </div>
    </div>
  )
}
