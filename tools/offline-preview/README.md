# Offline verification harness

Not part of the app. It exists because the project was built in a sandbox with no internet, where
`next`, `@types/react` and `@supabase/supabase-js` could not be installed. It lets the real pages and API
route handlers run in Chromium without Next.js:

- `build.mjs` bundles every page with esbuild and compiles `globals.css` with Tailwind.
- `shims/` stands in for `next/link`, `next/navigation` and `@supabase/supabase-js`.
- `server.ts` serves the bundle and calls the real `src/app/api/**/route.ts` handlers.
- `types/` holds simplified type declarations for `tsc -p tools/offline-preview/tsconfig.verify.json`.

Passing here proves the app's own code works. It does not prove Next.js builds it. On a normal computer use
`npm run dev`, `npm run typecheck` and `npm run build` instead.
