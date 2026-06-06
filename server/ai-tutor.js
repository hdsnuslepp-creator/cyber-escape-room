/**
 * AI Tutor — contextual explanations, hints, summaries, and quiz generation.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise smart template responses.
 */

const EXPLANATIONS = {
  phishing: {
    sender:
      'This sender is suspicious because the domain "microsft-security.com" misspells Microsoft and is not an official company domain.',
    link:
      'This link is suspicious because the domain does not match the real organization. Always verify URLs before clicking.',
    urgency:
      'Urgent threats like "account deleted in 2 hours" are designed to panic you into acting without thinking.',
    attachment:
      'Unexpected .exe attachments can install malware. Legitimate IT teams rarely send executable files by email.',
    wrong_click:
      'That part looks normal. Focus on the sender address, the link URL, and pressure tactics.',
  },
  password: {
    password123:
      'This password is weak because it is short, common, and appears on every breach wordlist — cracked in under a second.',
    Summer2024:
      'Predictable patterns (word + year + symbol) are tried first in dictionary attacks.',
    Tr0ub4dor:
      'This is a famous example from a comic — attackers include it in their wordlists even though it looks complex.',
    correct:
      'Excellent choice. Long random passwords resist brute force and should never be reused across sites.',
    default:
      'Strong passwords are long, random, and unique. Avoid dictionary words and known patterns.',
  },
  cipher: {
    default:
      'Caesar cipher shifts each letter by a fixed amount. Shift each letter forward by 3: W→T, K→H, H→E.',
  },
  sql: {
    concat:
      'String concatenation in SQL lets attackers inject code. Never build queries by joining user input directly.',
    parameterized:
      'Parameterized queries treat input as data, not code — the standard defense against SQL injection.',
    comment:
      'The `--` comment tricks the database into ignoring the rest of the query — a classic injection technique.',
    default:
      'SQL injection happens when user input becomes part of the query. Use prepared statements instead.',
  },
  logs: {
    '192.168.1.45': 'This IP only shows successful office logins — normal behavior.',
    '10.0.0.12': 'One successful remote login is not an attack pattern.',
    '172.16.0.5': 'A single failed attempt is not suspicious. Look for repeated failures.',
    '203.45.67.89':
      'Correct — this IP shows rapid failed login attempts from an unusual location, indicating brute force.',
    default:
      'Look for an IP with many failed login attempts in a short window, especially from unexpected locations.',
  },
  social: {
    give_password:
      'Never share passwords over the phone. Real IT staff can reset access without asking for your password.',
    verify_callback:
      'Best practice: verify the caller through official channels before sharing any information.',
    give_mfa:
      'MFA codes are secrets. Sharing them gives attackers full access to your account.',
    correct:
      'You resisted social engineering. Always verify identity through official channels before acting.',
    default:
      'Social engineers create urgency and authority. Pause, verify, and never share credentials.',
  },
};

const HINTS = {
  phishing: [
    'Check the sender domain carefully — look for misspellings.',
    'Hover over links. Does the URL match your organization?',
    'Find the language that pressures you to act immediately.',
  ],
  password: [
    'Length and randomness matter more than clever substitutions.',
    'Which option would take the longest to guess?',
    'Avoid passwords that appear on "most common passwords" lists.',
  ],
  cipher: [
    'Each letter was shifted backward by 3 when encrypted.',
    'To decode, shift each letter forward by 3 in the alphabet.',
    'The decoded phrase ends with "IS THE KEY".',
  ],
  sql: [
    'Look for where user input is glued directly into the query string.',
    'Find the option that uses placeholders instead of concatenation.',
    'The `--` sequence starts a SQL comment that bypasses authentication.',
  ],
  logs: [
    'Sort mentally by IP address and count failures.',
    'Which IP tried many different usernames in seconds?',
    'Check the location column for unexpected countries.',
  ],
  social: [
    'Real IT never asks for your password over the phone.',
    'Which option lets you verify the caller independently?',
    'Urgency is a social engineering tactic — slow down.',
  ],
};

const LEVEL_SUMMARIES = {
  phishing:
    'Phishing attacks trick you with fake senders, malicious links, and false urgency. Always verify before you click.',
  password:
    'Strong passwords are long, random, and unique. Reusing passwords means one breach compromises everything.',
  cipher:
    'Encryption protects data. Even simple ciphers teach you to look for patterns — real encryption is far stronger.',
  sql:
    'SQL injection exploits poorly written queries. Always use parameterized queries and never trust raw user input.',
  logs:
    'Security logs reveal attack patterns. Monitor failed logins, unusual IPs, and geographic anomalies.',
  social:
    'Social engineers exploit trust and urgency. Verify identity through official channels and never share credentials.',
};

const QUIZ_BANK = [
  {
    question: 'You get a sketchy email link. Best move?',
    options: ['Click to see if it\'s real', 'Check the URL before clicking', 'Forward to everyone', 'Reply to the sender'],
    correct: 1,
    explanation: 'Inspect the link first — hover or verify through official channels.',
  },
  {
    question: 'Which password stops brute-force attacks best?',
    options: ['Short with symbols', 'Long and random', 'Your pet\'s name + 1', 'Same as last year'],
    correct: 1,
    explanation: 'Length and randomness beat predictable patterns every time.',
  },
  {
    question: 'How do you block SQL injection?',
    options: ['Use parameterized queries', 'Make the font bigger', 'Add more ads', 'Delete the database'],
    correct: 0,
    explanation: 'Prepared statements keep user input out of executable SQL.',
  },
  {
    question: 'Logs show 50 failed logins from one IP in 2 minutes. That means…',
    options: ['Normal behavior', 'Likely brute-force attack', 'Someone forgot once', 'Printer offline'],
    correct: 1,
    explanation: 'Rapid repeated failures from one IP = automated guessing.',
  },
  {
    question: '"IT" calls and asks for your password. You should…',
    options: ['Give it — they sound official', 'Hang up and verify through real IT', 'Email it instead', 'Read them your MFA code'],
    correct: 1,
    explanation: 'Never share credentials. Call IT back on a number you trust.',
  },
];

function explain(roomId, context) {
  const room = EXPLANATIONS[roomId];
  if (!room) {
    return 'Review the lesson and try again. Focus on what makes this scenario risky in real life.';
  }
  return room[context] || room.default || Object.values(room)[0];
}

function hint(roomId, level) {
  const hints = HINTS[roomId] || ['Think about what attackers exploit in this scenario.'];
  return hints[Math.min(level, hints.length - 1)];
}

function levelSummary(roomId) {
  return LEVEL_SUMMARIES[roomId] || 'Great work completing this challenge.';
}

function getQuiz() {
  return QUIZ_BANK.map((q, i) => ({
    id: i,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
  }));
}

async function aiEnhance(type, payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompts = {
      explain: `You are a cybersecurity tutor. Explain briefly (2 sentences) why this answer is wrong: ${JSON.stringify(payload)}`,
      hint: `Give a subtle hint (1 sentence, no direct answer) for this cybersecurity puzzle: ${JSON.stringify(payload)}`,
      summary: `Summarize what the student learned in this room in 2 sentences: ${JSON.stringify(payload)}`,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompts[type] || prompts.explain }],
        max_tokens: 120,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

module.exports = {
  explain,
  hint,
  levelSummary,
  getQuiz,
  aiEnhance,
};
