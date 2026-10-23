import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const envFiles = loadEnv('production', process.cwd(), 'VITE_');
const productionApp = (process.env.VITE_APP_ENV ?? envFiles.VITE_APP_ENV) === 'production';
const sourceRoot = 'frontend/src';
const built = process.argv.includes('--built');
const failures = [];
async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return [path];
  }));
  return nested.flat();
}
const sourceFiles = await filesUnder(sourceRoot);
for (const path of sourceFiles) {
  const content = await readFile(path, 'utf8');
  if (/service_role|sb_secret/i.test(content)) failures.push(`${path}: secret-like key marker`);
  if (/\bconsole\.log\s*\(/.test(content)) failures.push(`${path}: console.log`);
  if (/#[0-9a-fA-F]{3,8}\b/.test(content) && path.includes('/components/')) failures.push(`${path}: hard-coded hex colour in a component`);
  for (const match of content.matchAll(/impersonat|view as user|login as/gi)) {
    const allowed = match[0].toLowerCase().startsWith('impersonat') && content.includes("AptoHire doesn't allow impersonation.");
    if (!allowed) failures.push(`${path}: prohibited identity-switching text`);
  }
}
if (built) {
  const distRoot = 'dist';
  try {
    const info = await stat(distRoot);
    if (!info.isDirectory()) failures.push('dist: build output is missing');
    else {
      for (const path of await filesUnder(distRoot)) {
        const content = await readFile(path);
        const text = content.toString('utf8');
        if (/service_role|sb_secret/i.test(text)) failures.push(`${path}: secret-like key marker in bundle`);
        if (productionApp && (/MFA code:\s*123456|admin@demo\.aptohire\.test|DEMO-ADMIN-SECRET-ONLY/i.test(text) || path.toLowerCase().includes('/mock-'))) failures.push(`${path}: demo-only code in production bundle`);
      }
    }
  } catch { failures.push('dist: build output is missing'); }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Security scan passed${built ? ' (source + build output)' : ' (source only)'}.`);
}
