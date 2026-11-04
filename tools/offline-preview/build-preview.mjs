// Builds one self-contained HTML file of the app in Local Demo Mode, for the hosted preview.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = process.argv[2] ?? join(here, 'dist', 'preview.html');
mkdirSync(dirname(out), { recursive: true });

const images = {};
for (const file of readdirSync(join(root, 'public/demo'))) {
  const small = await sharp(join(root, 'public/demo', file)).resize({ width: 1100, height: 1100, fit: 'inside' }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  images[`/demo/${file}`] = `data:image/jpeg;base64,${small.toString('base64')}`;
}

const result = await build({
  entryPoints: [join(here, 'entry.tsx')],
  bundle: true,
  write: false,
  minify: true,
  format: 'iife',
  target: 'es2022',
  jsx: 'automatic',
  tsconfig: join(root, 'tsconfig.json'),
  loader: { '.json': 'json' },
  logLevel: 'warning',
  define: { 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '""', 'process.env.NODE_ENV': '"production"', __DEMO_IMAGES__: JSON.stringify(images) },
  alias: {
    'next/link': join(here, 'preview/next-link.tsx'),
    'next/navigation': join(here, 'preview/next-navigation.ts'),
    '@supabase/supabase-js': join(here, 'shims/supabase.ts'),
  },
  plugins: [{
    name: 'platform',
    setup(b) {
      b.onResolve({ filter: /(^|\/)platform$/ }, () => ({ path: join(here, 'preview/platform.ts') }));
    },
  }],
});

const css = readFileSync(join(here, 'dist/app.css'), 'utf8');
const js = result.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const fonts = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Caveat:wght@500;600&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;700&display=swap';
writeFileSync(out, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>DreamCanvas preview</title>
<link rel="stylesheet" href="${fonts}"><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log(`preview: ${(readFileSync(out).length / 1024 / 1024).toFixed(1)} MB`);
