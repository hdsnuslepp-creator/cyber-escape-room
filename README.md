# Cyber Escape Room Platform

A browser-based cybersecurity training game. Solve 6 security puzzles to escape a locked digital training room.

## Play online (GitHub Pages)

After pushing to GitHub and enabling Pages, the game is playable at:

**`https://YOUR-USERNAME.github.io/cyber-escape-room/`**

On GitHub Pages you get the full **game** (all 6 rooms, quiz, certificate, sound, AI tutor with built-in hints). The **teacher dashboard** (scores, CSV export, custom rooms) needs the Node server below.

## Full platform (local)

```bash
npm install
npm start
```

- **Game:** http://localhost:3000
- **Teacher dashboard:** http://localhost:3000/teacher

## Enable GitHub Pages

1. Push this repo to GitHub
2. Open the repo → **Settings** → **Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Push to `main` (or `master`) — the workflow deploys the `public/` folder automatically

Your live URL will appear under **Settings → Pages** after the first successful deploy.

## Features

- **6 rooms:** Phishing, Passwords, Caesar Cipher, SQL Injection, Log Analysis, Social Engineering
- **Game systems:** Timer, score, lives, hints, sound effects, volume control
- **AI tutor:** Contextual explanations when you get answers wrong
- **Final quiz** and printable certificate
- **Teacher dashboard:** View student scores, export CSV, create custom rooms (requires `npm start`)

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express (local / self-hosted only)
- Database: SQLite (local / self-hosted only)

## Optional

Set `OPENAI_API_KEY` for enhanced AI tutor responses when running the Node server (works without it using built-in templates).
