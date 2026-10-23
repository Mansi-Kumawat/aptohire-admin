import { env } from '../../frontend/src/config/env';
import type { Backend } from './domain/types';

export async function createBackend(): Promise<Backend> {
  // The literal branch lets a production build with VITE_USE_MOCKS=false tree-shake the mock adapter.
  const mockFlag = import.meta.env.VITE_USE_MOCKS;
  const useMocks = mockFlag === 'true' || (!import.meta.env.PROD && mockFlag === undefined && env.VITE_USE_MOCKS);
  if (useMocks) {
    const { MockBackend } = await import('./adapters/mock');
    return new MockBackend();
  }
  const [{ SupabaseBackend }, { getSupabaseClient }] = await Promise.all([
    import('./adapters/supabase'), import('./adapters/supabaseClient'),
  ]);
  const client = getSupabaseClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  return new SupabaseBackend(client);
}
