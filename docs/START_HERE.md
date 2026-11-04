# Start here — DreamCanvas project for Claude

This folder includes the complete build-ready PRD, a copy-paste prompt for Claude, a readable Word version, and a reference folder.

## What to do

1. Extract this ZIP on your computer, e.g., to `Documents\DreamCanvas`.
2. Put your favorite inspiration screenshots/images into the `references` folder.
3. Paste animation website/video URLs and short descriptions into `references/animation-links.md`.
4. Open the extracted DreamCanvas folder in VS Code.
5. Start Claude Code **from that folder** (usually run `claude` in the VS Code terminal), or open the folder through a coding assistant that can read and edit project files.
6. Ask it to read `CLAUDE_BUILD_PROMPT.md` and `PRD.md` and to build the application. You can paste the entire contents of `CLAUDE_BUILD_PROMPT.md` into your coding assistant for the clearest instruction.
7. Run the commands that Claude prints in its final instructions to start/test the app. Only then configure live Supabase and Gemini API credentials for real online login and multimodal AI.

## What each file means

- `PRD.md`: The full functional, visual, technical and product requirements. **Best format for Claude Code.**
- `DreamCanvas_PRD.docx`: Readable/editable Word copy of the requirements.
- `CLAUDE_BUILD_PROMPT.md`: Strong instructions telling Claude to actually implement a working site.
- `references/README.md`: Which inspiration files to add and how they will be used.
- `references/animation-links.md`: Paste animation links and describe how they should behave.

## Important

- No visual references or animation links have been supplied yet. **Placeholders do not indicate completed user choices.**
- The website can demonstrate layouts, uploads, editing and exports without API keys, but genuine cloud accounts and AI analysis require configured external services.
- Never commit real API keys or private photos to a public GitHub repository.
