# Lucida

The flashcard database any AI can plug into. FSRS scheduling, clean flip cards, web + iOS.

## Design and web app

The design canvas is the source of truth for how the app looks: https://claude.ai/artifact/VLXyuTGdroHdrJ2qNAmiGs

- `design/` makes every canvas board (`node design/build.mjs`, checked by `node design/check.mjs`).
- `design/to-web.mjs` turns those boards into the web app's screens, so the app matches the canvas.
- `web/` is the web app. Run it with `npm run dev` and open http://localhost:3000 (no packages to install).
- http://localhost:3000/b lists every board, including empty states and dark mode.

## Online (Vercel + Supabase)

- Vercel builds the pages from the canvas boards (`vercel.json`), and `api/index.js` answers `/api`, `/auth`, `/mcp`, and `/media` with the same code as the local server (`web/handler.mjs`).
- **Sign-in** (`web/auth.mjs`, Supabase Auth): a 6-digit code by email, or Google and Apple through Supabase. The session lives in two cookies the page's scripts can't read, and renews itself before it runs out. Signed out, the app shows only the sign-in pages.
- **Each person has their own library**: one row in the `libraries` table (keyed by their user id), and their pictures and sound in their own folder of the private `media` bucket (`web/supa.mjs`). Each request works on its own copy (`withLibrary` in `web/store.mjs`), so people never see each other's cards.
- **Personal MCP links**: AI apps connect at `https://app.lucida.cards/mcp/lk_…`, shown on the Connect AI page. The link opens only that person's library; "Make a new link" there turns off the old one. (Plain `/mcp` works only on your own computer.)
- Vercel gets `SUPABASE_URL` and the keys from the Supabase integration. Without them, the app saves to `data/` on your computer and nobody signs in.
- **Landing page**: the Landing boards on the canvas become `web/landing.html` (`node design/to-site.mjs`), shown at lucida.cards. Its links open the app at app.lucida.cards.

Supabase settings sign-in needs (Supabase dashboard → Authentication):
- URL Configuration: Site URL `https://app.lucida.cards`, and Redirect URLs `https://app.lucida.cards/**`, `https://lucida-eight.vercel.app/**`, `http://localhost:3000/**`.
- Emails → "Magic Link" and "Confirm signup": put the code in the email with `{{ .Token }}`.
- Emails → SMTP: Supabase's own sender only mails the project's team, so real users need an email service (like Resend).
- Sign In / Providers: turn on Google and Apple with their own client ids (Google Cloud and Apple Developer). Until then, those buttons say they aren't set up yet.

## Your data and AI apps

- Decks, cards, and reviews are saved in `data/` on this computer (not in git). Settings → Your data exports or deletes them.
- On your computer, AI apps connect over MCP at http://localhost:3000/mcp. For Claude Code: `claude mcp add --transport http lucida http://localhost:3000/mcp`. The Connect AI page sets what an AI may do.
- AI apps can make image cards and audio cards (`web/media.mjs`). A picture can be a link, a file the learner uploaded in ChatGPT (ChatGPT needs Lucida on the internet to reach it), or a file on this computer (for AI apps running here, like Claude Code). For an audio card the AI sends the words and their language. Lucida turns them into speech with ElevenLabs or OpenAI when a key is in `.env` (`web/voice.mjs`); without a key, the app reads them aloud with the device's voice.
- `node design/snapshot.mjs against <old canvas folder>` lists boards whose look changed, so logic changes can be checked against the canvas.

## Card formatting

Cards are saved as short markdown (`web/rich.js` reads and writes it; the boards get a copy, so run `node design/build.mjs` after changing it). The editor works like a notes app:

- Start a line with `# `, `## `, or `### ` for a heading, `- ` for a bullet, `1. ` for a numbered list.
- Type `**bold**`, `*italic*`, `~~strike~~` (or `~strike~`), `==highlight==`, or `$math$` and it turns into that style. `[[word]]` makes a blank.
- Type `/` at the start of a line (or after a space) for a menu of headings, lists, a blank, math, an image, or audio. Keep typing to narrow it; ↑ ↓ and Return pick, Esc closes.
- ⌘B bold, ⌘I italic, ⌘U underline, ⌘⇧S strikethrough, ⌘⇧H highlight, ⌘⇧E math, ⌘⌥1–3 headings, ⌘⌥0 plain text, ⌘⌥5 bullets, ⌘⌥6 numbers, ⌘Z undo, ⌘⇧Z redo.
