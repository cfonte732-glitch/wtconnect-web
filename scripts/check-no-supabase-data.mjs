import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const srcRoot = join(import.meta.dirname, '..', 'src');
const authClient = join(srcRoot, 'lib', 'auth-client.ts');

const forbiddenInOthers = [
  /@supabase\/supabase-js/,
  /\.from\s*\(\s*['"`]/,
  /\.rpc\s*\(\s*['"`]/,
  /rest\/v1\//,
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.push(p);
  }
  return files;
}

const files = await walk(srcRoot);
const hits = [];

for (const f of files) {
  if (f.replace(/\\/g, '/') === authClient.replace(/\\/g, '/')) continue;
  const text = await readFile(f, 'utf8');
  for (const re of forbiddenInOthers) {
    if (re.test(text)) {
      hits.push({ file: relative(join(import.meta.dirname, '..'), f), rule: re.toString() });
      break;
    }
  }
}

if (hits.length) {
  console.error('CI: accès Supabase données interdit hors auth-client.ts:');
  for (const h of hits) console.error(` - ${h.file} (${h.rule})`);
  process.exit(1);
}

console.log('OK: pas de PostgREST / .from / SDK hors auth-client.ts');
