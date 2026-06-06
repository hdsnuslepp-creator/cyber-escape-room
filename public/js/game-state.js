/**
 * Central game state — timer, score, lives, hints, per-room stats.
 */
const GameState = (() => {
  const ROOMS = Campaign.getPlayableRoomIds();
  const START_SCORE = 1000;
  const MISTAKE_PENALTY = 50;
  const HINT_PENALTY = 25;
  const MAX_LIVES = 3;
  const DIFFICULTY_LIVES = { casual: 5, standard: 3, analyst: 2 };
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
    difficulty: 'standard',
    lastFailedChapter: null,
    pendingChapterId: 1,
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

  function getMaxLives(difficulty) {
    return DIFFICULTY_LIVES[difficulty] || MAX_LIVES;
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
    DIFFICULTY_LIVES,
    getMaxLives,

    getState: () => ({ ...state }),

    reset(name, options = {}) {
      const difficulty = options.difficulty || ProfileSave?.getSettings?.()?.difficulty || 'standard';
      const maxLives = getMaxLives(difficulty);
      state.studentName = name;
      state.score = START_SCORE;
      state.lives = maxLives;
      state.mistakes = 0;
      state.hintsUsed = [];
      state.currentRoomIndex = 0;
      state.completedRooms = [];
      state.elapsedSeconds = 0;
      state.gameOver = false;
      state.lastFailedRoom = null;
      state.lastFailedChapter = null;
      state.quizScore = null;
      state.timeBonus = 0;
      state.hijacksCleared = 0;
      state.difficulty = difficulty;
      state.pendingChapterId = 1;
      ROOMS.forEach((r) => {
        state.roomMistakes[r] = 0;
        state.roomHints[r] = 0;
        state.roomTimes[r] = 0;
        state.roomEnterAt[r] = 0;
      });
    },

    restore(saved) {
      if (!saved?.studentName) return false;
      state.studentName = saved.studentName;
      state.score = saved.score ?? START_SCORE;
      state.lives = saved.lives ?? getMaxLives(saved.difficulty);
      state.mistakes = saved.mistakes ?? 0;
      state.hintsUsed = saved.hintsUsed || [];
      state.currentRoomIndex = saved.currentRoomIndex ?? 0;
      state.completedRooms = saved.completedRooms || [];
      state.elapsedSeconds = saved.elapsedSeconds ?? 0;
      state.gameOver = false;
      state.lastFailedRoom = null;
      state.lastFailedChapter = saved.lastFailedChapter ?? null;
      state.quizScore = saved.quizScore ?? null;
      state.timeBonus = saved.timeBonus ?? 0;
      state.hijacksCleared = saved.hijacksCleared ?? 0;
      state.difficulty = saved.difficulty || 'standard';
      state.pendingChapterId = saved.pendingChapterId ?? Campaign.getCurrentChapter(state.completedRooms);
      ROOMS.forEach((r) => {
        state.roomMistakes[r] = saved.roomMistakes?.[r] ?? 0;
        state.roomHints[r] = saved.roomHints?.[r] ?? 0;
        state.roomTimes[r] = saved.roomTimes?.[r] ?? 0;
        state.roomEnterAt[r] = saved.roomEnterAt?.[r] ?? 0;
      });
      return true;
    },

    serialize() {
      return {
        studentName: state.studentName,
        score: state.score,
        lives: state.lives,
        mistakes: state.mistakes,
        hintsUsed: state.hintsUsed,
        currentRoomIndex: state.currentRoomIndex,
        completedRooms: [...state.completedRooms],
        elapsedSeconds: state.elapsedSeconds,
        quizScore: state.quizScore,
        timeBonus: state.timeBonus,
        hijacksCleared: state.hijacksCleared,
        difficulty: state.difficulty,
        lastFailedChapter: state.lastFailedChapter,
        pendingChapterId: state.pendingChapterId,
        roomMistakes: { ...state.roomMistakes },
        roomHints: { ...state.roomHints },
        roomTimes: { ...state.roomTimes },
        roomEnterAt: { ...state.roomEnterAt },
      };
    },

    retryChapter(chapterId) {
      const ids = Campaign.CHAPTER_ROOMS[chapterId] || [];
      state.completedRooms = state.completedRooms.filter((id) => !ids.includes(id));
      state.lives = getMaxLives(state.difficulty);
      state.gameOver = false;
      state.lastFailedRoom = null;
      state.lastFailedChapter = null;
      state.pendingChapterId = chapterId;
      const first = Campaign.getChapterFirstRoom(chapterId);
      if (first) state.currentRoomIndex = ROOMS.indexOf(first);
      return first;
    },

    setPendingChapter(chapterId) {
      state.pendingChapterId = chapterId;
    },

    hintsAllowed() {
      return state.difficulty !== 'analyst';
    },

    startTimer(onTick, resumeElapsedSeconds) {
      const offset = Math.max(0, resumeElapsedSeconds ?? state.elapsedSeconds ?? 0);
      state.elapsedSeconds = offset;
      state.startTime = Date.now() - offset * 1000;
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
        state.lastFailedChapter = Campaign.getRoom(roomId).chapter || null;
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
