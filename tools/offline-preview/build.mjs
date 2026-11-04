import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { compile } from 'tailwindcss';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, 'dist');
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(here, 'entry.tsx')],
  bundle: true,
  outfile: join(out, 'app.js'),
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: true,
  tsconfig: join(root, 'tsconfig.json'),
  loader: { '.json': 'json' },
  logLevel: 'warning',
  define: { 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '""' },
  alias: {
    'next/link': join(here, 'shims/next-link.tsx'),
    'next/navigation': join(here, 'shims/next-navigation.ts'),
    '@supabase/supabase-js': join(here, 'shims/supabase.ts'),
  },
});

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx|ts)$/.test(name) ? [path] : [];
  });
}

const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const twDir = join(root, 'node_modules/tailwindcss');
const compiler = await compile(css, {
  loadStylesheet: async (id, base) => {
    const path = id === 'tailwindcss' ? join(twDir, 'index.css') : join(twDir, id.replace(/^tailwindcss\//, '').replace(/^\.\//, '') + (id.endsWith('.css') ? '' : '.css'));
    return { path, base, content: readFileSync(path, 'utf8') };
  },
});
const candidates = new Set();
for (const file of files(join(root, 'src'))) {
  for (const token of readFileSync(file, 'utf8').split(/[\s"'`]+/)) if (token) candidates.add(token);
}
writeFileSync(join(out, 'app.css'), compiler.build([...candidates]));
writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DreamCanvas (offline harness)</title><link rel="stylesheet" href="/_dist/app.css"></head><body><div id="root"></div><script type="module" src="/_dist/app.js"></script></body></html>`);
console.log('built');
