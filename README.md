# Cyber Escape Room

A browser game where you solve cybersecurity puzzles to escape a locked training room.

**Play:** [hdsnuslepp-creator.github.io/cyber-escape-room](https://hdsnuslepp-creator.github.io/cyber-escape-room/)

## About

You enter your name, work through 8 security challenges, take a short quiz, and earn a certificate at the end. The game tracks your score, time, and lives. There is a local leaderboard and achievements to unlock along the way.

## Rooms

1. Phishing Detection  
2. Password Security  
3. Encryption Challenge (Caesar cipher)  
4. SQL Injection Fix  
5. Log Analysis  
6. Social Engineering  
7. MFA Security  
8. Ransomware Response  

## Run locally

If you want the full version with the teacher dashboard and saved scores:

```bash
npm install
npm start
```

- Game: http://localhost:3000  
- Teacher dashboard: http://localhost:3000/teacher  

## Project structure

```
public/          Game (HTML, CSS, JavaScript)
server/          Backend for teacher dashboard
public/audio/    Background music
```

## Built with

HTML, CSS, JavaScript, Node.js, Express, SQLite

## Author

hdsnuslepp-creator
