import { supabase } from './supabaseClient'

/**
 * Listas de domínio da landing page, agora vindas do Supabase em vez de
 * `src/data/lp.ts` (regra 3.4 do BRIEFING-IA.md: dados fixos só até o banco
 * existir). As seis tabelas (`cursos`, `racas`, `escolaridades`,
 * `planos_pagamento`) são as únicas com leitura liberada pro `anon` — ver
 * seção 7/13 do briefing.
 *
 * `cursos` chega do banco só com o nome: a planilha da oferta do ProUni não
 * traz código e-MEC, e inventar um número pareceria verdadeiro. O nome é
 * único e é o que a inscrição manda de volta.
 */

export interface RacaOpcao {
  nome: string
  /** Caracteriza cota PPI — obrigatória a Declaração de Raça e Cor. */
  ppi: boolean
}

export interface CursoOpcao {
  nome: string
  /**
   * Licenciatura — Pedagogia incluída, que é uma delas. O ProUni só admite
   * candidato com diploma superior na condição de professor da rede pública,
   * e só para licenciatura; é este campo que encurta a lista da landing
   * quando essa escolaridade é escolhida.
   */
  licenciatura: boolean
}

export interface DadosDominioLanding {
  racas: RacaOpcao[]
  escolaridades: string[]
  cursos: CursoOpcao[]
  planosPagamento: string[]
}

/** Opções do menu suspenso de parentesco, no modal de inserir familiar do Portal. */
export async function carregarParentescos(): Promise<string[]> {
  const { data, error } = await supabase.from('parentescos').select('nome').order('ordem')
  if (error) throw new Error(`Falha ao carregar parentescos: ${error.message}`)
  return (data ?? []).map((p) => p.nome as string)
}

export async function carregarDominioLanding(): Promise<DadosDominioLanding> {
  const [racas, escolaridades, cursos, planos] = await Promise.all([
    supabase.from('racas').select('nome, ppi').order('ordem'),
    supabase.from('escolaridades').select('nome').eq('ativo', true).order('ordem'),
    /* A oferta do ProUni são 83 cursos, e a planilha da oferta não traz
       código e-MEC para quase nenhum — o nome é o identificador. Ordenado por
       nome porque é assim que a pessoa procura numa lista desse tamanho. */
    supabase.from('cursos').select('nome, tipo_formacao').eq('ativo', true).order('nome'),
    supabase.from('planos_pagamento').select('nome').eq('ativo', true).order('ordem'),
  ])

  // Falha em qualquer uma das seis consultas invalida a listagem inteira —
  // um formulário com metade das opções faltando é pior do que uma tela de
  // erro clara.
  const erro = racas.error ?? escolaridades.error ?? cursos.error ?? planos.error
  if (erro) throw new Error(`Falha ao carregar dados do banco: ${erro.message}`)

  return {
    racas: (racas.data ?? []).map((r) => ({ nome: r.nome as string, ppi: r.ppi as boolean })),
    escolaridades: (escolaridades.data ?? []).map((e) => e.nome as string),
    cursos: (cursos.data ?? []).map((c) => ({
      nome: c.nome as string,
      licenciatura: (c.tipo_formacao as string) === 'Licenciatura',
    })),
    planosPagamento: (planos.data ?? []).map((p) => p.nome as string),
  }
}
