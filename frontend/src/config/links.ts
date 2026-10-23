import { env } from './env';

type Portal = 'student' | 'university' | 'organization';
const explicit: Record<Portal, string> = {
  student: env.VITE_STUDENT_URL,
  university: env.VITE_UNIVERSITY_URL,
  organization: env.VITE_ORGANIZATION_URL,
};
export function portalUrl(portal: Portal, path = ''): string {
  const base = explicit[portal] || `https://${portal}.${env.VITE_ROOT_DOMAIN}`;
  return new URL(path.replace(/^\//, ''), `${base.replace(/\/$/, '')}/`).toString();
}
export function rootUrl(path = ''): string {
  return new URL(path.replace(/^\//, ''), `${env.VITE_ROOT_URL.replace(/\/$/, '')}/`).toString();
}
