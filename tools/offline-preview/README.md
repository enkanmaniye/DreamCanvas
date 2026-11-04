# 🌸 GoalCanvas — Visualize Your Dreams

**Turn your dreams into something you can see every day.**

GoalCanvas is an AI-powered dream visualization app that transforms personal goals, ideas, and photos into beautifully designed vision boards and motivational wallpapers.

## ✨ What Does GoalCanvas Do?

GoalCanvas helps users visualize their ambitions through two creative experiences:

**📸 Dream From Photos**

Upload images that represent your dreams. AI analyzes their themes and creates a personalized vision board with matching visuals, motivational quotes, and decorative elements.

**💭 Dream From Words**

Describe your goals in natural language, whether it's traveling to Bali, building a successful career, or living your dream lifestyle. GoalCanvas transforms your description into a visual composition.

## 🎨 Key Features

- AI-powered dream interpretation
- Personalized vision boards and desktop wallpapers
- Photo uploading and text-based dream creation
- Motivational quotes and decorative stickers
- Customizable layouts, colors, and visual elements
- High-resolution wallpaper downloads
- User accounts and saved creations

## 🚧 Development Status

**Currently in active development.**

GoalCanvas is an evolving project. Features listed above represent the product vision and may not all be implemented yet.

## 📖 Product Documentation

Read the [Product Requirements Document](docs/PRD.md) for the complete product vision, requirements, and planned functionality.

## 🌈 Our Vision

*Make dreams visible, personal, and inspiring — one canvas at a time.*

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
