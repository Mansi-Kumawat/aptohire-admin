import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['local', 'demo', 'production']).default('local'),
  VITE_DEMO_MODE: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  VITE_USE_MOCKS: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  VITE_SITE_URL: z.string().url().default('http://localhost:5177'),
  VITE_ROOT_URL: z.string().url().default('http://localhost:5173'),
  VITE_ROOT_DOMAIN: z.string().min(1).default('localhost'),
  VITE_STUDENT_URL: z.string().url().default('http://localhost:5174'),
  VITE_UNIVERSITY_URL: z.string().url().default('http://localhost:5175'),
  VITE_ORGANIZATION_URL: z.string().url().default('http://localhost:5176'),
  VITE_SUPABASE_URL: z.union([z.literal(''), z.string().url()]).default(''),
  VITE_SUPABASE_ANON_KEY: z.string().default(''),
  VITE_DEMO_PASSWORD: z.string().default(''),
  VITE_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().min(1).max(240).default(30),
  VITE_SUPPORT_EMAIL: z.string().email().default('support@aptohire.test'),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
if (parsed.data.VITE_APP_ENV === 'production' && (parsed.data.VITE_USE_MOCKS || parsed.data.VITE_DEMO_MODE || parsed.data.VITE_DEMO_PASSWORD.length > 0)) {
  throw new Error('Production builds cannot enable mocks, demo mode, or a demo password.');
}
export const env = parsed.data;
