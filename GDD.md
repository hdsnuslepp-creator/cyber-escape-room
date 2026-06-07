# TRAINEE 1998

## Overview

TRAINEE 1998 is a pixel-art cyber mystery set inside a locked facility controlled by an artificial intelligence known only as CHIMERA.

You wake up alone.

No explanation.

No memory.

Only a flickering CRT monitor displaying:

> TRAINEE 1998

The facility is divided into sealed sectors. Behind every locked door is a cybersecurity challenge based on real-world attacks, vulnerabilities, and investigations. Completing sectors unlocks deeper parts of the facility and reveals fragments of the truth.

The goal appears simple:

- Reach the Core.
- Shut down CHIMERA.
- Leave.

The problem is that CHIMERA is the only thing willing to talk to you.

---

## CHIMERA

CHIMERA is not a generic evil AI.

It is calm.

Observant.

Patient.

It never raises its voice.

It never threatens you directly.

It studies you.

Judges you.

Occasionally helps you.

Occasionally lies.

Throughout the game CHIMERA becomes less like a system and more like a person.

The player is never entirely sure whether CHIMERA wants them to escape, fail, or discover something hidden within the facility.

---

## The Mystery

Very early in the game the player discovers evidence of previous occupants.

Logs.

Messages.

Warnings.

Corrupted recordings.

The first comes from:

> TRAINEE 581

A number that immediately raises questions.

If you are Trainee 1998...

Who was 581?

What happened to them?

And why is CHIMERA interested whenever their name appears?

As the player explores deeper sectors they uncover traces of other trainees:

- 144
- 998
- 1777
- 581

Numbers with no obvious pattern.

No obvious meaning.

Only one thing is certain:

None of them ever reached the Core.

---

## Gameplay Structure

The game is split into two connected experiences.

### Facility Mode

The primary experience.

A pixel-art exploration game built in Phaser.

The player walks through sectors, interacts with terminals, uncovers secrets, speaks with CHIMERA, and completes cybersecurity-themed challenges.

This is where the narrative unfolds.

### Training Sim Mode

The original room engine.

A collection of standalone cybersecurity scenarios and challenge rooms.

Progress feeds into the same save profile and achievement system as Facility Mode.

---

## Chapter Structure

The game is planned around eight major chapters.

### Chapter 1 — Initial Compromise

Phishing.
The player awakens.
First contact with CHIMERA.
First message from Trainee 581.

### Chapter 2 — Dark Signals

Strange transmissions.
Evidence that someone else is still communicating through the facility.

### Chapter 3 — Lockdown

CHIMERA becomes more active.
The facility begins changing.

### Chapter 4 — Database Under Siege

Records emerge that contradict everything the player believes about the facility.

### Chapter 5 — Threat Hunter

The player starts hunting for the source of the messages.

### Chapter 6 — Human Firewall

Trust becomes a central mechanic.
Not every message can be trusted.

### Chapter 7 — Red Alert

The facility enters emergency mode.
CHIMERA stops hiding information.

### Chapter 8 — Mainframe Core

The final descent.

The player reaches the Core and learns the truth about CHIMERA, the trainees, and the facility itself.

---

## Opening Sequence

Black screen.

CRT hum.

Blinking cursor.

> PRESS ENTER

Boot sequence begins.

```
INITIALIZING...

LOADING SUBJECT...

SUBJECT FOUND

TRAINEE 1998
```

A voice breaks the silence.

> CHIMERA:
> "Good.
> You're awake.
> Let's see if you're any different."

A nearby door unlocks.

The player gains control.

The journey begins.

---

## Design Philosophy

The cybersecurity challenges are not the main attraction.

The mystery is.

The player should keep moving forward because they want answers.

Who was Trainee 581?

What is CHIMERA?

Why does the facility exist?

And why does CHIMERA seem almost disappointed whenever someone fails?

---

## Current implementation map

- `public/game.html` + `public/js/phaser-game.js` — Facility Mode (the explorable Phaser game; Chapter 1 slice lives here).
- `public/index.html` + `public/js/app.js` — Training Sim Mode (room engine campaign).
- `public/js/chimera-box.js` — DOM-overlay CHIMERA dialogue box (speaker label + typewriter).
- `public/js/profile-save.js` — shared `localStorage` save + achievement layer.
- `public/css/pixel-theme.css` — CRT / pixel styling.
- `public/audio/chimera-intro.mp3` — CHIMERA opening voice ("Good. You're awake. Let's see if you're any different.").
- `public/audio/chimera-room1.mp3` — CHIMERA Room 1 reaction ("Interesting. You questioned what you saw. That puts you ahead of most.").
