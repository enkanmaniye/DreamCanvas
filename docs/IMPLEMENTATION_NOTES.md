# Implementation notes

## The environment shaped this build

The project was built in a sandbox with **no internet**. `next`, `fabric`, `@supabase/supabase-js`, `eslint`, `@types/react` and Google Fonts were unavailable. React, TypeScript, esbuild, Tailwind, zod, sharp and Playwright with real Chromium were available.

To test as much real code as possible, `tools/offline-preview/` runs the actual page components and API route handlers in Chromium without Next.js. Pages are kept thin, and API routes are plain `Request` to `Response` functions, so very little depends on Next.js itself.

## Deviations from the PRD

| PRD | Built | Why |
|---|---|---|
| Fabric.js | Custom canvas engine (`src/lib/engine`, `src/lib/scene`) | Fabric couldn't be installed, and the core editor shouldn't ship untested. Boards are stored as plain scene JSON, so switching engines is contained to those folders. Tradeoff: no multi-select, and fewer built-in features than Fabric. |
| `gemini-2.5-flash-lite` | `gemini-3.1-flash-lite`, falling back to `gemini-3.5-flash-lite` | Google's deprecations page says 2.5 models are limited to existing users, so a new key could get a 404. Costs somewhat more. Set by `GEMINI_MODEL`. |
| `lucide-react` package | Lucide icons copied into `src/components/icon-data.ts` | A renamed export would break the build for everyone, and it couldn't be checked offline. |
| Motion for React | CSS animation | The PRD allows either, and this means one less dependency. |
| Cookie-based Supabase sessions (not specified) | Bearer token per request | No middleware needed, and it avoids CSRF exposure. |
| Default rate limits on all analysis | Only when real AI is connected | Keyword rules cost nothing. |

## Verification results

Final run, all fresh in the sandbox:

| Check | Result |
|---|---|
| Unit and integration tests | 94 of 94 passed |
| Browser tests in Chromium (desktop and mobile, against the harness) | 33 of 33 passed |
| Type check | Passed, but against hand-written stand-ins for React, Next and Supabase types |
| Mutation checks (12 deliberate breaks to safety or core code) | All 12 caught by tests |
| Single-file preview under a strict security policy | Manual scripted run passed |

**Not run, because the sandbox can't:**

- `npm install`, `next dev`, `next build`, `npm run lint`, and type checking against real package types. **These first run on your machine.** A real type mismatch would stop `npm run build` but not `npm run dev`.
- Anything against live Gemini, Ollama, Openverse or Supabase. Those paths were tested with simulated responses only, built from each service's documented format.
- The Row Level Security SQL. `tests/integration/rls.live.test.ts` covers it but skips without keys. The "User A can't reach User B" tests in `api.test.ts` use an in-memory database that imitates those rules. They prove the API behaves correctly, not that the SQL policies work. **Run the live test before trusting cloud privacy.**
- The real web fonts. All screenshots used fallback fonts. Text is measured at draw time so it adapts, but line breaks will differ and the look is untested.

## PRD acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Keyless labeled demo: upload, layout, quote, real PNG | Tested |
| 2 | Sign up, save, refresh, reopen with Supabase | Built, not run live. Local version tested |
| 3 | User A can't reach User B's data | Tested with simulated database. Live test provided, not run |
| 4 | Gemini with consent gives an editable suggestion | Tested with simulated Gemini responses |
| 5 | Text-only input makes a non-blank board | Tested |
| 6 | Real 16:9 composition, nothing off canvas | Tested for all layouts, 1 to 20 photos, both orientations |
| 7 | Exact PNG sizes including 3840×2160, no canvas taint | Tested by reading the output files |
| 8 | Drag, resize, replace, remove, edit, stickers, undo, redo | Tested |
| 9 | Lint, typecheck, tests, build pass; docs | Tests pass. **Lint and build not run**; type check partial |
| 10 | Square frames, palette, no emoji, reduced motion | Tested |
| 11 | No payment or GPU needed | Tested |
| 12 | Missing services are marked, nothing faked | Tested |

## How the references were used

| Reference | Used for |
|---|---|
| Design_Inspiration_Websites.jpg | Hero tile field dissolving into a color bloom, tiled background style, heavy grotesque headline, four-point sparkle |
| download__2_.jpg | Soft lilac bloom. Its pill shapes were dropped, as the PRD requires |
| Froly_x_Girly_Pink.jpg | Froly record palette, butterfly and vinyl stickers, vinyl illustration |
| Instagram.jpg | Petal lagoon palette, soft petals illustration |
| nynatrema.jpg | Fuchsia veil palette, swatch rows with a sparkle tile on the review screen |
| Styleguides_AI_inspiration (One radius scale) | One radius scale: 0 for frames and panels, 4px for controls. Its glass and pill styling was dropped, as the PRD requires |

## Animation

Every link in `references/animation-links.md` is still `[PASTE LINK]`, so no external animation was studied. The written notes in that file were implemented instead:

| Note | Where |
|---|---|
| Layered photos slide into place on load | Landing hero |
| Frame tilts, highlights and settles on drop | Upload drop zone |
| 4px offset shadow moves on hover | All buttons |
| Sticker rotates slightly when selected | Editor |
| Fast pastel color wipe between pages | Page changes |

All of them respect the reduced-motion setting.

## Known limitations

- One object can be selected at a time.
- Crops center on the busiest part of an image. There's no face detection, so faces can still be cropped; use Reposition.
- Local Demo Mode can't see inside photos. It reads file names and colors, and the UI says so.
- Keyword-rule quotes are English only. Real AI can match other languages.
- Boards made as a guest stay in that browser. They don't move to the account after logging in.
- After a photo is permanently deleted, undo restores its frame as a blank box.
- HEIC photos aren't converted. People get a clear message instead.
- The phone preset is one size, 1080×1920, and a board's orientation is chosen when it's created.
- Bundled art is illustration, not photography.
- Image generation is an adapter for an endpoint you supply, and has only been exercised in its switched-off state.
