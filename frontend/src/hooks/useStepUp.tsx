import { useRef, useState } from 'react';
import { useBackend } from '../app/providers';
import { Modal } from '../components/ui';

type PendingAction = { run: () => void };

export function useStepUp() {
  const backend = useBackend();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const pendingRef = useRef<PendingAction | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requireStepUp = (run: () => void): void => { const action = { run }; pendingRef.current = action; setCode(''); setError(''); setPending(action); };
  const cancel = (): void => { pendingRef.current = null; setPending(null); setCode(''); setError(''); };
  const verify = async (): Promise<void> => {
    if (!pending || code.length !== 6 || busy) return;
    setBusy(true);
    try {
      await backend.auth.verifyMfa(code);
      if (pendingRef.current !== pending) return;
      const action = pending.run;
      pendingRef.current = null; setPending(null); setCode(''); setError('');
      action();
    } catch {
      if (pendingRef.current === pending) { setCode(''); setError('The code could not be verified. Check your authenticator and try again.'); }
    } finally { setBusy(false); }
  };
  const modal = pending ? <Modal title="Confirm sensitive action" onClose={cancel} footer={<><button className="button button-secondary" onClick={cancel} disabled={busy}>Cancel</button><button className="button button-primary" disabled={code.length !== 6 || busy} onClick={() => void verify()}>{busy ? 'Verifying…' : 'Verify and continue'}</button></>}><p>Enter a fresh six-digit authenticator code to authorize this action.</p><div className="field"><label htmlFor="step-up-code">Authenticator code (step-up)</label><input id="step-up-code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(event) => { if (event.key === 'Enter' && code.length === 6) { event.preventDefault(); void verify(); } }}/>{error ? <span className="field-hint" role="alert">{error}</span> : null}</div></Modal> : null;
  return { requireStepUp, modal };
}
