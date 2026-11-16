import { createClient } from '@supabase/supabase-js'

/**
 * Cliente do Supabase para o protótipo.
 *
 * As credenciais vêm de `.env.local` (nunca comitado — ver `.gitignore`).
 * Por enquanto nada em `src/pages` ou `src/data` usa este cliente: os dados
 * continuam fixos em `src/data/*.ts` (regra 3.4 do BRIEFING-IA.md) até a
 * troca ser feita tela por tela.
 */

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltou VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY em .env.local',
  )
}

export const supabase = createClient(url, anonKey)
