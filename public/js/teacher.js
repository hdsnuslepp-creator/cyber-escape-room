/**
 * Teacher Dashboard
 */
(function () {
  'use strict';

  const ROOM_LABELS = {
    phishing: 'Phishing Detection',
    password: 'Password Security',
    cipher: 'Encryption Challenge',
    sql: 'SQL Injection Fix',
    logs: 'Log Analysis',
    social: 'Social Engineering',
  };

  let sessions = [];

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  async function loadSessions() {
    const url = AppConfig.apiUrl('/sessions');
    if (!url) {
      document.getElementById('sessionsBody').innerHTML =
        '<tr><td colspan="8" class="empty-row">Teacher dashboard requires the Node server. Run npm start locally, or share your certificate PDF from the game.</td></tr>';
      return;
    }
    try {
      const res = await fetch(url);
      sessions = await res.json();
      renderSessions();
    } catch {
      document.getElementById('sessionsBody').innerHTML =
        '<tr><td colspan="8" class="empty-row">Could not load sessions. Start the server with npm start.</td></tr>';
    }
  }

  function renderSessions() {
    const tbody = document.getElementById('sessionsBody');
    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-row">No completed sessions yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sessions.map((s, i) => {
      const hints = Array.isArray(s.hints_used) ? s.hints_used.length : 0;
      const quiz = s.quiz_score ? `${s.quiz_score.correct}/${s.quiz_score.total}` : '—';
      const hardest = ROOM_LABELS[s.hardest_room] || s.hardest_room || '—';
      return `<tr data-index="${i}" class="clickable-row">
        <td>${escapeHtml(s.student_name)}</td>
        <td>${s.score}</td>
        <td>${formatTime(s.completion_time_seconds)}</td>
        <td>${s.mistakes}</td>
        <td>${hints}</td>
        <td>${escapeHtml(hardest)}</td>
        <td>${quiz}</td>
        <td>${escapeHtml(s.completed_at || '')}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.clickable-row').forEach((row) => {
      row.addEventListener('click', () => showDetail(parseInt(row.dataset.index, 10)));
    });
  }

  function showDetail(index) {
    const s = sessions[index];
    if (!s) return;

    const stats = s.room_stats || {};
    const mistakes = stats.mistakes || {};
    const hints = stats.hints || {};
    const times = stats.times || {};

    const rows = Object.keys(ROOM_LABELS).map((room) => `
      <tr>
        <td>${ROOM_LABELS[room]}</td>
        <td>${mistakes[room] || 0}</td>
        <td>${hints[room] || 0}</td>
        <td>${times[room] ? formatTime(times[room]) : '—'}</td>
      </tr>
    `).join('');

    const hintsList = (Array.isArray(s.hints_used) ? s.hints_used : [])
      .map((h) => `<li><strong>${ROOM_LABELS[h.room] || h.room}:</strong> ${escapeHtml(h.hint)} <span class="dim">(@ ${formatTime(h.at || 0)})</span></li>`)
      .join('') || '<li>No hints used.</li>';

    document.getElementById('detailPanel').innerHTML = `
      <h3>${escapeHtml(s.student_name)}</h3>
      <div class="detail-grid">
        <div class="detail-stat"><span>Score</span><strong>${s.score}</strong></div>
        <div class="detail-stat"><span>Time</span><strong>${formatTime(s.completion_time_seconds)}</strong></div>
        <div class="detail-stat"><span>Mistakes</span><strong>${s.mistakes}</strong></div>
        <div class="detail-stat"><span>Hardest Room</span><strong>${escapeHtml(ROOM_LABELS[s.hardest_room] || '—')}</strong></div>
      </div>
      <h4>Room Breakdown</h4>
      <table class="teacher-table teacher-table--compact">
        <thead><tr><th>Room</th><th>Mistakes</th><th>Hints</th><th>Time at Complete</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h4>Hints Used</h4>
      <ul class="hints-list">${hintsList}</ul>
    `;
  }

  async function loadRooms() {
    const url = AppConfig.apiUrl('/rooms');
    if (!url) {
      document.getElementById('roomsBody').innerHTML =
        '<tr><td colspan="4" class="empty-row">Custom rooms require the Node server (npm start).</td></tr>';
      return;
    }
    try {
      const res = await fetch(url);
      const rooms = await res.json();
      renderRooms(rooms);
    } catch {
      document.getElementById('roomsBody').innerHTML =
        '<tr><td colspan="4" class="empty-row">Could not load custom rooms.</td></tr>';
    }
  }

  function renderRooms(rooms) {
    const tbody = document.getElementById('roomsBody');
    if (!rooms.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No custom rooms yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rooms.map((r) => `
      <tr>
        <td>${escapeHtml(r.title)}</td>
        <td>${escapeHtml(ROOM_LABELS[r.room_type] || r.room_type)}</td>
        <td>${escapeHtml(r.created_at)}</td>
        <td><button class="btn btn--danger btn--small" data-delete="${r.id}">Delete</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await fetch(AppConfig.apiUrl('/rooms/' + btn.dataset.delete), { method: 'DELETE' });
        loadRooms();
      });
    });
  }

  document.getElementById('btnExport').addEventListener('click', () => {
    const url = AppConfig.apiUrl('/sessions/export');
    if (url) window.location.href = url;
    else alert('CSV export requires the Node server. Run npm start locally.');
  });

  document.getElementById('roomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('roomTitle').value.trim();
    const roomType = document.getElementById('roomType').value;
    let content;
    try {
      content = JSON.parse(document.getElementById('roomContent').value || '{}');
    } catch {
      alert('Invalid JSON in custom content field.');
      return;
    }

    const url = AppConfig.apiUrl('/rooms');
    if (!url) {
      alert('Custom rooms require the Node server. Run npm start locally.');
      return;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, roomType, content }),
    });

    if (res.ok) {
      document.getElementById('roomForm').reset();
      loadRooms();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to save room.');
    }
  });

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
  }

  loadSessions();
  loadRooms();

  if (AppConfig.isStaticHost()) {
    document.getElementById('staticNotice').hidden = false;
  }
})();
