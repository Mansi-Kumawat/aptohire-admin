import { createContext, useContext, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, CircleAlert, X } from 'lucide-react';

export function StatusChip({ status }: { status: string }) {
  const kind = status.toLowerCase().replaceAll(' ', '-');
  const icon = ['failed', 'timeout', 'rejected', 'overdue'].includes(kind) ? <CircleAlert size={14} aria-hidden="true" /> : ['approved', 'confirmed', 'succeeded', 'active', 'decided'].includes(kind) ? <Check size={14} aria-hidden="true" /> : null;
  return <span className={`status-chip ${kind}`}>{icon}{status}</span>;
}

export type DropdownOption = { value: string; label: string; disabled?: boolean };

export function DropdownField({ value, options, onChange, ariaLabel, id, className = '' }: {
  value: string; options: DropdownOption[]; onChange: (value: string) => void; ariaLabel: string; id?: string; className?: string;
}) {
  const generatedId = useId(); const baseId = id ?? `select-${generatedId}`;
  const rootRef = useRef<HTMLDivElement>(null); const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false); const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[selectedIndex];
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: PointerEvent): void => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open) requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
  }, [open, activeIndex]);
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
  const choose = (index: number): void => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value); setOpen(false); triggerRef.current?.focus();
  };
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault(); setActiveIndex(selectedIndex); setOpen(true); return;
    }
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); const current = Math.max(0, enabled.indexOf(activeIndex));
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(enabled[(current + step + enabled.length) % enabled.length] ?? selectedIndex); return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); setActiveIndex(event.key === 'Home' ? enabled[0] ?? selectedIndex : enabled.at(-1) ?? selectedIndex); return;
    }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(activeIndex); }
  };
  return <div className={`dropdown-field ${className}`.trim()} ref={rootRef}>
    <button ref={triggerRef} id={baseId} className="select-control" type="button" role="combobox" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${baseId}-options` : undefined} aria-activedescendant={open ? `${baseId}-option-${activeIndex}` : undefined} onClick={() => { if (!open) { setActiveIndex(selectedIndex); setOpen(true); } else setOpen(false); }} onKeyDown={handleKeyDown}>
      <span>{selected?.label ?? 'Choose an option'}</span><ChevronDown className="select-chevron" size={16} aria-hidden="true"/>
    </button>
    {open ? <div id={`${baseId}-options`} className="select-menu" role="listbox" aria-label={ariaLabel}>
      {options.map((option, index) => <button ref={(element) => { optionRefs.current[index] = element; }} id={`${baseId}-option-${index}`} className="select-option" type="button" role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} tabIndex={activeIndex === index ? 0 : -1} disabled={option.disabled} key={option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(index)} onKeyDown={handleKeyDown}>
        <span>{option.label}</span>{option.value === value ? <Check size={16} aria-hidden="true"/> : null}
      </button>)}
    </div> : null}
  </div>;
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
