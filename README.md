# DreamCanvas

Your dreams, on your screen. Turn photos or a few words into a designed vision-board wallpaper you can edit, save and download.

**New here? Open [SETUP.md](SETUP.md).** It has step-by-step Windows PowerShell commands.

```powershell
npm install
npm run dev
```

Then open http://localhost:3000. No keys are needed: without them the app runs in Local Demo Mode. Boards are saved in your browser and suggestions come from clearly labeled keyword rules, not AI.

| Document | What's in it |
|---|---|
| [SETUP.md](SETUP.md) | Running it, connecting accounts and AI, running tests |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Putting it online |
| [docs/IMPLEMENTATION_NOTES.md](docs/IMPLEMENTATION_NOTES.md) | What was built, what was tested, what wasn't, and why |
| [docs/ASSETS.md](docs/ASSETS.md) | Where every image and icon came from |
| [docs/PRD.md](docs/PRD.md) | The original requirements |

Stack: Next.js, TypeScript, Tailwind CSS, Supabase, and a small custom canvas engine in `src/lib/engine` and `src/lib/scene`.
