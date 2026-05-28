/**
 * SEUL fichier autorisé à importer @supabase/supabase-js (login / session Auth phase 1).
 * Interdit : .from(), .rpc() pour données métier — utiliser api-client.ts.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (
  typeof window !== 'undefined' &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  console.warn('NEXT_PUBLIC_SUPABASE_URL / ANON_KEY manquants — auth indisponible');
}

export const authSupabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function getAccessToken(): Promise<string | null> {
  const { data } = await authSupabase.auth.getSession();
  return data.session?.access_token ?? null;
}
