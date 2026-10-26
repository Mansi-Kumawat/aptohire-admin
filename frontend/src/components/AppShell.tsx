import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Activity, AlertTriangle, Bell, BookOpen, ChartNoAxesColumn, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, ClipboardList, FileText, HelpCircle, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBackend, useAuth } from '../app/providers';
import { mocksEnabled } from '../config/flags';
import { BrandLogo } from './BrandLogo';

const workspace = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/approvals', label: 'Approvals', icon: ClipboardList, key: 'approvals' as const },
  { to: '/reviews', label: 'Reviews', icon: CheckCircle2, key: 'reviews' as const },
  { to: '/tickets', label: 'Tickets & appeals', icon: FileText, key: 'tickets' as const },
];
const operations = [
  { to: '/runs', label: 'Agent runs', icon: Activity, key: 'runs' as const },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesColumn },
];
const administration = [
  { to: '/users', label: 'Staff directory', icon: Users },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/audit-log', label: 'Audit log', icon: ShieldCheck },
];
const personal = [
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/account', label: 'Account & security', icon: CircleUserRound },
  { to: '/help', label: 'Help & guidance', icon: HelpCircle },
];
const mobilePrimary = workspace.slice(0, 4);

export function AppShell() {
  const backend = useBackend(); const { user, signOut } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false); const [railCollapsed, setRailCollapsed] = useState(false); const [notice, setNotice] = useState(() => sessionStorage.getItem('admin-prototype-dismissed') !== 'yes');
  const [bellOpen, setBellOpen] = useState(false); const [accountOpen, setAccountOpen] = useState(false); const [online, setOnline] = useState(() => navigator.onLine);
  const drawerRef = useRef<HTMLElement>(null); const triggerRef = useRef<HTMLButtonElement | null>(null);
  const counts = useQuery({ queryKey: ['counts'], queryFn: () => backend.counts(), refetchInterval: 60_000 });
  const notificationQuery = useQuery({ queryKey: ['notifications'], queryFn: () => backend.notifications(), refetchInterval: 60_000 });
  const unreadNotifications = (notificationQuery.data ?? []).filter((item) => !item.readAt).length;
  const config = useQuery({ queryKey: ['config'], queryFn: () => backend.config() });
  const closeDrawer = (): void => {
    if (!drawerOpen) return;
    setDrawerOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
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
      if (event.key === 'Escape') { event.preventDefault(); setDrawerOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); return; }
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
  const title = ({ dashboard: 'Dashboard', approvals: 'Approvals', reviews: 'Reviews', tickets: 'Appeals & tickets', runs: 'Agent runs', settings: 'Settings', library: 'Library', 'audit-log': 'Audit log', users: 'Staff directory', reports: 'Reports', notifications: 'Notifications', account: 'Account & security', help: 'Help' } as Record<string, string>)[location.pathname.split('/')[1] ?? ''] ?? 'Admin console';
  const renderLinks = (items: typeof workspace | typeof operations | typeof administration | typeof personal) => items.map((item) => {
const Icon = item.icon; const count = 'key' in item && item.key ? counts.data?.[item.key] : undefined;
    return <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeDrawer} aria-label={count ? `${item.label}, ${count} pending` : item.label} title={item.label} end={item.to === '/dashboard'}>
      <span className="nav-icon"><Icon size={19} strokeWidth={1.8} aria-hidden="true"/></span><span className="nav-label">{item.label}</span>{count ? <span className="count-badge" aria-label={`${count} pending`}>{count}</span> : null}
    </NavLink>;
  });
  const navLinks = () => <>
    <div className="nav-section">Workspace</div>{renderLinks(workspace)}
    <div className="nav-section">Operations</div>{renderLinks(operations)}
    <div className="nav-section">Manage</div>{renderLinks(administration)}
    <div className="nav-section">Personal</div>{renderLinks(personal)}
  </>;
  return <div className={`app-shell${drawerOpen ? ' drawer-open' : ''}${railCollapsed ? ' rail-collapsed' : ''}`}>
    <Helmet><title>{title} · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="rail"><div className="rail-brand brand"><BrandLogo compactAtRail/><span className="brand-sub">Admin console</span><button className="rail-toggle" type="button" aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={railCollapsed} title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setRailCollapsed((collapsed) => !collapsed)}>{railCollapsed ? <ChevronRight size={17} aria-hidden="true"/> : <ChevronLeft size={17} aria-hidden="true"/>}</button></div><nav aria-label="Main navigation">{navLinks()}</nav><div className="rail-footer"><span className="rail-footer-icon"><ShieldCheck size={16}/></span><span><strong>Protected workspace</strong><small>Role + MFA checks active</small></span></div></aside>
    <header className="topbar">
      <button className="icon-button mobile-menu-button" aria-label="Open navigation menu" aria-expanded={drawerOpen} aria-haspopup="dialog" onClick={(event) => { triggerRef.current = event.currentTarget; setDrawerOpen(true); }}><Menu size={21}/></button>
      <div className="brand topbar-brand"><BrandLogo/><span className="brand-sub">Admin</span></div>
      <div className="topbar-spacer" />
      <div className="topbar-popover-anchor"><button className="icon-button notification-trigger" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'} aria-expanded={bellOpen} aria-haspopup="dialog" onClick={() => { setBellOpen(!bellOpen); setAccountOpen(false); }}><Bell size={20}/>{unreadNotifications ? <span className="unread-dot"/> : null}</button>{bellOpen ? <div className="popover notification-popover" role="dialog" aria-label="Notification summary"><div className="popover-title-row"><strong>Notifications</strong>{unreadNotifications ? <span className="popover-count">{unreadNotifications} new</span> : null}</div><p>{unreadNotifications ? `${unreadNotifications} unread update${unreadNotifications === 1 ? '' : 's'} in your workspace.` : 'You’re all caught up.'}</p><button className="row-action" onClick={() => { setBellOpen(false); navigate('/notifications'); }}>View notification center <span aria-hidden="true">→</span></button></div> : null}</div>
      <div className="topbar-popover-anchor"><button className="account-button" aria-label={`Account menu for ${user?.name ?? 'Admin'}`} aria-expanded={accountOpen} aria-haspopup="dialog" onClick={() => { setAccountOpen(!accountOpen); setBellOpen(false); }}><span className="account-avatar">{(user?.name ?? 'A1').split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span className="account-name">{user?.name ?? 'Admin'}</span><span className="aal-chip"><ShieldCheck size={12}/> MFA verified</span><ChevronDown size={16}/></button>{accountOpen ? <div className="popover account-popover" role="dialog" aria-label="Account menu"><div className="account-popover-profile"><span className="account-avatar large">{(user?.name ?? 'A1').split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{user?.name ?? 'Admin'}</strong><small>{user?.email ?? 'Staff account'}</small></span></div><button onClick={() => { setAccountOpen(false); navigate('/account'); }}><CircleUserRound size={16}/>Account &amp; security</button><button onClick={() => { setAccountOpen(false); void signOut().then(() => navigate('/login')); }}><LogOut size={16}/>Sign out</button></div> : null}</div>
    </header>
    {drawerOpen ? <div className="mobile-drawer-backdrop open"><aside className="mobile-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Navigation menu"><div className="rail-brand brand"><BrandLogo/><span className="brand-sub">Admin console</span><button className="icon-button" aria-label="Close navigation menu" style={{ marginLeft: 'auto' }} onClick={closeDrawer}><X size={20}/></button></div><nav aria-label="Mobile navigation">{navLinks()}</nav><div className="drawer-sample-note"><ShieldCheck size={16}/><span>Secure staff access · Sample data</span></div></aside></div> : null}
    <main id="main-content" className="main-area"><div className="main-content">{mocksEnabled && notice ? <div className="prototype-notice"><span><strong>Sample workspace</strong><span className="prototype-notice-copy">All people, universities and organizations shown are fictional.</span></span><button aria-label="Dismiss sample workspace notice" onClick={() => { setNotice(false); sessionStorage.setItem('admin-prototype-dismissed', 'yes'); }}><X size={16}/></button></div> : null}
      {!online ? <div className="callout" role="alert">You’re offline. Changes won’t be saved until your connection returns.</div> : null}
      {config.data?.AI_KILL_SWITCH ? <div className="kill-banner" role="status"><AlertTriangle size={18} aria-hidden="true"/>AI is paused. New projects and reviews are blocked.<button className="row-action" onClick={() => navigate('/settings')}>Open settings</button></div> : null}
      <Outlet />
    </div></main>
    <nav className="bottom-tabs" aria-label="Primary navigation">{mobilePrimary.map((item) => { const Icon = item.icon; const count = 'key' in item && item.key ? counts.data?.[item.key] : undefined; return <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`} aria-label={count ? `${item.label}, ${count} pending` : item.label}><Icon aria-hidden="true"/><span>{item.label.replace('Tickets & appeals', 'Tickets')}</span>{count ? <span className="bottom-badge">{count}</span> : null}</NavLink>; })}<button className="bottom-tab" aria-expanded={drawerOpen} aria-haspopup="dialog" onClick={(event) => { triggerRef.current = event.currentTarget; setDrawerOpen(true); }} aria-label="More navigation options"><Menu aria-hidden="true"/><span>More</span></button></nav>
  </div>;
}
