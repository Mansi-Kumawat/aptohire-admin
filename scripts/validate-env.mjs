import { loadEnv } from 'vite';

const files = loadEnv('production', process.cwd(), 'VITE_');
const value = (key) => process.env[key] ?? files[key] ?? '';
if (value('VITE_APP_ENV') === 'production') {
  const enabled = ['VITE_USE_MOCKS', 'VITE_DEMO_MODE'].some((key) => value(key) === 'true');
  if (enabled || value('VITE_DEMO_PASSWORD')) {
    console.error('Production build blocked: disable mocks and demo mode and remove VITE_DEMO_PASSWORD.');
    process.exit(1);
  }
}
