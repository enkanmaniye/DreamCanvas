# DreamCanvas — AI Vision Board & Wallpaper Maker

**Product Requirements Document (PRD)**  
Version: 1.0 · Date: 2026-11-04 · Status: Build-ready MVP  
Working product name: **DreamCanvas** (easy to rename)

> **One-sentence brief:** Build a beautiful pink/yellow/purple website where someone can upload inspiration photos, describe a dream in words, or combine both; an AI interprets their desired *theme*, proposes matching visuals, stickers and original quotes; a deterministic visual editor generates a gorgeous, fully editable desktop vision-board wallpaper that can be saved and downloaded.

## 1. Product vision and scope

### Product promise

**Your dreams, on your screen.** Users make a polished, personal motivational collage in minutes, without graphic-design skills. DreamCanvas is *not* a generic AI-chat app, an image search engine, or a conventional diagramming tool. Its main output is a **designed, high-resolution, editable wallpaper / vision board**. A graph-style mind map with connected nodes is a later possibility, **not an MVP requirement**.

### Target users

- Students and young professionals visualizing careers, learning, independence and future lifestyles.
- Travelers planning places and experiences they dream about.
- Creators who enjoy mood boards, aesthetics, collages and inspirational wallpapers.
- People with no design or coding knowledge.

### Primary goals

1. Transform **uploaded images** into an aesthetic, relevant wallpaper.
2. Transform **written dreams** into an aesthetic wallpaper, with selected or optional generated images.
3. Support **hybrid input** (photos + a description) so users can refine meaning.
4. Let users modify and regenerate results, then save/download full-resolution files.
5. Provide genuinely functioning authentication and persistence when configured, without requiring expensive image generation for the default workflow.

### Non-goals for MVP

- Social feed, sharing between users, subscriptions/payments, native mobile apps, animated/video exports, team collaboration, fully generative background illustrations as the only mode, AI-generated stickers as a requirement, graph-style connected mind maps.
- Inferring a user's personality, wealth, emotional health, protected attributes or real-life status from uploaded images.

## 2. End-to-end user experience

### Pages and routes

| Page | Route | Function |
|---|---|---|
| Home / landing | `/` | Delightful hero, visual examples, two creation modes, real CTA |
| Sign up | `/signup` | Email/password signup and optional Google OAuth via Supabase |
| Log in | `/login` | Email/password login, password reset flow |
| Dashboard | `/dashboard` | Saved projects, create new, thumbnails, rename, delete |
| New board wizard | `/create` | Choose upload, describe, or both; size, style, mood |
| AI review | `/create/review` | Show inferred theme and mood; user edits before generation |
| Board editor | `/board/[id]` | Canvas, quote and image layers, stickers, save/download/regenerate |
| Profile/settings | `/settings` | Account, privacy, export defaults, delete account/data |

### First-use journey

1. Landing page demonstrates an elegant board preview and clearly shows **“Upload inspiration”** / **“Describe your dream”**.
2. User can explore a short **guest demo** without creating an account; actual saved projects require signup/login.
3. Authenticated user chooses **Photos**, **Words**, or **Both**.
4. **Photo flow:** drag/drop or browse 1–20 JPG/PNG/WebP images, max 10 MB each. Render previews, file counts, remove/reorder, upload progress and friendly error states. HEIC conversion is optional; if unsupported, give a clear message.
5. **Words flow:** user types a dream, such as “I want to spend a peaceful summer in Bali and the Maldives,” and chooses optional aesthetic tags such as *sunny, pastel, editorial, cozy, bold*.
6. **Hybrid flow:** include both photos and text. Text is a user-supplied clarification, not a requirement to use the images.
7. User clicks **“Understand my dream”**. A vision-language model returns tentative labels like *Tropical escape* / *Warm summer light*; never present speculation as a fact. Show **“Does this feel right?”**, editable theme/title/keywords and optional style suggestions.
8. User clicks **“Create my wallpaper”**. The app chooses a layout, arranges uploaded and optionally sourced images, adds 1–2 original quotes and 2–5 decorative SVG stickers. The image should look intentionally art-directed—not like a rigid photo grid.
9. User can switch layouts, drag/resize/crop photos, change palette and typography, remove/replace imagery, edit/regenerate quotes, adjust layers and undo mistakes.
10. User saves the editable board, then exports PNG at chosen size. In logged-in mode, it appears on the dashboard.

### Sample user journeys

**Career:** Upload skyscrapers, a sunlit office, elegant desk setups. AI suggests **“Building the future”**, a purple-pink editorial style, city/architecture keywords and a short original quote like “Make room for the life you're building.” User confirms and exports a desktop background.

**Vacation:** Upload palm trees, beaches and sunsets OR write “Slow summer mornings in Bali.” AI proposes **“A summer to remember”**, warm yellow/pink tones, waves/sun motifs and a bright photo-led board.

**Mixed dreams:** Upload several unrelated images. AI detects multiple candidate themes and offers a primary theme selector or the option **“Blend these dreams”** rather than forcing one meaning.

## 3. MVP feature specifications

### F01 — Authentication

- Supabase Auth: email/password signup, login, logout, verified user state, password reset; Google OAuth optional if configured.
- No fake sign-in. When Supabase keys are unavailable, offer an explicitly labeled **Local Demo Mode**, with data saved only in the current browser; do not claim users are authenticated or that data is securely synced.
- Authentication guards prevent users accessing other users' private boards/images.

### F02 — Image uploads

- Multi-file drag-and-drop, browse dialog, previews, remove/reorder, progress bar, retry; support 1–20 images per board (default UI guidance 4–12).
- Validate MIME type, extension, size and safe image decoding on client and server; strip or ignore sensitive EXIF where practical; use private storage bucket and user-scoped policies.
- Create small thumbnails for AI analysis to reduce cost; retain original high-quality files for export.
- Provide user-controlled deletion of original uploads.

### F03 — Dream text input

- Free-form description, 10–1000 characters suggested; examples and optional topic chips (career, travel, wellness, study, creativity, lifestyle), mood chips, preferred words, optional excluded terms.
- User can write in any language; default output language matches their input where supported; language is editable.
- No minimum photo count in text-only mode.

### F04 — AI intent interpretation

- A single multimodal model handles both photo understanding and short original text generation; code should separate **interpretation** from **presentation/composition**.
- Analyze only themes visible in photos and explicitly supplied goals. Do **not** infer sensitive personal facts, identity, ethnicity, medical/mental state, socioeconomic status, or facial traits.
- Respond with structured, schema-validated JSON containing theme candidates, mood, palette, image search terms, sticker motifs, quotes, layout suggestion and optional clarification.
- The result is **editable**. If confidence is low or photos conflict, ask the user to confirm. Prefer “These photos suggest...” instead of “Your true dream is...”.
- Privacy disclosure and opt-in before sending images to a third-party AI provider, especially where a free tier permits provider-side data improvement.

### F05 — Visual sourcing

- Priority order: **(1) user-uploaded images, (2) vetted bundled demo/CC0 assets, (3) image discovery via Openverse, filtering for CC0/public-domain or explicitly permitted licenses, (4) optional AI image generation**.
- Openverse is a search index, not a blanket license guarantee. Check and store source URL, creator, license, license URL and attribution for every chosen image. If rights are unclear, do not auto-use it. Keep credits accessible in board metadata / export credits where required.
- Do not use Pexels/Unsplash as a default wallpaper-generation image backend: their API guidelines restrict wallpaper-like services.
- When remote image fetch fails, show curated local backgrounds / stickers and let the user upload images; do not return broken image links or a blank board.
- A **photo review/picker** may show suggested candidates before use. Provide removal and replacement.
- Remote image URLs cannot silently taint the export canvas. Proxy/copy permitted assets on server with CORS-safe handling and licensing checks.

### F06 — Optional AI image generation

- The **default MVP must work without paid image generation**.
- Provide an adapter interface `ImageGenerationProvider` with a disabled-by-default provider for **FLUX.1 Schnell (Apache 2.0)**, via a separately configured inference endpoint or user-managed local service.
- Do not download and self-host a huge diffusion model inside the standard Next.js/Vercel process; hosting a GPU is not assumed free.
- Explicitly show “Generate extra AI photos (optional)” and a per-board or per-generation limit (e.g., max 2 additions), with a cost notice before calling paid APIs.
- AI-generated text must be overlaid by the editor, not painted into image-generation prompts, to ensure readable spelling and editability.

### F07 — Wallpaper composition

- Use a **deterministic editor/rendering engine** (recommended: Fabric.js) to create high-quality arranged layers from images, text, shapes and vector stickers.
- Default canvas 16:9, support **1920×1080, 2560×1440, 3840×2160**, plus **1080×1920** portrait preset if practical.
- Five templates: **Editorial Grid**, **Gallery Wall**, **Modern Scrapbook**, **Minimal Focus**, **Dream Magazine**. Distinct layouts, not five palette swaps.
- Composition rules: asymmetry with balance; at least one hero image; consistent spacing; avoid cropping faces or main subjects when possible; clear quote focal point; readable contrast; no collisions outside canvas; preserve user images in meaningful proportion.
- Limit clutter: maximum 2 visible quotes, 2–5 decorative stickers by default, typography hierarchy, adjustable margins; no giant watermark. All image and text objects editable.
- All frames, boxes, image corners and controls use **square or nearly square corners** (0–6px radius). Avoid pill shapes, large rounded cards and glassmorphism.

### F08 — Smart quote studio

- AI creates 3 **original** short motivation quotes based on a confirmed dream; user selects 1–2. Provide **regenerate**, **edit**, **delete**, **font**, **size**, **position** and **color** controls.
- No made-up author names or unattributed famous quotes. Do not copy recognizable lyrics or copyrighted passages.
- Quote styles: dreamy/soft, bold/ambitious, minimalist/elegant. Default max ~8–16 words each, natural rather than cliché.
- Quote typography is rendered as editable text objects, never inside an AI image.

### F09 — Sticker / decorative asset system

- Built-in SVG packs: **sunburst, hand-drawn star, sparkle, flower, cloud, wave, compass, postage stamp, bow, arrow, dashed route, ticket, masking tape, heart outline, tiny polaroid frame**.
- Stickers are clean vector illustrations/graphic motifs—not native OS emoji. **No emoji as website icons, controls or decorative stickers.** Use Lucide icons for functional UI.
- AI returns *sticker tags*; a mapping function selects curated SVG assets, adjusting size/rotation/color to match mood. No separate AI agent or paid call is necessary.
- Users can search the stickers and add/remove/recolor/rotate them.

### F10 — Editable board studio

- Left panel: assets (uploads, sourced images, stickers, text). Center: scalable canvas. Right panel: selected object properties, theme, template and export tools.
- Tools: select/move/resize/rotate/layer up-down/delete; image crop/fit, replace image; text edit; palette and typography edit; keyboard delete/escape; undo/redo; zoom and fit-to-screen.
- Canvas is responsive with a mobile-friendly simplified editor, although **desktop is the primary design target**.
- Save editable board JSON, image references and thumbnail; do not save just a flattened PNG.
- Provide visibly working buttons and state: no inert controls, dead ends, fake downloads or placeholder backend endpoints.

### F11 — Saving and exporting

- PNG export to the exact selected resolution; optional JPG. Preserve proportions, image quality and crisp SVG/text when rasterizing.
- Show a real download action and success/error states; default filename `dreamcanvas-{project-title}-{resolution}.png`.
- Private saved projects are user-owned with correct Row Level Security. Gallery cards preview, rename, duplicate and delete.
- Export metadata / attribution link is available where external licenses require it.

### F12 — States and feedback

- Loading skeleton / progress stage: **Reading your inspiration → Finding the mood → Composing the wallpaper → Polishing details**. Stages must reflect real activity, not deceptive fake progress.
- Friendly errors for missing keys, unsupported image, network interruption, failed AI response, licensed asset unavailable, storage full, generation timeout.
- AI failures should degrade to a usable **manual/template mode**, not a white screen or lost uploads.

## 4. Art direction & design system

### Creative concept

A playful, premium, Gen-Z-friendly editorial design. Imagine a mix of **digital scrapbooking + creative design studio + colorful magazine layout**. It should feel youthful and joyful but still **polished, editorial, and trustworthy**—not childish. The design is colorful without looking cluttered.

### Non-negotiable visual rules

- **Pink, yellow and purple** are the principal brand colors.
- **SQUARE geometry everywhere:** cards, popups, icon containers, image frames, input boxes, toolbar buttons and modals use hard corners or max 6px radius. **No pill buttons and no bubbly rounded interface.**
- **NO emoji** in the interface, cards, labels, progress steps or sticker library. Use designed SVG motifs and Lucide line icons instead.
- Contrasting 1.5–2px dark outlines, small editorial offset shadows, grid divisions, layered paper effects, offset borders, modern intentional composition.
- Accessibility matters: use dark ink on pale fields for main body copy, clear input labels, focus outlines, keyboard navigation and readable contrast.

### Design tokens

| Token | Hex / value | Use |
|---|---|---|
| Pink / primary | `#FF72B5` | Main CTAs, highlights |
| Butter yellow | `#FFE36F` | Warm panels, stickers |
| Lilac | `#BEA4FF` | Secondary emphasis |
| Deep violet | `#6F4DCE` | Accents, active state |
| Soft pink | `#FFE2F0` | Subtle page bands |
| Cream | `#FFF9F1` | Main background |
| Dark plum | `#241B32` | Text, outlines |
| White | `#FFFFFF` | Editor surfaces |
| Border | `2px solid #241B32` | Shapes and outlines |
| Corner radius | `0–6px` | Square visual language |
| Shadow | `4px 4px 0 #241B32` | Editorial lift |

Typography: use **Space Grotesk** or **Bricolage Grotesque** for bold headers; **DM Sans** for UI and body; optional tasteful italic serif accent for inspirational quotes (e.g., **Instrument Serif**). Keep fonts available via dependable hosted or local sources and provide fallbacks.

### Key page composition

**Landing:** strong editorial hero: left column large “Put your dreams on your desktop.”, two sharp-corner CTAs; right column layered mockup collage made from local demo artwork. Under hero: 3-step explainer, gallery examples for travel/career/creative goals, FAQ and footer.

**Dashboard:** a prominent “New dream board” panel, visual project gallery with square preview thumbnails, recent board actions; blank state is attractive and actionable.

**Create wizard:** split layout; input panel on left and live aesthetic preview on right. Clear tabs “Upload photos” and “Describe a dream”; allow Both. Progress and confidence-building microcopy.

**Review:** show inferred title, theme chips, color swatches, suggested quotes and image keywords; user can edit and approve. “This is just a suggestion” when analyzing uploads.

**Editor:** premium graphics-tool layout; clear left/right tools, usable canvas, top navigation and save/export button, responsive zoom. Avoid giant persistent marketing components here.

### Motion and animations

- Introduce tasteful animated collage assembly, gently floating sticker layers, drag-and-drop response, hover shifts and subtle page transitions.
- Use Motion for React or CSS transforms where appropriate. Prefer 160–350 ms micro-interactions; avoid janky or constant distracting motion.
- Respect `prefers-reduced-motion` and keep functional interactions usable without animation.
- **Use the user-provided links in `references/animation-links.md` as motion references.** Study what they show, implement similar behavior without copying unauthorized source/assets. If files are inaccessible, use the descriptions and provide a fallback rather than inventing what was in them.

## 5. Technical architecture and low-cost strategy

### Recommended stack

- **Frontend and backend:** Next.js (App Router), React, TypeScript, Tailwind CSS; server-side route handlers / actions.
- **Canvas:** Fabric.js, with scene JSON persistence and high-resolution rendering/export; keep the editor isolated behind client components.
- **Animation:** Motion for React and CSS.
- **Icons / stickers:** Lucide React + first-party custom SVG components.
- **Authentication / database / file storage:** Supabase Auth, Postgres and private Storage buckets with Row Level Security.
- **AI provider:** Gemini API, default configurable model `gemini-2.5-flash-lite` for image+text interpretation and original quotes; structured JSON + schema validation (e.g., Zod). No API key in frontend code.
- **Open-source local AI option:** optional `Qwen3-VL` via Ollama adapter (`qwen3-vl:4b` as one lower-resource choice), not a dependency of production deployment; models require significant local compute and are *not* “free cloud hosting.”
- **Asset discovery:** Openverse API or manually curated licensed local image pack; filter usage rights with license checks. Avoid scraping Google Images.
- **Optional image generation:** FLUX.1 Schnell through a configurable provider/inference service. Disable by default, never assume free GPU hosting.
- **Deployment:** Vercel or equivalent for the Next.js site; Supabase for persistence; optional remote AI endpoints.

### Why one AI model is enough

Do **not** build an elaborate multi-agent orchestration system for MVP. One multimodal model can do the image theme analysis and write original quotes in **one structured response**. A normal layout algorithm maps the response into composition, colors, stock search queries and vector assets. This is cheaper, faster and easier to debug than maintaining a separate “sticker agent” or “quote agent.”

### AI pipeline

```text
User: 1–20 photos and/or text
  ↓ validate, deduplicate, resize image copies for AI
Vision / text interpreter (ONE model request)
  ↓ structured JSON (theme, mood, palette, search, quotes, sticker tags)
User review & corrections
  ↓
Image selector (user photos first; license-aware open assets)
  ↓ optional image generation only if enabled
Deterministic layout composer (Fabric.js + SVGs + text objects)
  ↓
Editable canvas + autosave/Save
  ↓
Full resolution PNG export
```

### Provider privacy note

Free API tiers can have different privacy/data-use terms than paid tiers. Disclose when user photos will be processed by third-party AI; require affirmative user action and offer a manual non-AI route. Explain where photos are stored and enable deletion. Configure production around the chosen provider's current terms, not assumptions.

### AI JSON contract (example)

Validate and normalize all output on the server. Do not trust LLM freeform text to be valid scene coordinates or executable code.

```json
{
  "boardTitle": "Golden Summer Escape",
  "themeCandidates": [
    { "name": "tropical travel", "confidence": 0.92 },
    { "name": "slow summer living", "confidence": 0.76 }
  ],
  "themeSummary": "Warm travel scenes and peaceful sunny landscapes",
  "mood": ["sunlit", "free", "soft"],
  "palette": ["#FF72B5", "#FFE36F", "#BEA4FF"],
  "searchQueries": ["Bali tropical sunset", "Maldives sandy lagoon"],
  "stickerTags": ["sunburst", "wave", "sparkle"],
  "quotes": [
    "Make space for the days you dream about.",
    "Your next chapter can feel like sunshine.",
    "A little closer to your own horizon."
  ],
  "recommendedLayout": "editorial-grid",
  "clarificationQuestion": null
}
```

### Suggested model instructions

**Interpretation:** “You are the art director of a motivational wallpaper studio. Given optional images and the user's own stated dream, suggest visual themes, moods, a palette, search queries, decorative sticker labels, a suitable layout and three concise ORIGINAL motivational quotes. Treat image-derived meaning as a tentative suggestion. Do not identify people or infer sensitive personal traits. Do not invent authors, quote lyrics or provide copyrighted famous quotations. Match the user's chosen language. Return only JSON matching the provided schema.”

**Composition:** Never ask the LLM to output absolute pixel coordinates. Use a deterministic template engine to place objects within safe canvas bounds, with constraint checks and editable layers.

### Example database schema (implement migrations)

| Entity | Minimum columns |
|---|---|
| `profiles` | `id` (auth user), `display_name`, `created_at` |
| `boards` | `id`, `user_id`, `title`, `description`, `theme_json`, `canvas_json`, `width`, `height`, `thumbnail_path`, `created_at`, `updated_at` |
| `board_assets` | `id`, `board_id`, `user_id`, `source_type`, `storage_path`, `source_url`, `license`, `license_url`, `attribution`, `created_at` |
| `generations` | `id`, `board_id`, `user_id`, `provider`, `status`, `metadata_json`, `created_at` |

Enforce `user_id = auth.uid()` via RLS for every private table/bucket; validate ownership in server handlers; avoid public writable storage. Store minimal necessary data and a configurable deletion policy.

### Suggested API endpoints

- `POST /api/analyze` — validated text/image references, provider call, validated structured output.
- `GET /api/assets/search?q=...` — licensed source lookup with metadata/rate limiting.
- `POST /api/assets/upload` — authenticated upload or signed storage flow.
- `POST /api/boards` / `GET /api/boards` — create/list user boards.
- `GET /api/boards/:id` / `PATCH /api/boards/:id` / `DELETE /api/boards/:id` — read/save/delete owned board.
- `POST /api/images/generate` — optional guarded, rate-limited paid-provider adapter.

Use server-side secrets, request-size limits, rate limits and input validation. Pick idiomatic Next.js/Supabase architecture instead of overengineering the endpoint list.

### Example environment variables

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
OPENVERSE_API_BASE=https://api.openverse.org/v1
ENABLE_AI_IMAGE_GENERATION=false
IMAGE_GENERATION_API_KEY=
```

No real secrets in version control. Supply `.env.example` and a `.gitignore`; never put service-role keys in browser bundles. Use validated / current SDK env names as appropriate.

## 6. Quality, accessibility, security and performance

- **Responsive:** 1440px wide desktop is primary, supports tablet/mobile and touch-friendly actions; no horizontal overflow on phones.
- **Accessibility:** semantic HTML, keyboard support, labels, focus states, alt text for meaningful pictures, `prefers-reduced-motion`, color contrast for body text and controls.
- **Performance:** avoid uploading full-size photos to AI unnecessarily, lazy-load galleries, create thumbnails, cap generation inputs, use dynamic imports for client canvas editor.
- **Security:** image upload validation, quotas/rate limits, XSS-safe rendered quotes, no arbitrary remote image SSRF, private storage, RLS, CSRF-appropriate auth protections, project ownership checks, logging without user-photo payloads.
- **Privacy:** simple privacy notice, opt-in for third-party AI image processing, user-initiated image/account deletion; do not publicly index private boards; no training user images for proprietary models.
- **Reliability:** skeletons and error states, autosave or explicit save with status, retry, recoverable drafts, deterministic fallbacks.

## 7. Build order, acceptance tests and deliverables

### Implementation sequence

**Phase A (build in same project, first):** Next.js app + design system + responsive landing + signup/login + dashboard + mode wizard, Supabase schema/policies + local demo mode.

**Phase B (same delivery):** real upload flow, text input, AI-analysis adapter + schema validation, editable review screen, local fallback.

**Phase C (same delivery):** 5 real canvas layout templates, editable photo/text/sticker layers, quote studio, save/reopen, full-resolution PNG export.

**Phase D (same delivery):** optional license-aware asset search, robust UX states, tests, docs and deployment instructions. AI image generation is a plugin/future option and **must not block release**.

### Measurable acceptance criteria

1. New visitor can use an explicitly labeled demo **without any API keys**, upload local pictures, select a layout, add/edit a quote, create and export a genuine PNG. No pretending demo heuristic equals AI.
2. With Supabase configured, a user signs up/logs in, saves a board, refreshes, and reopens it with editable layers intact.
3. User A cannot view/edit/delete User B's private board or uploads, confirmed by negative tests.
4. With Gemini configured and consent given, 3 travel photos produce an editable *suggested* summer/travel theme and original quote choices; a user can correct it.
5. Text-only input creates a board using vetted bundled imagery or suitably licensed discovered assets, not a blank screen.
6. “Create wallpaper” builds a real 16:9 composition with images, text and SVG accents, with no off-canvas errors.
7. PNG exports have exact selected dimensions (including 3840×2160), contain all intended visible elements, and do not contain image CORS errors.
8. Images can be dragged, resized, replaced and removed. Quotes can be edited; stickers can be added/removed; undo/redo work.
9. `npm run lint`, `npm run typecheck`, tests and production build pass; provide runnable setup/deployment docs.
10. Square frames and editorial outlines throughout; main palette pink/yellow/purple; **no emoji-based iconography**; animations are smooth and honor reduced-motion preferences.
11. No default payment, subscription, paid image-generation key or hosted GPU is required to test the local MVP.
12. With API keys absent, missing functions are openly marked as unavailable and manual/local fallbacks work. Never create fake successful authentication or silently fabricate AI results.

### Tests expected

- Unit tests for AI JSON validation, theme-to-sticker mapping, template constraints, quote filtering and filename sanitization.
- UI tests for upload/removal, text mode, style switching, adding sticker, quote editing and download.
- Integration tests for RLS rules, owned board CRUD, server secrets and image license metadata.
- One end-to-end desktop happy path and at least one responsive mobile smoke test.

### Output from coding assistant

- Complete project files, not a pseudocode plan.
- Working TypeScript app and database migration SQL.
- All five templates and local demo assets, with documented asset provenance.
- `.env.example`, `README.md`, `SETUP.md`, `DEPLOYMENT.md`, and test scripts.
- An actual tested sample board users can generate offline/local-demo.
- A short list of exactly which external credentials are still needed for live auth, cloud storage, AI analysis and optional image generation.
- Build/test results and explicit honesty about unimplemented or blocked provider integrations.

## 8. Handling user's visual references (mandatory for Claude)

The user will provide a `references/` folder with screenshots, images and optional short videos, plus `references/animation-links.md` containing links to animation examples.

- Read and inspect **all available reference files and links before finalizing UI implementation**.
- Extract a design system from references: dominant colors, composition, spacing, typography, borders, frames, sticker style, motion timing, and interaction patterns.
- Adapt inspiration into a cohesive *original* design. Do not directly copy an existing brand's protected artwork, commercial assets or source code.
- If a reference conflicts with this PRD (e.g., round corners versus requested squares), follow the user's explicit preference for **square frames and no emojis**.
- If a link cannot be opened, continue with the PRD's detailed baseline; mention that specific link in the implementation notes.
- Never discard supplied references and replace them with generic AI-design defaults.

## 9. Cost and provider decisions

| Service | MVP requirement | Cost strategy / caveat |
|---|---|---|
| Next.js / Fabric.js / Lucide | Yes | Open-source software; deployment may have charges |
| Supabase | Yes for accounts; optional in local demo | Free plan may fit initial tests; 1 GB file storage and usage limits; free projects may pause after inactivity |
| Gemini 2.5 Flash-Lite | Yes for actual AI behavior | API billing by image/text tokens; free-tier privacy/use terms differ from paid; implement quotas and caching |
| Ollama + Qwen3-VL | Alternative | Model download/local hardware requirements; no external API token bill, but compute isn't free |
| Openverse | Optional but useful | Search openly licensed images; verify individual image rights and attribution requirements |
| FLUX.1 Schnell | Optional add-on | Model weights permissively licensed, but GPU or hosted inference generally costs money |

**Important:** A free API/model does not imply free hosting or unrestricted commercial usage. Do not assume any image source permits a stand-alone wallpaper app. The safest inexpensive default is user-owned uploads + bundled permitted assets + original SVG artwork + one economical vision-language API request.

## 10. Source links and background reading

- Gemini API models/pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Qwen3-VL on Ollama: https://ollama.com/library/qwen3-vl
- FLUX.1 Schnell license/model card: https://github.com/black-forest-labs/flux/blob/main/model_cards/FLUX.1-schnell.md
- Openverse API: https://docs.openverse.org/api/reference/made_with_ov.html
- Openverse search: https://openverse.org
- Pexels API restrictions: https://www.pexels.com/api/documentation/
- Unsplash API restrictions: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines
- Fabric.js Canvas docs: https://www.fabricjs.com/api/classes/canvas/
- Supabase pricing: https://supabase.com/pricing
- Supabase documentation: https://supabase.com/docs

**End of PRD**
