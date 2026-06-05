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
    password: [
      'Long random strings beat clever substitutions.',
      'Which password would take billions of guesses?',
      'Avoid famous or common password examples.',
    ],
    cipher: [
      'Shift each letter forward by 3 in the alphabet.',
      'W becomes T, K becomes H when decoding.',
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
  };

  const LOCAL_EXPLAIN = {
    phishing: {
      sender: 'This sender is suspicious because the domain does not match the real organization.',
      link: 'This link is suspicious because the domain does not match the real organization.',
      urgency: 'False urgency tricks you into acting before verifying the request.',
      default: 'Look for spoofed senders, fake links, and pressure tactics.',
    },
    password: {
      default: 'Weak passwords are short, common, or follow predictable patterns attackers already try.',
    },
    cipher: {
      default: 'Shift each encrypted letter forward by 3 to decode the door code.',
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
  };

  async function apiPost(path, body) {
    try {
      const res = await fetch('/api' + path, {
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

  return {
    async explain(roomId, context) {
      const data = await apiPost('/ai/explain', { roomId, context });
      if (data?.message) return data.message;
      const room = LOCAL_EXPLAIN[roomId];
      return room?.[context] || room?.default || 'Review the scenario and try again.';
    },

    async hint(roomId, level) {
      const data = await apiPost('/ai/hint', { roomId, level });
      if (data?.message) return data.message;
      const hints = LOCAL_HINTS[roomId] || ['Think about what attackers exploit here.'];
      return hints[Math.min(level, hints.length - 1)];
    },

    async summary(roomId, stats) {
      const data = await apiPost('/ai/summary', { roomId, stats });
      if (data?.message) return data.message;
      return `Room complete. You practiced ${GameState.getRoomLabel(roomId)} skills.`;
    },

    async fetchQuiz() {
      try {
        const res = await fetch('/api/ai/quiz');
        if (res.ok) return res.json();
      } catch {
        /* fallback below */
      }
      return [];
    },
  };
})();
