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
- **Sign-in for AI apps** (`web/oauth.mjs`, `supabase/oauth.sql`): Claude, ChatGPT, Grok, Gemini and other apps add `https://app.lucida.cards/mcp`, the person signs in to Lucida and presses Allow (the app's own page, the ConnectConsent board), and the app gets tokens (OAuth 2.1: PKCE S256, refresh tokens that work once each, apps identified by a registered `client_id` or by an https address, CIMD). `/mcp` takes that token (`Authorization: Bearer …`) or the old secret link; with neither it answers 401 and points at `/.well-known/oauth-protected-resource`. Only hashes of tokens are kept. Settings → Connect AI lists the apps a person allowed, with Disconnect. The address the documents name is `https://app.lucida.cards` (`LUCIDA_ORIGIN` sets another); this computer doesn't ask apps to sign in unless `LUCIDA_MCP_LOGIN=1`. Run `supabase/oauth.sql` before deploying (it only adds four tables).
- **Passwords** are optional: Settings → Account → Password sets one (Supabase's own), and sign-in has "Use a password". Directory reviewers, who can't get an email code, sign in this way.
- **Directories**: `server.json` is for the official MCP Registry (`mcp-publisher`; the domain proof is a file at `https://lucida.cards/.well-known/mcp-registry-auth`). The page people read is `lucida.cards/connect` (a board, `SiteConnect`, made into `web/connect-guide.html` by `design/to-site.mjs`; the app's own `/connect` is the Connect AI page). `samples/reviewer-library.txt` is four decks for the reviewer account: import it from the Welcome page (Bring your cards → Anki).
- Vercel gets `SUPABASE_URL` and the keys from the Supabase integration. Without them, the app saves to `data/` on your computer and nobody signs in.
- **Landing page**: the Landing boards on the canvas become `web/landing.html` (`node design/to-site.mjs`), shown at lucida.cards. Its links open the app at app.lucida.cards. The Privacy and Terms boards become lucida.cards/privacy and /terms (their words are in `design/legal.mjs`).
- **Gradient pictures**: the landing page and the sign-in wall move dozens of gradient cards, which phones can't redraw live, so there each card's colors come from a small picture in `web/art/` under one grain tile (`web/fast.css`). `node design/art.mjs` draws them with Chrome; run it after changing the wall cards (`design/wall.mjs`), the palettes, or the generator. The canvas still draws them live.

Supabase settings sign-in needs (Supabase dashboard → Authentication), all set:
- Emails → SMTP Settings: Resend (connected from Resend → Settings → Integrations → Supabase), sending as Lucida, team@lucida.cards. Supabase's own sender only mails the project's team, and templates can't be edited without this.
- Emails → "Magic link or OTP" and "Confirm sign up": the code in the email with `{{ .Token }}`.
- Sign In / Providers → Email: Email OTP Length 6 (the sign-in page has six boxes).
- URL Configuration: Site URL `https://app.lucida.cards`, and Redirect URLs `https://app.lucida.cards/**`, `https://lucida-eight.vercel.app/**`, `http://localhost:3000/**`.
- Sign In / Providers: turn on Google and Apple with their own client ids (Google Cloud and Apple Developer). Until then, those buttons say they aren't set up yet.

## Live (play with friends)

- From a deck on a computer, **Play live** opens a room (`/live/<code>`): the big screen shows a 6-digit code and a QR code, friends join on their phones at lucida.cards/join (or `/join/<code>` from the QR code) with a name and no account, and everyone answers the same questions, made from the deck's cards the way Learn mode makes them (or the questions the person's AI wrote). Points for right and fast answers, a leaderboard between questions, a podium, and the final leaderboard on each phone.
- The host's page runs the game (`web/live.js`): the questions, the time, and the points. It's kept in that tab, so a reload picks up where it was. Phones only send what was tapped; a phone that reloads, or the same name on another phone, gets its points back.
- Online, the messages go straight between the browsers over Supabase Realtime (public broadcast channels, with the project's public key), and each room's code is a row in the `live_rooms` table (`supabase/live_rooms.sql`) while it can be joined. On your computer the rooms stay in memory and the local server passes the messages along (`web/rooms.mjs`). `LUCIDA_LIVE_REALTIME=<Supabase project URL>` tries Realtime from your computer instead.

## Your data and AI apps

- Decks, cards, and reviews are saved in `data/` on this computer (not in git). Settings → Your data exports or deletes them.
- On your computer, AI apps connect over MCP at http://localhost:3000/mcp. For Claude Code: `claude mcp add --transport http lucida http://localhost:3000/mcp`. The Connect AI page sets what an AI may do.
- AI apps can make image cards and audio cards (`web/media.mjs`). A picture can be a link, a file the learner uploaded in ChatGPT (ChatGPT needs Lucida on the internet to reach it), or a file on this computer (for AI apps running here, like Claude Code). For an audio card the AI sends the words and their language. On Pro, Lucida turns them into speech with ElevenLabs or OpenAI when a key is in `.env` (`web/voice.mjs`); on Free, or without a key, the app reads them aloud with the device's voice. A link is looked up once and the connection goes to the address that was checked: nothing on this computer or its network (loopback, private, link-local like 169.254.169.254, shared, multicast and reserved addresses, and IPv4 written inside IPv6) can be fetched, and every way a link can fail says the same plain sentence. Each account has room for so many saved pictures and sounds (Free 500 files and 500 MB, Pro 5,000 files and 5 GB; `LUCIDA_MEDIA_FILES` and `LUCIDA_MEDIA_MB` set it lower for checks); `LUCIDA_TEST_LOCAL_LINKS=1` lets checks fetch from this computer's loopback address.
- Every sound shows its waveform (`web/sound.js`). Recording shows the microphone's level live. A clip's shape is worked out once on the device (from the recording or the uploaded file, or the first time an older clip is shown) and saved with its card, so it's there at once after that; the part already played fills in as it plays, and a tap or a drag on the waveform jumps there. Words read by the device's own voice get a waveform made from the words.
- `node design/snapshot.mjs against <old canvas folder>` lists boards whose look changed, so logic changes can be checked against the canvas.
- On your computer everything is Pro. `LUCIDA_PLAN=free npm run dev` shows the app as it is on Free, to check the Free screens.

## Card formatting

Cards are saved as short markdown (`web/rich.js` reads and writes it; the boards get a copy, so run `node design/build.mjs` after changing it). The editor works like a notes app:

- Start a line with `# `, `## `, or `### ` for a heading, `- ` for a bullet, `1. ` for a numbered list.
- Type `**bold**`, `*italic*`, `~~strike~~` (or `~strike~`), `==highlight==`, or `$math$` and it turns into that style. `[[word]]` makes a blank.
- Type `/` at the start of a line (or after a space) for a menu of headings, lists, a blank, math, an image, or audio. Keep typing to narrow it; ↑ ↓ and Return pick, Esc closes.
- ⌘B bold, ⌘I italic, ⌘U underline, ⌘⇧S strikethrough, ⌘⇧H highlight, ⌘⇧E math, ⌘⌥1–3 headings, ⌘⌥0 plain text, ⌘⌥5 bullets, ⌘⌥6 numbers, ⌘Z undo, ⌘⇧Z redo.
