import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';
import type { Backend } from '../../../backend/src/domain/types';
import { createBackend } from '../../../backend/src/index';
import { env } from '../config/env';

type AuthUser = { id: string; email: string; name?: string };
type BackendContextValue = { backend: Backend | null; ready: boolean };
type AuthContextValue = { user: AuthUser | null; setUser: (user: AuthUser | null) => void; signOut: () => Promise<void> };
const BackendContext = createContext<BackendContextValue>({ backend: null, ready: false });
const AuthContext = createContext<AuthContextValue>({ user: null, setUser: () => undefined, signOut: async () => undefined });
const storedUserSchema = z.object({ id: z.string().min(1).max(200), email: z.string().email(), name: z.string().max(200).optional() }).strict();
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: true } } });

export function Providers({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [backendInitError, setBackendInitError] = useState(false);
  const [backendAttempt, setBackendAttempt] = useState(0);
  const [user, setUserState] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem('aptohire-admin-session');
      if (!raw) return null;
      const parsed = storedUserSchema.safeParse(JSON.parse(raw) as unknown);
      return parsed.success ? parsed.data : null;
    } catch { return null; }
  });
  useEffect(() => {
    let live = true;
    void createBackend().then((instance) => { if (live) { setBackend(instance); setBackendInitError(false); } }).catch(() => { if (live) setBackendInitError(true); });
    return () => { live = false; };
  }, [backendAttempt]);
  const setUser = useCallback((next: AuthUser | null): void => {
    setUserState(next);
    try { if (next) sessionStorage.setItem('aptohire-admin-session', JSON.stringify(next)); else sessionStorage.removeItem('aptohire-admin-session'); } catch { /* session persistence is optional */ }
  }, []);
  const signOut = useCallback(async (): Promise<void> => {
    try { await backend?.auth.signOut(); } catch { /* Always clear the local admin gate; remote sign-out is retried by the next auth flow. */ }
    finally { setUser(null); queryClient.clear(); }
  }, [backend, setUser]);
  const authValue = useMemo(() => ({ user, setUser, signOut }), [user, setUser, signOut]);
  if (!backend) return backendInitError
    ? <main className="wrong-role"><section className="wrong-role-box" role="alert"><h1>Workspace setup failed.</h1><p className="muted">Check the environment configuration, then try again. No secrets or server details are shown.</p><button className="button button-primary" onClick={() => { setBackendInitError(false); setBackendAttempt((value) => value + 1); }}>Try again</button></section></main>
    : <div className="startup-screen" role="status">Preparing the secure workspace…</div>;
  return <QueryClientProvider client={queryClient}><BackendContext.Provider value={{ backend, ready: true }}><AuthContext.Provider value={authValue}>{children}<SessionIdleTimeout /></AuthContext.Provider></BackendContext.Provider></QueryClientProvider>;
}

export function useBackend(): Backend {
  const value = useContext(BackendContext);
  if (!value.backend) throw new Error('Backend is not ready.');
  return value.backend;
}
export function useAuth(): AuthContextValue { return useContext(AuthContext); }

function SessionIdleTimeout() {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false); const warningRef = useRef(false); const resetRef = useRef<() => void>(() => undefined);
  const setWarning = useCallback((value: boolean): void => { warningRef.current = value; setShowWarning(value); }, []);
  useEffect(() => {
    if (!user) return undefined;
    const warnMs = Math.max(60_000, (env.VITE_IDLE_TIMEOUT_MINUTES - 2) * 60_000);
    const endMs = env.VITE_IDLE_TIMEOUT_MINUTES * 60_000;
    let warnTimer = window.setTimeout(() => setWarning(true), warnMs);
    let endTimer = window.setTimeout(() => { void signOut(); setWarning(false); }, endMs);
    const reset = (): void => {
      window.clearTimeout(warnTimer); window.clearTimeout(endTimer); setWarning(false);
      warnTimer = window.setTimeout(() => setWarning(true), warnMs);
      endTimer = window.setTimeout(() => { void signOut(); setWarning(false); }, endMs);
    };
    resetRef.current = reset;
    const activity = (event: Event): void => {
      if (warningRef.current && event.target instanceof Element && event.target.closest('.dialog')) return;
      reset();
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    return () => { window.clearTimeout(warnTimer); window.clearTimeout(endTimer); resetRef.current = () => undefined; events.forEach((event) => window.removeEventListener(event, activity)); };
  }, [user, signOut, setWarning]);
  if (!showWarning) return null;
  return <IdleTimeoutWarning onStaySignedIn={() => resetRef.current()} onSignOut={() => { void signOut(); }} />;
}

export function IdleTimeoutWarning({ onStaySignedIn, onSignOut }: { onStaySignedIn: () => void; onSignOut: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const items = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])')) : [];
    const first = items[0]; const last = items.at(-1);
    first?.focus();
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const active = document.activeElement;
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (active === first || !dialog.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="dialog-backdrop" role="presentation"><section className="dialog" ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-description"><h2 id="idle-title">You'll be signed out in 2 minutes</h2><p id="idle-description">Stay signed in to keep working securely.</p><div className="dialog-actions"><button className="button button-secondary" onClick={onStaySignedIn}>Stay signed in</button><button className="button button-danger" onClick={onSignOut}>Sign out now</button></div></section></div>;
}
