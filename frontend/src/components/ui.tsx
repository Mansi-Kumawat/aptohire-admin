import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, CircleAlert, X } from 'lucide-react';

export function StatusChip({ status }: { status: string }) {
  const kind = status.toLowerCase().replaceAll(' ', '-');
  const icon = ['failed', 'timeout', 'rejected', 'overdue'].includes(kind) ? <CircleAlert size={14} aria-hidden="true" /> : ['approved', 'confirmed', 'succeeded', 'active', 'decided'].includes(kind) ? <Check size={14} aria-hidden="true" /> : null;
  return <span className={`status-chip ${kind}`}>{icon}{status}</span>;
}

export function Modal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const titleElement = dialog?.querySelector<HTMLElement>('#dialog-title'); titleElement?.focus();
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { closeRef.current(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
        .filter((item) => !item.closest('[hidden],[aria-hidden="true"]'));
      const first = items[0]; const last = items.at(-1);
      if (!first || !last) { event.preventDefault(); titleElement?.focus(); return; }
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === titleElement || !dialog.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || active === titleElement || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}><section className="dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="icon-button" style={{ float: 'right' }} aria-label="Close dialog" onClick={onClose}><X size={19} /></button><h2 id="dialog-title" tabIndex={-1}>{title}</h2>{children}{footer ? <div className="dialog-actions">{footer}</div> : null}</section></div>;
}

type ToastItem = { text: string; id: number };
const ToastContext = createContext<(text: string) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const show = (text: string): void => { const id = Date.now(); setToast({ text, id }); window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 4000); };
  return <ToastContext.Provider value={show}>{children}{toast ? <div className="toast" role="status" aria-live="polite">{toast.text}</div> : null}</ToastContext.Provider>;
}
export function useToast(): (text: string) => void { return useContext(ToastContext); }

export function ConfirmForm({ title, consequence, action, onCancel, onConfirm, requiredWord, needsReason, reasonMin = 0 }: {
  title: string; consequence: string; action: string; onCancel: () => void; onConfirm: (reason?: string) => void; requiredWord?: string; needsReason?: boolean; reasonMin?: number;
}) {
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const canConfirm = (!requiredWord || typed === requiredWord) && (!needsReason || reason.trim().length >= reasonMin);
  const submit = (event: FormEvent): void => { event.preventDefault(); if (canConfirm) onConfirm(needsReason ? reason : undefined); };
  return <Modal title={title} onClose={onCancel} footer={<><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className={`button ${action === 'Reject' || action === 'Pause AI' || action === 'Reset' ? 'button-danger' : 'button-primary'}`} disabled={!canConfirm} onClick={() => canConfirm && onConfirm(needsReason ? reason : undefined)}>{action}</button></>}>
    <p>{consequence}</p>
    {needsReason ? <form onSubmit={submit}><div className="field"><label htmlFor="action-reason">Reason</label><textarea className="textarea" id="action-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={reasonMin} maxLength={600} placeholder="Write a clear note" aria-describedby="reason-help"/><span className="field-hint" id="reason-help">At least {reasonMin} characters. This note may be shown to the applicant.</span></div></form> : null}
    {requiredWord ? <div className="field"><label htmlFor="typed-confirm">Type <span className="mono">{requiredWord}</span> to continue</label><input className="input" id="typed-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" /></div> : null}
  </Modal>;
}
