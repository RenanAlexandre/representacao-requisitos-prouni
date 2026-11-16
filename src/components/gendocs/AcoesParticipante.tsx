import { useEffect, useState } from 'react'
import { FaRegEnvelope, FaLink, FaRegPenToSquare, FaRegTrashCan } from 'react-icons/fa6'
import { GdField, GdIconButton, GdInput, GdModal } from './ui'
import {
  analiseParticipante, editarParticipante, excluirColeta, type AnaliseParticipante,
} from '../../lib/api'
import { cn } from '../../lib/cn'

/* ==================================================================
 * Os quatro botões de ação de um participante.
 *
 * Aparecem em três lugares — a lista de participantes do módulo, a consulta
 * geral de coletas e o cabeçalho da tela de análise — e são os mesmos quatro,
 * na mesma ordem, nos três. Ficam aqui para não divergirem: um comportamento,
 * três chamadas.
 *
 * O que cada um faz:
 *   1. envelope — reenviar o e-mail da coleta. NÃO demonstrado no protótipo:
 *      nada aqui dispara e-mail, e um botão que finge enviar mente. Fica
 *      visível e inerte, com o motivo no title.
 *   2. link     — abre a tela de coleta do participante, como ele a vê. É
 *      prévia: somente leitura (ver `supabase/14-previa-da-coleta.sql`).
 *   3. lápis    — edita nome, e-mail e três observações do analista.
 *   4. lixeira  — exclui a coleta e o participante junto.
 * ================================================================== */

export interface AlvoDasAcoes {
  participanteId: string
  nome: string
  email: string
  moduloSlug: string
  modulo?: string
}

export function AcoesParticipante({
  alvo,
  variante = 'linha',
  aoMudar,
  aoExcluir,
}: {
  alvo: AlvoDasAcoes
  /** `redondo` é o do cabeçalho da análise; `linha` é o das tabelas. */
  variante?: 'redondo' | 'linha'
  aoMudar?: () => void
  aoExcluir?: () => void
}) {
  const [editando, setEditando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const linkPrevia = `/gendocs/coleta/${alvo.moduloSlug}?participante=${alvo.participanteId}`

  const redondo =
    'flex size-10 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-gd-gray-50 p-0 text-gd-blue transition-all hover:bg-gd-blue-50 [&_svg]:size-[1.125rem]'

  /* Nas tabelas o clique não pode subir para a linha, que navega. */
  const conter = (e: React.MouseEvent) => e.stopPropagation()

  const botoes =
    variante === 'redondo' ? (
      <div className="flex w-fit items-center gap-3 transition-all" onClick={conter}>
        <button
          type="button"
          disabled
          title="Reenviar e-mail da coleta — não demonstrado no protótipo"
          className={cn(redondo, 'cursor-not-allowed opacity-40 hover:bg-gd-gray-50')}
        >
          <FaRegEnvelope />
        </button>
        <a
          href={linkPrevia}
          target="_blank"
          rel="noreferrer"
          title="Abrir a coleta como o participante a vê"
          className={redondo}
        >
          <FaLink />
        </a>
        <button type="button" onClick={() => setEditando(true)} title="Editar participante" className={redondo}>
          <FaRegPenToSquare />
        </button>
        <button
          type="button"
          onClick={() => setExcluindo(true)}
          title="Excluir coleta"
          className={cn(redondo, 'text-gd-red hover:bg-red-50')}
        >
          <FaRegTrashCan />
        </button>
      </div>
    ) : (
      <div className="flex w-full items-center gap-2 transition-all" onClick={conter}>
        <GdIconButton
          disabled
          title="Reenviar e-mail da coleta — não demonstrado no protótipo"
          className="cursor-not-allowed opacity-40"
        >
          <FaRegEnvelope />
        </GdIconButton>
        <a
          href={linkPrevia}
          target="_blank"
          rel="noreferrer"
          title="Abrir a coleta como o participante a vê"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-gd-gray-100 bg-gd-gray-50 text-gd-blue transition-all hover:bg-gd-white-blue [&_svg]:size-[1.125rem]"
        >
          <FaLink />
        </a>
        <GdIconButton title="Editar participante" onClick={() => setEditando(true)}>
          <FaRegPenToSquare />
        </GdIconButton>
        <GdIconButton title="Excluir coleta" onClick={() => setExcluindo(true)}>
          <FaRegTrashCan />
        </GdIconButton>
      </div>
    )

  return (
    <>
      {botoes}
      <ModalEditar
        aberto={editando}
        alvo={alvo}
        onFechar={() => setEditando(false)}
        onSalvo={() => { setEditando(false); aoMudar?.() }}
      />
      <ModalExcluir
        aberto={excluindo}
        alvo={alvo}
        onFechar={() => setExcluindo(false)}
        onExcluido={() => { setExcluindo(false); aoExcluir?.(); aoMudar?.() }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Edição                                                              */
/* ------------------------------------------------------------------ */

function ModalEditar({
  aberto, alvo, onFechar, onSalvo,
}: { aberto: boolean; alvo: AlvoDasAcoes; onFechar: () => void; onSalvo: () => void }) {
  const [nome, setNome] = useState(alvo.nome)
  const [email, setEmail] = useState(alvo.email)
  const [obs, setObs] = useState<[string, string, string]>(['', '', ''])
  const [ficha, setFicha] = useState<AnaliseParticipante | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  /* As observações não vêm nas listas — são buscadas ao abrir, para o modal
     mostrar o que está gravado em vez de campos vazios que apagariam tudo
     ao salvar. */
  useEffect(() => {
    if (!aberto) return
    let cancelado = false
    setNome(alvo.nome)
    setEmail(alvo.email)
    setObs(['', '', ''])
    setFicha(null)
    setFalha(null)
    analiseParticipante(alvo.participanteId)
      .then((f) => {
        if (cancelado || !f) return
        setFicha(f)
        setNome(f.nome)
        setEmail(f.email)
        setObs([f.observacao_1 ?? '', f.observacao_2 ?? '', f.observacao_3 ?? ''])
      })
      .catch(() => { /* sem a ficha, o modal ainda edita nome e e-mail */ })
    return () => { cancelado = true }
  }, [aberto, alvo])

  async function salvar() {
    setSalvando(true)
    setFalha(null)
    try {
      await editarParticipante(alvo.participanteId, nome, email, obs)
      onSalvo()
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <GdModal aberto={aberto} onFechar={onFechar} titulo="Editar participante" largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        <GdField label="Nome do Participante">
          <GdInput value={nome} onChange={(e) => setNome(e.target.value)} />
        </GdField>
        <GdField label="E-mail">
          <GdInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </GdField>

        {ficha && !ficha.titular && (
          <p className="rounded-md bg-gd-blue-10 px-3 py-2 text-xs text-gd-blue">
            Este é um familiar do titular. O e-mail aqui é o de quem recebe as comunicações da
            coleta — hoje, o do titular.
          </p>
        )}

        {([0, 1, 2] as const).map((i) => (
          <GdField key={i} label={`Observação ${i + 1}`}>
            <GdInput
              value={obs[i]}
              placeholder="Anotação do analista"
              onChange={(e) => {
                const novo = [...obs] as [string, string, string]
                novo[i] = e.target.value
                setObs(novo)
              }}
            />
          </GdField>
        ))}

        {falha && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-gd-red">{falha}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="h-10 rounded-md bg-gd-blue px-5 text-sm font-bold text-white shadow transition-colors hover:bg-gd-blue-100 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </GdModal>
  )
}

/* ------------------------------------------------------------------ */
/* Exclusão                                                            */
/* ------------------------------------------------------------------ */

function ModalExcluir({
  aberto, alvo, onFechar, onExcluido,
}: { aberto: boolean; alvo: AlvoDasAcoes; onFechar: () => void; onExcluido: () => void }) {
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => { if (aberto) setFalha(null) }, [aberto])

  async function excluir() {
    setOcupado(true)
    setFalha(null)
    try {
      await excluirColeta(alvo.participanteId)
      onExcluido()
    } catch (f: unknown) {
      setFalha(f instanceof Error ? f.message : String(f))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <GdModal aberto={aberto} onFechar={onFechar} titulo="Excluir coleta">
      <div className="flex flex-col gap-4">
        <p className="text-gd-gray-400">
          Excluir a coleta de <b className="text-gd-blue-200">{alvo.nome}</b>
          {alvo.modulo && <> no módulo <b>{alvo.modulo}</b></>}? Os documentos já enviados por essa
          pessoa saem junto, e não há como desfazer.
        </p>

        {falha && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-gd-red">{falha}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <BotaoSecundario onClick={onFechar}>Cancelar</BotaoSecundario>
          <button
            type="button"
            onClick={excluir}
            disabled={ocupado}
            className="h-10 rounded-md bg-gd-red px-5 text-sm font-bold text-white shadow transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {ocupado ? 'Excluindo…' : 'Excluir coleta'}
          </button>
        </div>
      </div>
    </GdModal>
  )
}

function BotaoSecundario({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-md border-2 border-gd-gray-100 px-5 text-sm font-bold text-gd-gray-400 transition-colors hover:bg-gd-gray-50"
    >
      {children}
    </button>
  )
}
