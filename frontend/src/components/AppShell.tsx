import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Activity, AlertTriangle, Bell, BookOpen, CheckCircle2, ChevronDown, ClipboardList, FileText, HelpCircle, LogOut, Menu, Settings, ShieldCheck, Users, X, ChartNoAxesColumn, CircleUserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBackend, useAuth } from '../app/providers';
import { mocksEnabled } from '../config/flags';
import { BrandLogo } from './BrandLogo';

const primary = [
  { to: '/approvals', label: 'Approvals', icon: ClipboardList, key: 'approvals' as const },
  { to: '/reviews', label: 'Reviews', icon: CheckCircle2, key: 'reviews' as const },
  { to: '/tickets', label: 'Tickets', icon: FileText, key: 'tickets' as const },
  { to: '/runs', label: 'Agent runs', icon: Activity, key: 'runs' as const },
  { to: '/settings', label: 'Settings', icon: Settings },
];
const secondary = [
  { to: '/library', label: 'Library', icon: BookOpen }, { to: '/audit-log', label: 'Audit log', icon: ShieldCheck },
  { to: '/users', label: 'Users', icon: Users }, { to: '/reports', label: 'Reports', icon: ChartNoAxesColumn },
];
const bottom = primary.slice(0, 4);

export function AppShell() {
  const backend = useBackend(); const { user, signOut } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false); const [notice, setNotice] = useState(() => sessionStorage.getItem('admin-prototype-dismissed') !== 'yes');
  const [bellOpen, setBellOpen] = useState(false); const [accountOpen, setAccountOpen] = useState(false); const [online, setOnline] = useState(() => navigator.onLine);
  const drawerRef = useRef<HTMLElement>(null); const triggerRef = useRef<HTMLButtonElement | null>(null);
  const counts = useQuery({ queryKey: ['counts'], queryFn: () => backend.counts(), refetchInterval: 60_000 });
  const notificationQuery = useQuery({ queryKey: ['notifications'], queryFn: () => backend.notifications(), refetchInterval: 60_000 });
  const unreadNotifications = (notificationQuery.data ?? []).filter((item) => !item.readAt).length;
  const config = useQuery({ queryKey: ['config'], queryFn: () => backend.config() });
  const closeDrawer = (): void => { setDrawerOpen(false); triggerRef.current?.focus(); };
  useEffect(() => {
    const updateOnline = (): void => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
    return () => { window.removeEventListener('online', updateOnline); window.removeEventListener('offline', updateOnline); };
  }, []);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const drawer = drawerRef.current;
    const focusable = drawer ? Array.from(drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((item) => !item.closest('[hidden],[aria-hidden="true"]')) : [];
    const first = focusable[0]; const last = focusable.at(-1);
    first?.focus();
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawerOpen(false); triggerRef.current?.focus(); return; }
      if (event.key === 'Tab' && first && last && drawer) {
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !drawer.contains(active))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (active === last || !drawer.contains(active))) { event.preventDefault(); first.focus(); }
      }
    };
    const handleResize = (): void => { if (window.innerWidth >= 1024) setDrawerOpen(false); };
    document.addEventListener('keydown', handleKey); window.addEventListener('resize', handleResize);
    return () => { document.removeEventListener('keydown', handleKey); window.removeEventListener('resize', handleResize); };
  }, [drawerOpen]);
  const title = ({ approvals: 'Approvals', reviews: 'Reviews', tickets: 'Tickets', runs: 'Agent runs', settings: 'Settings', library: 'Library', 'audit-log': 'Audit log', users: 'Users', reports: 'Reports', notifications: 'Notifications', account: 'Account & security', help: 'Help' } as Record<string, string>)[location.pathname.split('/')[1] ?? ''] ?? 'Admin console';
  const navLinks = (compact = false) => <>
    <div className="nav-section">Workspace</div>
    {primary.map((item) => { const Icon = item.icon; const count = item.key ? counts.data?.[item.key] : undefined; return <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeDrawer} aria-label={count ? `${item.label}, ${count} pending` : item.label} title={compact ? item.label : undefined}><span className="nav-icon"><Icon size={20} strokeWidth={1.75} /></span><span className="nav-label">{item.label}</span>{count ? <span className="count-badge" aria-label={`${count} pending`}>{count}</span> : null}</NavLink>; })}
    <div className="nav-section">System</div>
    {secondary.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeDrawer} title={compact ? item.label : undefined}><span className="nav-icon"><Icon size={20} strokeWidth={1.75} /></span><span className="nav-label">{item.label}</span></NavLink>; })}
    <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeDrawer} aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}><span className="nav-icon"><Bell size={20} strokeWidth={1.75}/></span><span className="nav-label">Notifications</span>{unreadNotifications ? <span className="count-badge" aria-label={`${unreadNotifications} unread`}>{unreadNotifications}</span> : null}</NavLink>
    <NavLink to="/account" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeDrawer}><span className="nav-icon"><CircleUserRound size={20} strokeWidth={1.75}/></span><span className="nav-label">Account &amp; security</span></NavLink>
    <NavLink to="/help" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeDrawer}><span className="nav-icon"><HelpCircle size={20} strokeWidth={1.75}/></span><span className="nav-label">Help</span></NavLink>
  </>;
  return <div className="app-shell">
    <Helmet><title>{title} · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="rail"><div className="rail-brand brand"><BrandLogo compactAtRail/><span className="brand-sub">Admin console</span></div><nav aria-label="Main navigation">{navLinks()}</nav></aside>
    <header className="topbar">
      <button className="icon-button mobile-menu-button" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={(event) => { triggerRef.current = event.currentTarget; setDrawerOpen(true); }}><Menu size={21}/></button>
      <div className="brand topbar-brand"><BrandLogo/><span className="brand-sub">Admin</span></div>
      <div className="topbar-spacer" />
      <div style={{ position: 'relative' }}><button className="icon-button" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'} aria-expanded={bellOpen} onClick={() => setBellOpen(!bellOpen)}><Bell size={20}/>{unreadNotifications ? <span className="unread-dot"/> : null}</button>{bellOpen ? <div className="popover"><strong>Notifications</strong><p>{unreadNotifications ? `${unreadNotifications} unread item${unreadNotifications === 1 ? '' : 's'}` : 'You’re all caught up.'}</p><button className="row-action" onClick={() => { setBellOpen(false); navigate('/notifications'); }}>View all</button></div> : null}</div>
      <div style={{ position: 'relative' }}><button className="account-button" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}><span className="account-avatar">A1</span><span className="account-name">{user?.name ?? 'Admin 1'}</span><span className="aal-chip">verified</span><ChevronDown size={16}/></button>{accountOpen ? <div className="popover account-popover"><button onClick={() => { setAccountOpen(false); navigate('/account'); }}><CircleUserRound size={16}/>Account &amp; security</button><button onClick={() => { setAccountOpen(false); void signOut().then(() => navigate('/login')); }}><LogOut size={16}/>Sign out</button></div> : null}</div>
    </header>
    {drawerOpen ? <div className="mobile-drawer-backdrop open"><aside className="mobile-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Navigation menu"><div className="rail-brand brand"><BrandLogo/><span className="brand-sub">Admin console</span><button className="icon-button" aria-label="Close navigation menu" style={{ marginLeft: 'auto' }} onClick={closeDrawer}><X size={20}/></button></div><nav>{navLinks()}</nav></aside></div> : null}
    <main id="main-content" className="main-area"><div className="main-content">{mocksEnabled && notice ? <div className="prototype-notice"><span>Prototype · Sample data. All people, universities and organizations shown are fictional.</span><button aria-label="Dismiss prototype notice" onClick={() => { setNotice(false); sessionStorage.setItem('admin-prototype-dismissed', 'yes'); }}><X size={16}/></button></div> : null}
      {!online ? <div className="callout" role="alert">You’re offline. Changes won’t be saved until your connection returns.</div> : null}
      {config.data?.AI_KILL_SWITCH ? <div className="kill-banner" role="status"><AlertTriangle size={18} aria-hidden="true"/>AI is paused. New projects and reviews are blocked.<button className="row-action" onClick={() => navigate('/settings')}>Open settings</button></div> : null}
      <Outlet />
    </div></main>
    <nav className="bottom-tabs" aria-label="Primary navigation">{bottom.map((item) => { const Icon = item.icon; const count = item.key ? counts.data?.[item.key] : undefined; return <NavLink key={item.to} to={item.to} className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`} aria-label={count ? `${item.label}, ${count} pending` : item.label}><Icon aria-hidden="true"/><span>{item.label}</span>{count ? <span className="bottom-badge">{count}</span> : null}</NavLink>; })}<button className={`bottom-tab ${drawerOpen ? 'active' : ''}`} aria-expanded={drawerOpen} onClick={(event) => { triggerRef.current = event.currentTarget; setDrawerOpen(true); }} aria-label="More navigation options"><Menu aria-hidden="true"/><span>More</span></button></nav>
  </div>;
}
