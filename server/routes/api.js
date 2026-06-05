const express = require('express');
const db = require('../db');
const tutor = require('../ai-tutor');

const router = express.Router();

router.post('/sessions', (req, res) => {
  const {
    studentName,
    score,
    completionTimeSeconds,
    mistakes,
    hintsUsed,
    hardestRoom,
    roomStats,
    quizScore,
  } = req.body;

  if (!studentName || !studentName.trim()) {
    return res.status(400).json({ error: 'Student name is required.' });
  }

  const stmt = db.prepare(`
    INSERT INTO sessions (
      student_name, score, completion_time_seconds, mistakes,
      hints_used, hardest_room, room_stats, quiz_score, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const result = stmt.run(
    studentName.trim(),
    score ?? 0,
    completionTimeSeconds ?? 0,
    mistakes ?? 0,
    JSON.stringify(hintsUsed ?? []),
    hardestRoom ?? null,
    JSON.stringify(roomStats ?? {}),
    quizScore ? JSON.stringify(quizScore) : null
  );

  res.json({ id: result.lastInsertRowid, success: true });
});

router.get('/sessions', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM sessions ORDER BY created_at DESC')
    .all()
    .map((row) => ({
      ...row,
      hints_used: JSON.parse(row.hints_used || '[]'),
      room_stats: JSON.parse(row.room_stats || '{}'),
      quiz_score: row.quiz_score ? JSON.parse(row.quiz_score) : null,
    }));
  res.json(rows);
});

router.get('/sessions/export', (_req, res) => {
  const rows = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();

  const headers = [
    'ID',
    'Student Name',
    'Score',
    'Completion Time (s)',
    'Mistakes',
    'Hints Used',
    'Hardest Room',
    'Quiz Score',
    'Completed At',
  ];

  const csvRows = [headers.join(',')];
  for (const row of rows) {
    const hints = JSON.parse(row.hints_used || '[]').join('; ');
    csvRows.push(
      [
        row.id,
        `"${row.student_name.replace(/"/g, '""')}"`,
        row.score,
        row.completion_time_seconds,
        row.mistakes,
        `"${hints.replace(/"/g, '""')}"`,
        `"${(row.hardest_room || '').replace(/"/g, '""')}"`,
        row.quiz_score ? JSON.parse(row.quiz_score).correct + '/' + JSON.parse(row.quiz_score).total : '',
        row.completed_at,
      ].join(',')
    );
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="escape-room-results.csv"');
  res.send(csvRows.join('\n'));
});

router.get('/rooms', (_req, res) => {
  const rows = db
    .prepare('SELECT id, title, room_type, content, active, created_at FROM custom_rooms WHERE active = 1 ORDER BY created_at DESC')
    .all()
    .map((row) => ({ ...row, content: JSON.parse(row.content) }));
  res.json(rows);
});

router.post('/rooms', (req, res) => {
  const { title, roomType, content } = req.body;
  if (!title || !roomType || !content) {
    return res.status(400).json({ error: 'title, roomType, and content are required.' });
  }

  const allowed = ['phishing', 'password', 'cipher', 'sql', 'logs', 'social'];
  if (!allowed.includes(roomType)) {
    return res.status(400).json({ error: 'Invalid room type.' });
  }

  const result = db
    .prepare('INSERT INTO custom_rooms (title, room_type, content) VALUES (?, ?, ?)')
    .run(title.trim(), roomType, JSON.stringify(content));

  res.json({ id: result.lastInsertRowid, success: true });
});

router.delete('/rooms/:id', (req, res) => {
  db.prepare('UPDATE custom_rooms SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/ai/explain', async (req, res) => {
  const { roomId, context } = req.body;
  let message = tutor.explain(roomId, context);
  const enhanced = await tutor.aiEnhance('explain', { roomId, context });
  if (enhanced) message = enhanced;
  res.json({ message });
});

router.post('/ai/hint', async (req, res) => {
  const { roomId, level } = req.body;
  let message = tutor.hint(roomId, level ?? 0);
  const enhanced = await tutor.aiEnhance('hint', { roomId, level });
  if (enhanced) message = enhanced;
  res.json({ message });
});

router.post('/ai/summary', async (req, res) => {
  const { roomId, stats } = req.body;
  let message = tutor.levelSummary(roomId);
  const enhanced = await tutor.aiEnhance('summary', { roomId, stats });
  if (enhanced) message = enhanced;
  res.json({ message });
});

router.get('/ai/quiz', (_req, res) => {
  res.json(tutor.getQuiz());
});

module.exports = router;
