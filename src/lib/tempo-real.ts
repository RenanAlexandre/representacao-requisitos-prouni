import { useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

/* ==================================================================
 * Tempo real — uma tela muda, as outras acompanham.
 *
 * O protótipo tem cinco superfícies olhando para os mesmos dados: o
 * analista defere um documento no GenDocs e aquilo precisa aparecer na
 * coleta do aluno, no Portal do Candidato e no ERP sem ninguém apertar F5.
 *
 * COMO FUNCIONA
 * Todo escritor (`src/lib/api.ts`) avisa o que mexeu; todo leitor assina os
 * assuntos que lhe interessam e recarrega. O aviso viaja por um canal de
 * BROADCAST do Supabase Realtime — mensagem de cliente para cliente, sem
 * depender de replicação de tabela nem de política de leitura direta. É a
 * escolha certa aqui porque o app inteiro escreve por RPC `security definer`:
 * o `anon` não tem SELECT nas tabelas, então `postgres_changes` não entregaria
 * nada a ele.
 *
 * O limite honesto: uma escrita feita FORA deste app (direto no SQL editor
 * do Supabase, por exemplo) não gera aviso. Para uma demonstração é o que
 * basta; para produção, o gatilho no banco tomaria o lugar deste `avisar`.
 * ================================================================== */

export type Assunto =
  | 'coleta'      // documentos, pareceres, envio e finalização
  | 'grupo'       // participantes do grupo familiar
  | 'candidato'   // ficha do candidato / inscrição
  | 'config'      // chave da IA e afins

const NOME_CANAL = 'prouni-prototipo'
const EVENTO = 'mudou'

const ouvintes = new Set<(a: Assunto) => void>()

function disparar(assunto: Assunto) {
  /* Cópia antes de percorrer: um ouvinte pode se desinscrever durante o aviso
     (desmontagem de componente), e alterar o Set em iteração perde avisos. */
  for (const ouvir of [...ouvintes]) ouvir(assunto)
}

const canal = supabase.channel(NOME_CANAL, {
  /* `self: false` porque quem escreveu já foi avisado localmente por
     `disparar` — o eco só duplicaria a busca. */
  config: { broadcast: { self: false } },
})

canal.on('broadcast', { event: EVENTO }, ({ payload }) => {
  const assunto = (payload as { assunto?: Assunto } | null)?.assunto
  if (assunto) disparar(assunto)
})

const conectado = new Promise<void>((resolve) => {
  canal.subscribe((status) => {
    if (status === 'SUBSCRIBED') resolve()
  })
})

/**
 * Avisa que algo mudou. As telas desta aba são notificadas na hora; as das
 * outras abas e das outras máquinas, pelo canal.
 *
 * Nunca lança: se o Realtime estiver fora do ar, o protótipo continua
 * funcionando exatamente como antes — só volta a exigir recarregar a página.
 */
export function avisarMudanca(...assuntos: Assunto[]) {
  for (const a of assuntos) disparar(a)
  void conectado
    .then(() =>
      Promise.all(
        assuntos.map((assunto) =>
          canal.send({ type: 'broadcast', event: EVENTO, payload: { assunto } }),
        ),
      ),
    )
    .catch(() => {})
}

/**
 * Assina os assuntos e chama `aoMudar` quando um deles se mexe.
 *
 * `aoMudar` é lido de uma ref, então não precisa ser estável: passar uma
 * função nova a cada render não reassina o canal nem cria laço.
 */
export function useMudancas(assuntos: Assunto[], aoMudar: () => void) {
  const ref = useRef(aoMudar)
  ref.current = aoMudar

  /* Assinatura por string: `['coleta']` é um array novo a cada render e faria
     o efeito rodar sempre; o conteúdo é o que importa. */
  const chave = assuntos.join(',')

  useEffect(() => {
    const quais = new Set(chave.split(',') as Assunto[])
    const ouvir = (a: Assunto) => {
      if (quais.has(a)) ref.current()
    }
    ouvintes.add(ouvir)
    return () => {
      ouvintes.delete(ouvir)
    }
  }, [chave])
}
