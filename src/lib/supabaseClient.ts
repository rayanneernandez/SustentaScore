import { createClient } from '@supabase/supabase-js';

/**
 * Cliente único do Supabase, usado por todo o app (só através do
 * `DataContext` — nenhuma tela deveria importar isto diretamente).
 *
 * As duas variáveis abaixo vêm do arquivo `.env` (veja `.env.example`) —
 * NUNCA comite o `.env` de verdade no git (ele já está no `.gitignore`).
 * A "anon key" é a chave PÚBLICA do projeto, feita para ser usada no
 * navegador — não é a `service_role key` (essa sim é secreta e nunca deve
 * aparecer no código do front-end).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Erro alto e claro no console + na tela (ver DataContext) — melhor do que
  // o app parecer "vazio" sem explicar por quê.
  // eslint-disable-next-line no-console
  console.error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example).',
  );
}

// `createClient` lança exceção se receber URL/chave vazias — por isso usamos um
// placeholder quando não configurado, e deixamos o `DataContext` mostrar um
// aviso claro em vez do app inteiro quebrar com uma tela branca.
export const supabaseConfigurado = Boolean(url && anonKey);

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
);
