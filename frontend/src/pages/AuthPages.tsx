import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Check, Copy, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth, useBackend } from '../app/providers';
import { portalUrl } from '../config/links';
import { demoFeaturesEnabled, isProductionBuild, mocksEnabled } from '../config/flags';
import { useToast } from '../components/ui';
import { BrandLogo } from '../components/BrandLogo';

export function LoginPage() {
  const backend = useBackend(); const { user, setUser } = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [passwordVisible, setPasswordVisible] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace/>;
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault(); setBusy(true); setError('');
    try { const signedIn = await backend.auth.signIn(email.trim(), password); const profile = await backend.auth.profile(signedIn.id); setUser({ ...signedIn, name: profile.name }); navigate('/dashboard'); }
    catch { setError('Email or password is incorrect.'); }
    finally { setBusy(false); }
  };
  const signInDemo = async (): Promise<void> => { setEmail('admin@demo.aptohire.test'); if (mocksEnabled) { setBusy(true); setError(''); try { const signedIn = await backend.auth.signIn('admin@demo.aptohire.test', 'mock-only'); const profile = await backend.auth.profile(signedIn.id); setUser({ ...signedIn, name: profile.name }); navigate('/dashboard'); } catch { setError('Email or password is incorrect.'); } finally { setBusy(false); } } };
  return <div className="login-layout"><aside className="login-aside"><Link className="brand auth-brand" to="/login"><BrandLogo/><span className="brand-sub">Admin</span></Link><div className="login-aside-body"><div className="brand-mark" style={{ width: 48, height: 48, fontSize: 24, borderRadius: 15 }} aria-hidden="true"><ShieldCheck size={25}/></div><h1>Proof you can see.</h1><p>A calmer, clearer workspace for decisions that deserve a human in the loop.</p><div className="auth-trust-pills"><span><Check size={13}/> Evidence first</span><span><ShieldCheck size={13}/> Human reviewed</span></div><div className="auth-workflow-card" aria-label="Secure review workflow"><div className="auth-workflow-top"><span className="auth-workflow-symbol"><ShieldCheck size={16}/></span><span>Built for confident decisions</span><span className="auth-workflow-status"><i/> Protected</span></div><div className="auth-workflow-rail" aria-hidden="true"><i/><i/><i/></div><div className="auth-workflow-steps"><span><b>01</b> Sign in</span><span><b>02</b> Verify role</span><span><b>03</b> Confirm MFA</span></div><div className="auth-workflow-foot"><span><Check size={13}/> Private by default</span><span><Check size={13}/> Human in control</span></div></div></div><span className="small login-aside-foot"><ShieldCheck size={14}/> Admin access is protected by two-step verification.</span></aside><main className="login-main"><form className="login-form" onSubmit={(event) => void submit(event)}><div className="signin-kicker"><span className="signin-kicker-icon"><ShieldCheck size={15}/></span><span>STAFF WORKSPACE</span><i/><span className="signin-kicker-secure">Secure access</span></div><h2>Welcome back</h2><p className="muted">Sign in with your staff account to continue.</p><div className="field"><label htmlFor="login-email">Email</label><input className="input" id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)}/></div><div className="field password-field"><label htmlFor="login-password">Password</label><div className="password-control"><input className="input" id="login-password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}/><button className="password-toggle" type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>{error ? <p role="alert" className="field-hint" style={{ color: 'var(--danger-600)' }}>{error}</p> : null}<button className="button button-primary" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17}/></button><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}><Link to="/forgot-password">Forgot password?</Link></div>
      {demoFeaturesEnabled && !isProductionBuild ? <div className="demo-panel"><strong>Demo account</strong><p className="small muted" style={{ margin: '5px 0 12px' }}>Fictional admin account. Two-step verification is still required.</p><button className="button button-secondary" type="button" onClick={() => void signInDemo()}>{mocksEnabled ? 'Continue with demo account' : 'Use demo email'} </button><p className="field-hint" style={{ margin: '10px 0 0' }}>Mock mode only · MFA code: 123456</p></div> : null}
      <p className="field-hint" style={{ marginTop: 24 }}>This console has no public account creation.</p></form></main></div>;
}

export function AccessGate() {
  const { user } = useAuth(); const location = useLocation(); const backend = useBackend();
  const profile = useQuery({ queryKey: ['profile', user?.id], queryFn: () => backend.auth.profile(user?.id ?? ''), enabled: Boolean(user) });
  const isAdmin = profile.data?.role === 'admin';
  const mfa = useQuery({ queryKey: ['mfa-status', user?.id], queryFn: () => backend.auth.mfaStatus(), enabled: isAdmin });
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
  if (profile.isLoading || (isAdmin && mfa.isLoading)) return <div className="startup-screen" role="status">Checking your access…</div>;
  if (profile.isError) return <AccessError />;
  if (profile.data?.role !== 'admin') return <WrongRole role={profile.data?.role}/>;
  if (mfa.isError || !mfa.data) return <AccessError />;
  const onSetup = location.pathname === '/mfa/setup'; const onVerify = location.pathname === '/mfa/verify';
  if (mfa.data === 'needs-enroll' && !onSetup) return <Navigate to="/mfa/setup" replace/>;
  if (mfa.data === 'needs-challenge' && !onVerify) return <Navigate to="/mfa/verify" replace/>;
  if (mfa.data === 'ready' && (onSetup || onVerify)) return <Navigate to="/dashboard" replace/>;
  return <Outlet/>;
}

function WrongRole({ role }: { role?: 'admin' | 'student' | 'university' | 'organization' }) {
  const { signOut } = useAuth(); const portal = role && role !== 'admin' ? portalUrl(role, '/') : null;
  return <><Helmet><title>Access denied · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet><div className="wrong-role"><section className="wrong-role-box"><div className="brand-mark" style={{ marginBottom: 18 }}><LockKeyhole size={17}/></div><h1>This account can't use the admin site.</h1><p className="muted">Sign in with an AptoHire staff account to continue.</p><div className="action-row">{portal ? <a className="button button-primary" href={portal}>Go to your portal</a> : null}<button className="button button-secondary" onClick={() => void signOut()}>Sign out</button></div></section></div></>;
}
function AccessError() { const { signOut } = useAuth(); return <><Helmet><title>Access check · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet><div className="wrong-role"><section className="wrong-role-box"><h1>We couldn't verify access.</h1><p className="muted">Sign out and try again. If the problem continues, contact support.</p><button className="button button-secondary" onClick={() => void signOut()}>Sign out</button></section></div></>; }

export function MfaSetupPage() {
  const backend = useBackend(); const client = useQueryClient(); const navigate = useNavigate(); const toast = useToast();
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [enrolling, setEnrolling] = useState(false); const [qr, setQr] = useState<{ qrCode: string; secret: string } | null>(null);
  const enrollmentRequest = useRef<Promise<{ qrCode: string; secret: string }> | null>(null);
  useEffect(() => {
    let live = true;
    enrollmentRequest.current ??= backend.auth.beginMfaEnrollment();
    void enrollmentRequest.current.then((result) => { if (live) setQr(result); }).catch(() => { if (live) setError('We couldn’t start authenticator setup. Try again.'); });
    return () => { live = false; };
  }, [backend]);
  const verify = async (event?: FormEvent, candidate = code): Promise<void> => { event?.preventDefault(); if (candidate.length !== 6 || enrolling) return; setEnrolling(true); setError(''); try { await backend.auth.verifyMfa(candidate); await client.invalidateQueries({ queryKey: ['mfa-status'] }); toast('Two-step verification is ready.'); navigate('/dashboard', { replace: true }); } catch { setError('That code didn’t work. Check the code and try again.'); setCode(''); } finally { setEnrolling(false); } };
  const copy = async (): Promise<void> => { if (qr) { await navigator.clipboard?.writeText(qr.secret); toast('Secret copied. Store it somewhere safe.'); } };
  return <main className="mfa-layout"><section className="mfa-card"><div className="brand auth-brand"><BrandLogo/><span className="brand-sub">Admin</span></div><h1 style={{ marginTop: 26 }}>Set up two-step verification</h1><p className="muted">Scan this QR code with your authenticator app, then enter its six-digit code.</p><div className="qr-wrap">{qr ? <img src={qr.qrCode} alt="Authenticator setup QR code"/> : <span className="field-hint">Loading QR code…</span>}</div>{qr ? <><div className="field-hint">If you can’t scan the code, enter this secret manually:</div><div className="secret-box" style={{ margin: '8px 0' }}>{qr.secret}<button className="row-action" onClick={() => void copy()} aria-label="Copy authenticator secret"><Copy size={15}/></button></div></> : null}<div className="notice">Two-step verification is required for admin accounts. If you lose your authenticator, another admin must reset it. Save the secret somewhere safe.</div><form onSubmit={(event) => void verify(event)}><div className="field"><label htmlFor="enrol-code">Six-digit code</label><input className="input" id="enrol-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { const next = event.target.value.replace(/\D/g, '').slice(0, 6); setCode(next); if (next.length === 6) void verify(undefined, next); }}/></div>{error ? <p role="alert" className="field-hint" style={{ color: 'var(--danger-600)' }}>{error}</p> : null}<button className="button button-primary" type="submit" style={{ width: '100%' }} disabled={code.length !== 6 || enrolling}>{enrolling ? 'Verifying…' : 'Verify and continue'}</button></form></section></main>;
}

export function MfaVerifyPage() {
  const backend = useBackend(); const client = useQueryClient(); const navigate = useNavigate(); const { signOut } = useAuth();
  const [code, setCode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const verify = async (nextCode: string): Promise<void> => { if (nextCode.length !== 6 || busy) return; setBusy(true); setError(''); try { await backend.auth.verifyMfa(nextCode); await client.invalidateQueries({ queryKey: ['mfa-status'] }); navigate('/dashboard', { replace: true }); } catch { setError('That code didn’t work. Try again in a moment.'); setCode(''); } finally { setBusy(false); } };
  return <main className="mfa-layout"><section className="mfa-card"><div className="brand auth-brand"><BrandLogo/><span className="brand-sub">Admin</span></div><h1 style={{ marginTop: 26 }}>Verify it’s you</h1><p className="muted">Enter the six-digit code from your authenticator app.</p><div className="notice">Two-step verification is required for admin accounts.</div><div className="field"><label htmlFor="verify-code">Authenticator code</label><input className="input" id="verify-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => { const next = event.target.value.replace(/\D/g, '').slice(0, 6); setCode(next); if (next.length === 6) void verify(next); }}/></div>{error ? <p role="alert" className="field-hint" style={{ color: 'var(--danger-600)' }}>{error}</p> : null}<button className="button button-primary" style={{ width: '100%' }} disabled={code.length !== 6 || busy} onClick={() => void verify(code)}>{busy ? 'Verifying…' : 'Verify'}</button><button className="button button-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => void signOut().then(() => navigate('/login'))}>Use a different account</button></section></main>;
}

export function RecoveryPage({ mode }: { mode: 'forgot' | 'reset' }) {
  const backend = useBackend();
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault(); setError('');
    if (mode === 'reset' && password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'forgot') await backend.auth.requestPasswordReset(email);
      else await backend.auth.updatePassword(password);
      setSent(true);
    } catch {
      setError(mode === 'forgot' ? 'We could not submit the request right now. Try again later.' : 'We could not update the password. Open a valid recovery link and try again.');
    } finally { setBusy(false); }
  };
  return <main className="mfa-layout"><section className="mfa-card"><Link className="brand auth-brand" to="/login"><BrandLogo/><span className="brand-sub">Admin</span></Link><h1 style={{ marginTop: 26 }}>{mode === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h1>
    {sent ? <><p className="muted">{mode === 'forgot' ? mocksEnabled ? 'Password recovery is simulated in mock mode; no email is sent. Use one of the fictional demo accounts.' : 'If the account exists, you’ll receive an email with next steps.' : mocksEnabled ? 'Password update is simulated in mock mode; no credential was changed.' : 'Your password has been updated. Sign in with the new password.'}</p><Link className="button button-primary" to="/login">Back to sign in</Link></> : <form onSubmit={(event) => void submit(event)}>
      <p className="muted">{mode === 'forgot' ? 'Enter your staff email. We won’t reveal whether an account exists.' : 'Use the secure recovery link sent to your staff email.'}</p>
      {mode === 'forgot' ? <div className="field"><label htmlFor="recovery-email">Email</label><input className="input" id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></div> : <><div className="field"><label htmlFor="new-password">New password</label><input className="input" id="new-password" type="password" minLength={10} maxLength={256} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}/><span className="field-hint">At least 10 characters.</span></div><div className="field"><label htmlFor="confirm-password">Confirm new password</label><input className="input" id="confirm-password" type="password" minLength={10} maxLength={256} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}/></div></>}
      {error ? <p role="alert" className="field-hint" style={{ color: 'var(--danger-600)' }}>{error}</p> : null}<button className="button button-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Working…' : mode === 'forgot' ? 'Send instructions' : 'Save password'}</button>
    </form>}
    <Link to="/login" style={{ display: 'inline-block', marginTop: 18 }}>Back to sign in</Link>
  </section></main>;
}
