# Cyber Escape Room Platform

A browser-based cybersecurity training game. Solve 6 security puzzles to escape a locked digital training room.

## Features

- **6 rooms:** Phishing, Passwords, Caesar Cipher, SQL Injection, Log Analysis, Social Engineering
- **Game systems:** Timer, score, lives, hints, sound effects, volume control
- **AI tutor:** Contextual explanations when you get answers wrong
- **Final quiz** and printable certificate
- **Teacher dashboard:** View student scores, export CSV, create custom rooms

## Quick start

```bash
npm install
npm start
```

- **Game:** http://localhost:3000
- **Teacher dashboard:** http://localhost:3000/teacher

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: SQLite

## Optional

Set `OPENAI_API_KEY` for enhanced AI tutor responses (works without it using built-in templates).
