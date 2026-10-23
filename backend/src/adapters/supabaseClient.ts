import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
export function getSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) throw new Error('Add the Supabase URL and public anon key to the environment file.');
    client = createClient(url, anonKey, {
      auth: { storageKey: 'aptohire-admin', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
  }
  return client;
}
