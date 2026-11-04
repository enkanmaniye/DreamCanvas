# Paste this message into Claude Code or Claude in a coding workspace

You are my senior full-stack engineer, UI/UX designer, and AI integration engineer. I do not know how to code. **Build the actual working website described in the attached `PRD.md`, not merely a plan or mockup.** The working project name is **DreamCanvas**.

### Critical instructions

1. **FIRST read `PRD.md` in full.** Inspect every available image, screenshot, demo video and other design asset inside `references/`, plus the inspiration and animation links in `references/animation-links.md`. Derive an original, coherent visual system from these references. If links cannot be accessed, continue with the PRD baseline and document which were inaccessible.
2. **Immediately implement the complete MVP in this repository.** Create files, install dependencies, build pages/components, implement real canvas editing/export, persistence, endpoints, migrations, and tests. Do not stop at advice, architecture diagrams, or a series of questions. Use reasonable defaults where the PRD leaves discretion.
3. **Visual design is essential:** vibrant pink + butter yellow + lilac/purple, magazine-like editorial collages, bold typography, dark outlined SQUARE cards/buttons/panels/frames (0–6px corner radius), offset shadows, tasteful animation. NO EMOJI anywhere in the UI or decoration. Use SVG stickers and Lucide icons.
4. **Functional basics must actually work:** (a) photo-upload-to-wallpaper, (b) text-to-wallpaper, (c) hybrid, (d) editable review of AI interpretation, (e) designed wallpaper with user images, extra licensed/demo images, stickers and editable original quotes, (f) real PNG download, (g) editable save/reopen projects when Supabase is configured, (h) auth with Supabase when configured.
5. Use **Next.js + TypeScript + Tailwind + Fabric.js + Supabase**. For AI use a server-side Gemini Flash-Lite adapter with a schema-validated JSON response. Provide an optional Ollama/Qwen3-VL adapter. Use simple rules to map the AI response to SVG stickers/layout rather than adding unnecessary paid “agents.” Optional FLUX.1 Schnell must be adapter-based and switched OFF by default.
6. **No paid credentials are included.** Make a beautiful, fully functional **LOCAL DEMO MODE** that can import user pictures, make editable boards and download real wallpapers without API keys. Clearly label demo-generated suggestions as non-AI; do not fake real login or cloud persistence. Wire actual provider integrations behind documented `.env` settings.
7. External photos must be licensed appropriately. Prefer user uploads, first-party/bundled permitted art, then Openverse with CC0/public-domain verification/attribution. Do not use Pexels/Unsplash API as the default image supplier for a wallpaper app. Never scrape images unlawfully or produce a blank output if sourcing fails.
8. All image uploads and projects must be private for real authenticated accounts; apply real Supabase RLS, robust validation and server-side secret handling. If a provider has free-tier data-use implications, show clear consent before sending personal photos.
9. The desktop wallpaper canvas must export **exact resolution PNG** at 1920x1080, 2560x1440 and 3840x2160. Editable scene objects must persist so the user can change them later. The board must look art-directed, not like a plain grid or a random pile of pictures.
10. Implement graceful loading/error/empty states, keyboard controls, undo/redo, accessible contrast, mobile responsiveness and reduced-motion handling.
11. **Run the app, inspect it, and fix issues**: execute lint, type checking, tests and production build. Address errors before calling work complete. If a real browser tool exists, verify the key user flow visually. Never claim a test was run if you did not run it.
12. At the end provide straightforward beginner-friendly commands for Windows PowerShell to start the app, a list of credentials needed for live integrations, where to put reference images, what is finished, and honest remaining limitations.

### Implementation priority

Deliver a complete, visually exceptional, functional local MVP first (no keys required), while implementing authentic Supabase/Gemini adapters for later configuration. Keep the code modular, reusable and documented. **Do not block the MVP on unavailable credentials or on an expensive GPU image generator.**

### Working directory

Use the folder containing this prompt and `PRD.md` as the project root, or create an `app/` subfolder if the root already contains my reference files. Do not overwrite/delete my reference images or notes.

**Start by inspecting the existing folder and my references, then create the complete project.**
