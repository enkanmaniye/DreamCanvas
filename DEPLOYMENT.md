# Deployment

Vercel is the simplest host for Next.js. Hosting, Supabase and AI providers each have their own limits and possible charges, so check their current plans.

1. Put the project in a **private** GitHub repository. `.gitignore` already keeps `.env.local` out.
2. At https://vercel.com, choose **Add New > Project** and import the repository.
3. Add the variables from your `.env.local` under **Environment Variables**. Leave `AI_PROVIDER` blank or set it to `gemini`: Ollama on your own computer can't be reached from Vercel.
4. Deploy, then copy your site's address.
5. In Supabase under **Authentication > URL Configuration**, set Site URL to that address and add it to Redirect URLs.

## Before real users arrive

- **Run the live privacy test** in SETUP.md against a test project.
- **Upload size:** Vercel limits request bodies to about 4.5 MB. Photos are compressed in the browser to about 3.5 MB or less, which should fit, but test with your largest images.
- **Rate limits** are stored in server memory, so each serverless instance counts separately. They guard against casual overuse, not a determined attacker. Use a shared store such as Upstash Redis before a public launch, and set a spending cap with your AI provider.
- **Gemini free tier:** set `GEMINI_PAID_TIER=true` only when billing is really enabled, because it changes what people are told about their photos.
- **Gemini models change often.** If suggestions stop, the app falls back to keyword rules and says why. Update `GEMINI_MODEL` to fix it.
- **Security headers** are set in `next.config.mjs`. A full Content Security Policy isn't configured yet.
