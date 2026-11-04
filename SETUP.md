# Setup (Windows PowerShell)

## 1. Install Node.js

Install the LTS version from https://nodejs.org (version 22 or newer), then open a new PowerShell window:

```powershell
node -v
```

## 2. Start the app

Use your own path in the first line.

```powershell
cd "$HOME\Documents\DreamCanvas"
npm install
npm run dev
```

Open http://localhost:3000. Press `Ctrl+C` in PowerShell to stop it.

If PowerShell says running scripts is disabled, run this once and try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

That's everything you need for Local Demo Mode: upload photos, write a dream, edit the board, download real PNGs.

**If `npm install` or `npm run dev` shows an error,** copy the whole message to your coding assistant. This project couldn't be installed where it was built (see docs/IMPLEMENTATION_NOTES.md), so this is the first time these exact packages run together.

## 3. Add settings (optional)

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Restart `npm run dev` after any change. Never share `.env.local` or commit it to GitHub.

### AI suggestions: choose one

**Google Gemini (cheapest cloud option).** Create a key at https://aistudio.google.com/apikey and set:

```dotenv
GEMINI_API_KEY=your-key
```

The default model is `gemini-3.1-flash-lite`. Each board makes one request, which should cost well under a cent on the paid tier (an estimate; check Google's current pricing). There's also a free tier, but Google may use what's sent on it to improve its products, so the app warns people before sending photos. Once your project has billing, set `GEMINI_PAID_TIER=true`.

**Ollama (free, open source, private).** Photos stay on your computer, but you need a capable machine: the model is a 3.3 GB download and a GPU with about 6 GB of memory is recommended. Install from https://ollama.com, then:

```powershell
ollama pull qwen3-vl:4b
```

```dotenv
AI_PROVIDER=ollama
```

### Accounts and cloud saving (Supabase)

1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste all of `supabase/migrations/0001_init.sql`, and run it.
3. In **Project Settings > API**, copy the URL and keys into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. In **Authentication > URL Configuration**, set Site URL to `http://localhost:3000`.
5. Check the privacy rules on your real project. **Use a test project, because this creates and deletes two users:**

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run test:integration
```

Google sign-in is optional. Turn it on under **Authentication > Providers**.

### Optional extra AI photos

Off by default and never needed. Set `ENABLE_AI_IMAGE_GENERATION=true` and `IMAGE_GENERATION_API_URL` to an endpoint you run or rent. It takes `{ prompt, width, height }` as JSON and returns image bytes. Hosted image generation usually costs money.

## 4. Run the checks

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
```

`npm run check` runs lint, types, unit tests and the build together.

## Your reference images

They're in `references/`. Paste real links into `references/animation-links.md` if you want specific motion matched. The links are still placeholders.
