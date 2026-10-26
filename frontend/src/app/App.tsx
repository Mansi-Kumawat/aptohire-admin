import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { AccessGate, LoginPage, MfaSetupPage, MfaVerifyPage, RecoveryPage } from '../pages/AuthPages';
import { AppShell } from '../components/AppShell';
import { ToastProvider } from '../components/ui';
import { Providers } from './providers';
import '../styles/tokens.css';
import '../styles/globals.css';
import '../styles/modern-ui.css';
import '../styles/premium-ux.css';
import '../styles/green-spectrum.css';

const Dashboard = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.DashboardPage })));
const Approvals = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.ApprovalsPage })));
const Reviews = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.ReviewsPage })));
const Tickets = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.TicketsPage })));
const Runs = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.RunsPage })));
const Settings = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.SettingsPage })));
const Library = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.LibraryPage })));
const AuditLog = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.AuditLogPage })));
const Users = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.UsersPage })));
const Reports = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.ReportsPage })));
const Notifications = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.NotificationsPage })));
const Account = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.AccountPage })));
const Help = lazy(() => import('../pages/AdminPages').then((module) => ({ default: module.HelpPage })));
const LoadingPage = () => <div className="startup-screen" role="status">Loading page…</div>;
const router = createBrowserRouter([
  { path: '/login', element: <><Helmet><title>Sign in · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet><LoginPage/></> },
  { path: '/forgot-password', element: <><Helmet><title>Reset password · AptoHire Admin</title></Helmet><RecoveryPage mode="forgot"/></> },
  { path: '/reset-password', element: <><Helmet><title>Choose a new password · AptoHire Admin</title></Helmet><RecoveryPage mode="reset"/></> },
  { path: '/auth/callback', element: <Navigate to="/login" replace/> },
  { path: '/', element: <AccessGate/>, children: [
    { path: 'mfa/setup', element: <><Helmet><title>Set up two-step verification · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet><MfaSetupPage/></> }, { path: 'mfa/verify', element: <><Helmet><title>Verify sign-in · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet><MfaVerifyPage/></> },
    { element: <AppShell/>, children: [
      { index: true, element: <Navigate to="/dashboard" replace/> },
      { path: 'dashboard', element: <Suspense fallback={<LoadingPage/>}><Dashboard/></Suspense> },
      { path: 'approvals', element: <Suspense fallback={<LoadingPage/>}><Approvals/></Suspense> },
      { path: 'approvals/:type/:id', element: <Suspense fallback={<LoadingPage/>}><Approvals/></Suspense> },
      { path: 'reviews', element: <Suspense fallback={<LoadingPage/>}><Reviews/></Suspense> },
      { path: 'reviews/:auditId', element: <Suspense fallback={<LoadingPage/>}><Reviews/></Suspense> },
      { path: 'tickets', element: <Suspense fallback={<LoadingPage/>}><Tickets/></Suspense> },
      { path: 'tickets/:ticketId', element: <Suspense fallback={<LoadingPage/>}><Tickets/></Suspense> },
      { path: 'runs', element: <Suspense fallback={<LoadingPage/>}><Runs/></Suspense> },
      { path: 'runs/:runId', element: <Suspense fallback={<LoadingPage/>}><Runs/></Suspense> },
      { path: 'settings', element: <Suspense fallback={<LoadingPage/>}><Settings/></Suspense> },
      { path: 'library', element: <Suspense fallback={<LoadingPage/>}><Library/></Suspense> },
      { path: 'audit-log', element: <Suspense fallback={<LoadingPage/>}><AuditLog/></Suspense> },
      { path: 'users', element: <Suspense fallback={<LoadingPage/>}><Users/></Suspense> },
      { path: 'reports', element: <Suspense fallback={<LoadingPage/>}><Reports/></Suspense> },
      { path: 'notifications', element: <Suspense fallback={<LoadingPage/>}><Notifications/></Suspense> },
      { path: 'account', element: <Suspense fallback={<LoadingPage/>}><Account/></Suspense> },
      { path: 'help', element: <Suspense fallback={<LoadingPage/>}><Help/></Suspense> },
    ] },
  ] },
  { path: '*', element: <><Helmet><title>Not found · AptoHire Admin</title><meta name="robots" content="noindex,nofollow"/></Helmet><div className="wrong-role"><section className="wrong-role-box"><h1>That page doesn’t exist.</h1><p className="muted">Check the address or return to the admin console.</p><a className="button button-primary" href="/dashboard">Go to dashboard</a></section></div></> },
]);

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError(): { hasError: boolean } { return { hasError: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo): void { /* No payload is written to logs. */ }
  render() {
    if (this.state.hasError) return <main className="wrong-role"><section className="wrong-role-box"><h1>Something went wrong.</h1><p className="muted">Reload the page to continue. No error details are shown here.</p><button className="button button-primary" onClick={() => window.location.reload()}>Reload page</button></section></main>;
    return this.props.children;
  }
}

export function App() {
  return <HelmetProvider><Providers><ToastProvider><ErrorBoundary><RouterProvider router={router}/></ErrorBoundary></ToastProvider></Providers></HelmetProvider>;
}
