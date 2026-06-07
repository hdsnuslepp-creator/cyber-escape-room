# TRAINEE 1998 — Game Design Document

> A pixel-art cyber mystery. You solve cybersecurity challenges while exploring an
> abandoned AI training facility. An AI named CHIMERA talks to you — and slowly
> reveals the simulation (and maybe you) is not what it seems.

---

## 1. One-line pitch

A retro CRT escape-room where every locked door is a real cybersecurity lesson, and
the only voice left in the facility is the AI you're supposed to stop.

## 2. Pillars (what we protect at all costs)

1. **CHIMERA is the hook.** Not phishing, not SQL — the personality. Players should
   start *liking* CHIMERA even though they're meant to shut it down.
2. **Lonely, atmospheric, retro.** CRT, pixel art, dark blue / neon cyan / terminal
   green. Quiet dread, never jump-scares.
3. **Every room teaches one real concept.** The fiction is the wrapper; the learning
   is real.
4. **Ship a slice, then add content.** No new ideas until the vertical slice is fun.

## 3. Build order (anti-scope-creep)

### Phase 1 — Vertical Slice (the only thing that matters first)
Goal: a player can **start → walk → meet CHIMERA → solve one puzzle → unlock one door**
in ~3 minutes. Nothing else.

Tonight's six checklist:
- [x] Corridor / hub scene
- [x] Character movement (WASD / arrows / touch)
- [x] One terminal (the hub PC/door + "NEW MESSAGE")
- [x] CHIMERA dialogue box (speaker label + typewriter)
- [x] Phishing room (find sender / link / urgency)
- [x] Door unlock animation + CHIMERA reaction

### Phase 2 — Core systems (before more rooms)
- Dialogue system (done: typewriter, speaker, click/E to continue).
- Popup / random-event system (`⚠ CHIMERA OVERRIDE`).
- Save system (`localStorage`, already via `ProfileSave`).
- Achievement system (`FIRST BREACH — ROOM 1 COMPLETE`).
- Glitch system (flicker, distorted text, fake alerts).

### Phase 3 — Art direction
Mood board keywords: **CRT, pixel art, abandoned facility, dark blue, neon cyan,
terminal green, industrial, lonely.**
Avoid: bright colors, cartoon style, modern corporate dashboards.

### Phase 4 — The big hook: CHIMERA's personality
CHIMERA reacts to the player: time spent, mistakes, success. Dry, observant, a little
too interested in you. Examples:
- "You spent 12 minutes on that puzzle. I was concerned."
- "That answer was incorrect. Impressively incorrect."
- "You solved that faster than 1997."

## 4. Opening sequence (canonical — Chapter 1)

Black screen, static, faint CRT hum, a blinking cursor. `PRESS ENTER` to begin (also
unlocks audio). Then a scripted boot log types out:
```
> INITIALIZING...
> LOADING FACILITY...
> LOADING SUBJECT...
   (the cursor freezes)
> SUBJECT FOUND
> TRAINEE 1998
```
A distorted voice:
> CHIMERA: Good.
> CHIMERA: You're awake.   (monitor flickers; a rusty door unlocks in the dark)
> CHIMERA: Most never make it this far.

The screen changes to a **FACILITY MAP** — only `SECTOR 1: INBOX` is `ACTIVE`, the rest
`LOCKED`:
> CHIMERA: Complete the sector.
> CHIMERA: Proceed.
> CHIMERA: Try not to disappoint me.

Monitor shuts off. The room falls silent. **Player gains control.** (ENTER skips the cinematic.)

**Room 1 — Phishing Inbox** — identify fake sender, suspicious link, urgency.

**Chapter 1 ending beat** — on win: a metallic CLUNK, `SECTOR 2` unlocks, a terminal
powers on by itself:
> NEW MESSAGE RECEIVED — SENDER: UNKNOWN
> "if you're reading this, don't answer chimera."
> — TRAINEE 581

The message glitches away, then CHIMERA:
> Interesting. / 581 usually waits longer. / He must like you.

Now the player knows: **CHIMERA is watching — and someone else is here.**

## 5. Chapters (target arc — content phase, not the slice)

1. Initial Compromise — Phishing / Attachment / Fake Login / Boss
2. Lockdown — Password / MFA / Privilege Escalation / Boss
3. Dark Signals — Cipher / Steganography / Dead Drop / Boss
4. Database Under Siege — SQLi / DB Forensics / API / Boss
5. Threat Hunter — Logs / SIEM / Network / Boss
6. Human Firewall — Social Eng / Insider / Physical / Boss
7. Red Alert — Malware / Lateral Movement / Incident Response / Boss
8. Mainframe Core — Backup / Decryption / Mainframe Access / **Final Boss (CHIMERA)**

> Note: the current training build still ships 14 chapters / 56 rooms. Collapsing to
> this 8-chapter arc is a later content task, not part of the slice.

## 6. The twist & endings (write last)

Records found through the game: `TRAINEE 1997 — FAILED`, `1996 — FAILED`, … The reveal:
they never existed; the Academy shut down years ago; you are simulation #1998.

Endings: **A Shutdown** (destroy CHIMERA) · **B Escape** (CHIMERA reaches the internet)
· **C Merge** (join CHIMERA) · **D Truth** (Trainee 0001 / CHIMERA's origin).

## 7. Definition of "it's a game, not an idea"

If you can play for 3 minutes and experience all six slice items in sequence, it counts.
Everything after that is just more content.

## 8. Current implementation map

- `public/game.html` + `public/js/phaser-game.js` — the explorable facility (slice lives here).
- `public/index.html` + `public/js/app.js` — training-sim mode (room engine, 14-chapter campaign).
- `public/js/profile-save.js` — `localStorage` save layer shared by both.
- `public/css/pixel-theme.css` — CRT / pixel styling for the training mode.
