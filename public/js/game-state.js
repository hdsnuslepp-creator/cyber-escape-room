/**
 * Central game state — timer, score, lives, hints, per-room stats.
 */
const GameState = (() => {
  const ROOMS = Campaign.getPlayableRoomIds();
  const START_SCORE = 1000;
  const MISTAKE_PENALTY = 50;
  const HINT_PENALTY = 25;
  const MAX_LIVES = 3;
  const TIME_BONUS_FAST = 100;
  const TIME_BONUS_MEDIUM = 50;
  const TIME_FAST_SEC = 600;
  const TIME_MEDIUM_SEC = 900;

  const state = {
    studentName: '',
    score: START_SCORE,
    lives: MAX_LIVES,
    mistakes: 0,
    hintsUsed: [],
    roomMistakes: {},
    roomHints: {},
    roomTimes: {},
    roomEnterAt: {},
    currentRoomIndex: 0,
    completedRooms: [],
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
    gameOver: false,
    lastFailedRoom: null,
    quizScore: null,
    timeBonus: 0,
    hijacksCleared: 0,
  };

  ROOMS.forEach((r) => {
    state.roomMistakes[r] = 0;
    state.roomHints[r] = 0;
    state.roomTimes[r] = 0;
    state.roomEnterAt[r] = 0;
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
    return Campaign.getRoom(id).title;
  }

  function enterRoom(roomId) {
    if (ROOMS.includes(roomId)) {
      state.roomEnterAt[roomId] = state.elapsedSeconds;
    }
  }

  function getRoomDuration(roomId) {
    const start = state.roomEnterAt[roomId];
    if (start == null) return 0;
    return Math.max(0, state.elapsedSeconds - start);
  }

  function getRoomNumber(roomId) {
    const idx = ROOMS.indexOf(roomId);
    return idx >= 0 ? idx + 1 : 1;
  }

  function applyTimeBonus() {
    state.timeBonus = 0;
    if (state.elapsedSeconds <= TIME_FAST_SEC) {
      state.timeBonus = TIME_BONUS_FAST;
    } else if (state.elapsedSeconds <= TIME_MEDIUM_SEC) {
      state.timeBonus = TIME_BONUS_MEDIUM;
    }
    state.score += state.timeBonus;
    return state.timeBonus;
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
      state.timeBonus = 0;
      state.hijacksCleared = 0;
      ROOMS.forEach((r) => {
        state.roomMistakes[r] = 0;
        state.roomHints[r] = 0;
        state.roomTimes[r] = 0;
        state.roomEnterAt[r] = 0;
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
      if (state.lives <= 0) {
        state.gameOver = true;
        state.lastFailedRoom = roomId;
      }
      return state.lives <= 0;
    },

    recordHint(roomId, hintText) {
      state.score = Math.max(0, state.score - HINT_PENALTY);
      state.roomHints[roomId] = (state.roomHints[roomId] || 0) + 1;
      state.hintsUsed.push({ room: roomId, hint: hintText, at: state.elapsedSeconds });
    },

    recordHijackCleared() {
      state.hijacksCleared += 1;
      state.score += 15;
      if (state.hijacksCleared >= 5 && typeof Achievements !== 'undefined') {
        Achievements.unlock('hijack_hunter');
      }
    },

    completeRoom(roomId) {
      const alreadyDone = state.completedRooms.includes(roomId);
      if (!alreadyDone) {
        state.completedRooms.push(roomId);
        state.currentRoomIndex = Math.min(state.currentRoomIndex + 1, ROOMS.length);
      }
      state.roomTimes[roomId] = state.elapsedSeconds;
    },

    addBonus(points) {
      state.score += points;
    },

    setQuizScore(correct, total) {
      state.quizScore = { correct, total };
      state.score += correct * 20;
    },

    applyTimeBonus,

    getResultsPayload() {
      return {
        studentName: state.studentName,
        score: state.score,
        completionTimeSeconds: state.elapsedSeconds,
        mistakes: state.mistakes,
        hintsUsed: state.hintsUsed,
        hardestRoom: getHardestRoom(),
        timeBonus: state.timeBonus,
        roomStats: {
          mistakes: { ...state.roomMistakes },
          hints: { ...state.roomHints },
          times: { ...state.roomTimes },
        },
        quizScore: state.quizScore,
        hijacksCleared: state.hijacksCleared,
        achievements: Achievements.getUnlockedList().map((a) => a.id),
      };
    },

    formatTime,
    getHardestRoom,
    getRoomLabel,
    getRoomNumber,
    enterRoom,
    getRoomDuration,
  };
})();
