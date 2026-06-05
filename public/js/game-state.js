/**
 * Central game state — timer, score, lives, hints, per-room stats.
 */
const GameState = (() => {
  const ROOMS = ['phishing', 'password', 'cipher', 'sql', 'logs', 'social'];
  const START_SCORE = 1000;
  const MISTAKE_PENALTY = 50;
  const HINT_PENALTY = 25;
  const MAX_LIVES = 3;

  const state = {
    studentName: '',
    score: START_SCORE,
    lives: MAX_LIVES,
    mistakes: 0,
    hintsUsed: [],
    roomMistakes: {},
    roomHints: {},
    roomTimes: {},
    currentRoomIndex: 0,
    completedRooms: [],
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
    gameOver: false,
    quizScore: null,
  };

  ROOMS.forEach((r) => {
    state.roomMistakes[r] = 0;
    state.roomHints[r] = 0;
    state.roomTimes[r] = 0;
  });

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getHardestRoom() {
    let max = 0;
    let hardest = ROOMS[0];
    for (const room of ROOMS) {
      const total = (state.roomMistakes[room] || 0) + (state.roomHints[room] || 0);
      if (total > max) {
        max = total;
        hardest = room;
      }
    }
    return hardest;
  }

  function getRoomLabel(id) {
    const labels = {
      phishing: 'Phishing Detection',
      password: 'Password Security',
      cipher: 'Encryption Challenge',
      sql: 'SQL Injection Fix',
      logs: 'Log Analysis',
      social: 'Social Engineering',
    };
    return labels[id] || id;
  }

  return {
    ROOMS,
    START_SCORE,
    MISTAKE_PENALTY,
    HINT_PENALTY,
    MAX_LIVES,

    getState: () => ({ ...state }),

    reset(name) {
      state.studentName = name;
      state.score = START_SCORE;
      state.lives = MAX_LIVES;
      state.mistakes = 0;
      state.hintsUsed = [];
      state.currentRoomIndex = 0;
      state.completedRooms = [];
      state.elapsedSeconds = 0;
      state.gameOver = false;
      state.quizScore = null;
      ROOMS.forEach((r) => {
        state.roomMistakes[r] = 0;
        state.roomHints[r] = 0;
        state.roomTimes[r] = 0;
      });
    },

    startTimer(onTick) {
      state.startTime = Date.now();
      if (state.timerInterval) clearInterval(state.timerInterval);
      state.timerInterval = setInterval(() => {
        state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        onTick(state.elapsedSeconds, formatTime(state.elapsedSeconds));
      }, 1000);
    },

    stopTimer() {
      if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
      }
    },

    recordMistake(roomId) {
      state.mistakes += 1;
      state.lives = Math.max(0, state.lives - 1);
      state.score = Math.max(0, state.score - MISTAKE_PENALTY);
      state.roomMistakes[roomId] = (state.roomMistakes[roomId] || 0) + 1;
      if (state.lives <= 0) state.gameOver = true;
      return state.lives <= 0;
    },

    recordHint(roomId, hintText) {
      state.score = Math.max(0, state.score - HINT_PENALTY);
      state.roomHints[roomId] = (state.roomHints[roomId] || 0) + 1;
      state.hintsUsed.push({ room: roomId, hint: hintText, at: state.elapsedSeconds });
    },

    completeRoom(roomId) {
      if (!state.completedRooms.includes(roomId)) {
        state.completedRooms.push(roomId);
      }
      state.roomTimes[roomId] = state.elapsedSeconds;
      state.currentRoomIndex = Math.min(state.currentRoomIndex + 1, ROOMS.length);
    },

    addBonus(points) {
      state.score += points;
    },

    setQuizScore(correct, total) {
      state.quizScore = { correct, total };
      state.score += correct * 20;
    },

    getResultsPayload() {
      return {
        studentName: state.studentName,
        score: state.score,
        completionTimeSeconds: state.elapsedSeconds,
        mistakes: state.mistakes,
        hintsUsed: state.hintsUsed,
        hardestRoom: getHardestRoom(),
        roomStats: {
          mistakes: { ...state.roomMistakes },
          hints: { ...state.roomHints },
          times: { ...state.roomTimes },
        },
        quizScore: state.quizScore,
      };
    },

    formatTime,
    getHardestRoom,
    getRoomLabel,
  };
})();
