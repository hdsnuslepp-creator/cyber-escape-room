/**
 * Client-side AI tutor — calls server API with local fallbacks.
 */
const TutorClient = (() => {
  const LOCAL_HINTS = {
    phishing: [
      'Check the sender domain for misspellings.',
      'Inspect the link URL — does it match your company?',
      'Find language that creates false urgency.',
    ],
    attachment: [
      'PDFs should not ask you to enable macros.',
      'Look for external download links inside the document.',
      'Legitimate invoices rarely use paypa1-style domains.',
    ],
    fake_login: [
      'Compare each URL character by character.',
      'The real domain uses the official company name.',
      'Typosquats swap letters like l vs 1 or add hyphens.',
    ],
    ch1_boss: [
      'Quarantine the sender with the misspelled domain.',
      'Block the typosquatted portal, not the real one.',
      'You have 90 seconds — prioritize both tasks.',
    ],
    password: [
      'Long random strings beat clever substitutions.',
      'Which password would take billions of guesses?',
      'Avoid famous or common password examples.',
    ],
    cipher: [
      'This is a Caesar cipher — shift each letter back 3 in the alphabet.',
      'W becomes T, R becomes O, S becomes P when decoding.',
      'The door code is a short English phrase.',
    ],
    sql: [
      'Never concatenate user input into SQL strings.',
      'Look for placeholders like ? in the safe option.',
      'The `--` starts a comment that bypasses checks.',
    ],
    logs: [
      'Group entries by IP and count failures.',
      'Which IP tried many usernames rapidly?',
      'Check for logins from unexpected countries.',
    ],
    social: [
      'Real IT never asks for passwords by phone.',
      'Verify callers through official channels.',
      'Urgency is a classic manipulation tactic.',
    ],
    mfa: [
      'MFA codes are secrets — only you should see them.',
      'Legitimate support never asks you to read codes aloud.',
      'Ignore unsolicited MFA requests.',
    ],
    ch2_boss: [
      'Pick the longest random password — not a seasonal phrase.',
      'Never share MFA codes, even with someone claiming to be IT.',
      'Complete both tasks before the 90-second timer expires.',
    ],
    steganography: [
      'Hidden data is often stored in least-significant bits.',
      'Scan the corners and edges — not the obvious sky area.',
      'Look for abnormal pixel regions in an otherwise normal photo.',
    ],
    db_forensics: [
      'Exfiltration shows large exports to external IPs.',
      'Service accounts exporting at 2 AM are suspicious.',
      'Compare record counts — thousands vs dozens matters.',
    ],
    siem: [
      'Correlate alerts: brute force, then login, then data transfer.',
      'Ignore benign alerts like printer offline.',
      'Impossible travel means two logins from distant locations too fast.',
    ],
    insider: [
      'Insiders often act off-hours with USB devices.',
      'Large downloads outside job role are red flags.',
      'Vacation with no logins is normal — not suspicious.',
    ],
    backup: [
      'Restore from the last backup before infection spread.',
      'Backups with encrypted files or ransom notes are compromised.',
      'Pick the most recent clean snapshot, not the oldest.',
    ],
    ransomware: [
      'Never pay ransomware — it funds criminals.',
      'Disconnect from the network to stop spread.',
      'Report to IT — do not download tools from the popup.',
    ],
  };

  const LOCAL_EXPLAIN = {
    phishing: {
      sender: 'This sender is suspicious because the domain does not match the real organization.',
      link: 'This link is suspicious because the domain does not match the real organization.',
      urgency: 'False urgency tricks you into acting before verifying the request.',
      greeting: 'This greeting looks normal. Phishing red flags are usually the sender, fake link, or urgency — not a plain "Hello".',
      body: 'Generic warning text can appear in real emails too. Focus on the spoofed sender, suspicious link, and pressure to act fast.',
      signoff: '"Corporate IT" sounds official but anyone can write that. Verify through official channels instead.',
      attachment: '.exe attachments are dangerous in real life — but this room wants the sender, link, and urgency flags first.',
      wrong_click: 'That is not one of the three core phishing indicators for this exercise.',
      default: 'Look for spoofed senders, fake links, and pressure tactics.',
    },
    attachment: {
      wrong_click: 'That part looks normal — focus on macros and suspicious links.',
      default: 'Malicious PDFs often hide macros and fake download URLs.',
    },
    fake_login: {
      typosquat: 'This URL mimics the real site with a subtle spelling change.',
      correct: 'Always verify the exact domain before entering credentials.',
      default: 'Typosquatted domains swap or add characters to fool users.',
    },
    ch1_boss: {
      wrong_url: 'Blocking the legitimate site would lock out real users.',
      boss_timeout: 'Act fast — quarantine the email and block the fake portal.',
      default: 'Stop the email threat and block the cloned login page.',
    },
    password: {
      default: 'Weak passwords are short, common, or follow predictable patterns attackers already try.',
    },
    cipher: {
      default: 'Shift each encrypted letter back by 3 to decode the door code.',
    },
    sql: {
      default: 'SQL injection works when user input becomes executable query code. Use parameterized queries.',
    },
    logs: {
      default: 'Brute force attacks show many failed logins from one IP in a short time.',
    },
    social: {
      default: 'Never share credentials. Verify identity through official channels before acting.',
    },
    mfa: {
      share_code: 'Never share MFA codes — attackers use them to bypass your second factor.',
      default: 'MFA codes are for your eyes only. Real IT never asks you to read them aloud.',
    },
    ch2_boss: {
      weak_password: 'Weak passwords let attackers back in immediately after rotation.',
      share_code: 'Social engineers trick you into sharing MFA codes over the phone.',
      boss_timeout: 'Rotate credentials and enforce MFA before the attacker reuses stolen access.',
      default: 'Strong passwords plus MFA lock out credential-based attacks.',
    },
    steganography: {
      wrong_region: 'Steganography hides data in subtle pixel changes — often at image edges.',
      default: 'Attackers embed commands in innocent files using steganographic techniques.',
    },
    db_forensics: {
      correct: 'Mass export to an external IP from a service account is classic data exfiltration.',
      default: 'Look for unusual volume, odd timing, and external destinations.',
    },
    siem: {
      correct: 'Brute force followed by impossible travel and outbound transfer indicates breach.',
      default: 'SIEM value comes from correlating related alerts into an attack timeline.',
    },
    insider: {
      correct: 'Off-hours bulk downloads with removable media are classic insider indicators.',
      default: 'Insider threats often blend in — look for activity outside normal role and hours.',
    },
    backup: {
      infected: 'Restoring from an infected backup re-deploys ransomware.',
      old: 'Older backups work but you lose more data — pick the latest clean snapshot.',
      correct: 'Restore from the last verified backup before encryption began.',
      default: 'Always validate backup integrity before restoring production systems.',
    },
    ransomware: {
      pay: 'Paying ransomware does not guarantee recovery and funds criminals.',
      restart: 'Restarting may spread the infection — isolate the device first.',
      download: 'Never download tools from a ransomware popup — it may be more malware.',
      default: 'Disconnect from the network and report to IT immediately.',
    },
  };

  async function apiPost(path, body) {
    const url = AppConfig.apiUrl(path);
    if (!url) return null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  const LOCAL_QUIZ = [
    { question: 'What is the best way to verify a suspicious email link?', options: ['Click it quickly', 'Hover to inspect the URL', 'Forward to colleagues', 'Reply and ask'], correct: 1 },
    { question: 'Which password property matters most against brute force?', options: ['Contains a symbol', 'Length and randomness', 'Starts with uppercase', 'Has numbers only'], correct: 1 },
    { question: 'How do you defend against SQL injection?', options: ['Escape HTML', 'Use parameterized queries', 'Add a firewall', 'Encrypt passwords only'], correct: 1 },
    { question: 'What log pattern suggests brute force?', options: ['One failed login', 'Many failures from one IP', 'Successful login at 9 AM', 'Logout events'], correct: 1 },
    { question: 'A caller claiming to be IT asks for your password. You should:', options: ['Give it to help them', 'Hang up and verify via official IT', 'Email it instead', 'Share your MFA code'], correct: 1 },
  ];

  return {
    async explain(roomId, context) {
      const data = await apiPost('/ai/explain', { roomId, context });
      if (data?.message) return data.message;
      const room = LOCAL_EXPLAIN[roomId];
      if (room) return room[context] || room.default || 'Review the scenario and try again.';
      if (typeof EngineRooms !== 'undefined' && EngineRooms.get(roomId)) {
        return 'Review the scenario — rule out choices that violate security best practices.';
      }
      return 'Review the scenario and try again.';
    },

    async hint(roomId, level) {
      const data = await apiPost('/ai/hint', { roomId, level });
      if (data?.message) return data.message;
      if (typeof EngineRooms !== 'undefined' && EngineRooms.HINTS?.[roomId]) {
        const hints = EngineRooms.HINTS[roomId];
        return hints[Math.min(level, hints.length - 1)];
      }
      const hints = LOCAL_HINTS[roomId] || ['Think about what attackers exploit here.'];
      return hints[Math.min(level, hints.length - 1)];
    },

    async summary(roomId, stats) {
      const data = await apiPost('/ai/summary', { roomId, stats });
      if (data?.message) return data.message;
      return `Room complete. You practiced ${GameState.getRoomLabel(roomId)} skills.`;
    },

    async fetchQuiz() {
      const url = AppConfig.apiUrl('/ai/quiz');
      if (url) {
        try {
          const res = await fetch(url);
          if (res.ok) return res.json();
        } catch {
          /* use local quiz */
        }
      }
      return LOCAL_QUIZ.map((q, id) => ({ id, ...q }));
    },
  };
})();
