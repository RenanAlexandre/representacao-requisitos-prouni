import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ChevronDown, FlaskConical, TriangleAlert, UserRound } from 'lucide-react'
import { GlobalBar } from '../../components/GlobalBar'
import { Campo, Entrada } from '../../components/lp/ui'
import { mascaraCpf, apenasDigitos } from '../../data/lp'
import {
  dataBr, dataHoraBr, entrar, lerSessao, mascararCpf, usuariosDemo, type UsuarioDemo,
} from '../../lib/api'
import { cn } from '../../lib/cn'

/**
 * Entrada no Portal do Candidato.
 *
 * Usuário é o CPF, senha é a data de nascimento — o par combinado com o
 * usuário e registrado em `supabase/README.md`, junto da ressalva de que ele é
 * fraco para dado sensível.
 */
export function PortalEntrar() {
  const navegar = useNavigate()
  const [cpf, setCpf] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  const valido = apenasDigitos(cpf).length === 11 && !!nascimento

  /* Quem já tem sessão viva não precisa passar por aqui de novo. Redireciona
     por componente, não por efeito colateral no meio da renderização. */
  if (lerSessao()) return <Navigate to="/aluno" replace />

  async function submeter(e: React.FormEvent) {
    e.preventDefault()
    if (!valido || entrando) return
    setEntrando(true)
    setErro(null)
    try {
      await entrar(cpf, nascimento)
      navegar('/aluno', { replace: true })
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : String(falha))
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-lp">
      <GlobalBar />

      <div className="hidden md:fixed md:left-0 md:top-10 md:flex md:h-[calc(100vh-2.5rem)]">
        <div className="w-16 bg-lp-primary" />
      </div>
      <div className="fixed left-0 right-0 top-10 z-10 h-3 bg-lp-primary md:hidden" />

      <main className="flex flex-1 items-center justify-center px-4 py-12 md:pl-16">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-lp-primary/10 text-lp-primary">
              <UserRound className="size-7" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portal do Candidato</h1>
              <p className="mt-1 text-sm text-gray-500">
                Entre com o CPF e a data de nascimento que você informou na inscrição.
              </p>
            </div>
          </div>

          <form
            onSubmit={submeter}
            className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-3xl border border-gray-300 bg-white p-6 shadow"
          >
            <Campo label="CPF *">
              <Entrada
                value={cpf}
                onChange={(e) => setCpf(mascaraCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoFocus
              />
            </Campo>

            <Campo label="Data de nascimento *">
              <Entrada
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
              />
            </Campo>

            {erro && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!valido || entrando}
              className={cn(
                'mt-1 inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-bold text-white transition-all',
                !valido || entrando
                  ? 'cursor-not-allowed bg-lp-primary/40'
                  : 'bg-lp-primary hover:bg-lp-primary-dark',
              )}
            >
              {entrando && (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Ainda não se inscreveu?{' '}
            <Link to="/lp" className="font-semibold text-lp-primary underline">
              Fazer a inscrição
            </Link>
          </p>

          <UsuariosDaDemonstracao
            aoEscolher={(u) => {
              setCpf(mascaraCpf(u.cpf))
              setNascimento(u.nascimento.slice(0, 10))
              setErro(null)
            }}
          />
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs font-medium text-lp-primary md:pl-16 md:text-sm">
        © 2026 UniFatecie · Todos os direitos reservados
      </footer>
    </div>
  )
}

/* ==================================================================
 * ANDAIME DE DEMONSTRAÇÃO — não vai para o produto final
 *
 * Lista os candidatos já cadastrados com CPF e data de nascimento,
 * que são justamente o usuário e a senha do portal. Serve para entrar
 * rápido durante os testes sem precisar anotar credencial.
 *
 * Para remover: apague este componente, a chamada acima e derrube a
 * função `demo_usuarios()` no banco (ver supabase/05-ajustes-lp-e-demo.sql).
 * ================================================================== */

function UsuariosDaDemonstracao({ aoEscolher }: { aoEscolher: (u: UsuarioDemo) => void }) {
  const [lista, setLista] = useState<UsuarioDemo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState(true)
  const [versao, setVersao] = useState(0)

  /* Recarrega ao montar e sempre que a janela volta ao foco — assim um
     cadastro feito noutra aba aparece aqui sem recarregar a página. */
  useEffect(() => {
    let cancelado = false
    usuariosDemo()
      .then((u) => { if (!cancelado) setLista(u) })
      .catch((f: unknown) => { if (!cancelado) setErro(f instanceof Error ? f.message : String(f)) })
    return () => { cancelado = true }
  }, [versao])

  useEffect(() => {
    const recarregar = () => setVersao((v) => v + 1)
    window.addEventListener('focus', recarregar)
    return () => window.removeEventListener('focus', recarregar)
  }, [])

  return (
    <section className="mt-8 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
            <FlaskConical className="size-3.5 shrink-0" />
            Somente na representação
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            Candidatos já cadastrados pela landing page. Clique num deles para preencher o
            formulário. <b>Esta lista não existe no produto final</b> — ela mostra credenciais.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 rounded-md p-1 text-amber-700 transition-colors hover:bg-amber-100"
          aria-label={aberto ? 'Recolher' : 'Expandir'}
        >
          <ChevronDown className={cn('size-4 transition-transform', !aberto && '-rotate-90')} />
        </button>
      </div>

      {aberto && (
        <div className="mt-3">
          {erro ? (
            <p className="text-xs text-red-700">Falha ao carregar: {erro}</p>
          ) : lista === null ? (
            <p className="text-xs text-amber-900/70">Carregando…</p>
          ) : lista.length === 0 ? (
            <p className="text-xs text-amber-900/70">
              Nenhum candidato ainda.{' '}
              <Link to="/lp" className="underline">
                Faça uma inscrição
              </Link>{' '}
              para o primeiro aparecer aqui.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-1 text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-amber-700/80">
                    <th className="px-2 py-1 font-semibold">Nome</th>
                    <th className="px-2 py-1 font-semibold">CPF (usuário)</th>
                    <th className="px-2 py-1 font-semibold">Nascimento (senha)</th>
                    <th className="px-2 py-1 font-semibold">Cota</th>
                    <th className="px-2 py-1 font-semibold">Enc. matrícula</th>
                    <th className="px-2 py-1 font-semibold">Enc. benefício</th>
                    <th className="px-2 py-1 font-semibold">Professor</th>
                    <th className="min-w-[200px] px-2 py-1 font-semibold md:min-w-[300px] xl:min-w-[420px]">
                      Módulo
                    </th>
                    <th className="px-2 py-1 font-semibold">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => aoEscolher(u)}
                      title={`Usar ${u.nome} · ${u.protocolo}`}
                      className="cursor-pointer bg-white/70 transition-colors hover:bg-white"
                    >
                      <td className="rounded-l-md px-2 py-1.5 font-medium text-gray-800">{u.nome}</td>
                      <td className="px-2 py-1.5 font-mono text-gray-700">{mascararCpf(u.cpf)}</td>
                      <td className="px-2 py-1.5 font-mono text-gray-700">{dataBr(u.nascimento)}</td>
                      <SimNaoCelula valor={u.cota} />
                      <SimNaoCelula valor={u.encerra_matricula} />
                      <SimNaoCelula valor={u.encerra_beneficio} />
                      <SimNaoCelula valor={u.professor} />
                      <td className="min-w-[200px] px-2 py-1.5 leading-snug text-gray-600 md:min-w-[300px] xl:min-w-[420px]">
                        {u.modulo ?? '--'}
                      </td>
                      <td className="rounded-r-md px-2 py-1.5 text-gray-500">{dataHoraBr(u.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Célula Sim/Não das quatro declarações do Sisprouni. São elas que decidem em
 * qual dos 16 módulos do GenDocs o candidato cai, então ver as quatro juntas é
 * o que torna esta tabela útil para testar.
 */
function SimNaoCelula({ valor }: { valor: boolean }) {
  return (
    <td className="px-2 py-1.5">
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-bold',
          valor ? 'bg-lp-green/15 text-lp-green-dark' : 'bg-gray-200 text-gray-600',
        )}
      >
        {valor ? 'Sim' : 'Não'}
      </span>
    </td>
  )
}
