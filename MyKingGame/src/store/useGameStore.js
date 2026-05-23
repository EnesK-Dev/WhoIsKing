import { create } from 'zustand';
import { requestQuestionsList } from '../services/gameApi';
import signalRService from '../services/signalRService';

const QUESTION_TYPE_ORDER = ['standard', 'player_select', 'text_input'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** İstemci gösterimi: sunucu >= WinningScore kullanıyor; burada da uyumlu tutuyoruz. */
export const WIN_SCORE_THRESHOLD = 50;

function mapBackendQuestionType(qt) {
  if (qt === 0 || qt === '0' || qt === 'standard') {
    return 'standard';
  }
  if (qt === 1 || qt === '1' || qt === 'player_select') {
    return 'player_select';
  }
  if (qt === 2 || qt === '2' || qt === 'text_input') {
    return 'text_input';
  }
  // Sunucu bazen C# enum adını string yollar (JSON)
  if (typeof qt === 'string') {
    const s = qt.replace(/\s+/g, '').toLowerCase();
    if (s === 'multiplechoice') {
      return 'standard';
    }
    if (s === 'playerselection') {
      return 'player_select';
    }
    if (s === 'playeroptions') {
      return 'text_input';
    }
  }
  return 'standard';
}

function getThemeColorForType(type) {
  if (type === 'player_select') return '#BF00FF';
  if (type === 'text_input') return '#FF6600';
  return '#00F5FF';
}

function buildLetterOptions(rawOptions, type) {
  const options = [];
  const optionLetters = [];
  if (type === 'standard') {
    const arr = Array.isArray(rawOptions) ? rawOptions : [];
    for (let i = 0; i < Math.min(arr.length, 5); i++) {
      const t = arr[i];
      if (t != null && String(t).trim() !== '') {
        optionLetters.push(LETTERS[i]);
        options.push(String(t));
      }
    }
  } else if (type === 'player_select') {
    const names = Array.isArray(rawOptions) ? rawOptions : [];
    names.forEach((n, i) => {
      if (i < 5 && n != null) {
        optionLetters.push(LETTERS[i]);
        options.push(String(n));
      }
    });
  }
  return { options, optionLetters };
}

export function computeAllSelected(state) {
  const name = state.localPlayerName;
  if (!name || !state.currentQuestion) {
    return false;
  }
  const me = state.players.find((p) => p.name === name || p.id === name);
  const isKing = !!me?.isKing;
  const { currentQuestion, selections, anonymousKingChoices } = state;

  if (currentQuestion.type === 'text_input') {
    if (anonymousKingChoices?.length) {
      return selections.__kingAnonymousPick != null;
    }
    if (isKing) {
      return true;
    }
    const v = selections[name];
    return v != null && String(v).trim() !== '';
  }
  return selections[name] != null;
}

function mergePlayerList(existingPlayers, payloadList) {
  const scoreBy = Object.fromEntries((existingPlayers ?? []).map((p) => [p.name, p.score ?? 0]));
  return (payloadList ?? []).map((p) => ({
    id: p.name,
    name: p.name,
    isHost: !!p.isHost,
    isKing: false,
    score: scoreBy[p.name] ?? 0,
  }));
}

export const useGameStore = create((set, get) => ({
  roomId: '',
  /** Bu cihazdaki oyuncunun adı (hub SubmitAnswer için zorunlu). */
  localPlayerName: '',
  currentPlayerId: null,
  currentRound: null,
  questionTypeIndex: null,
  questionTypeOrder: QUESTION_TYPE_ORDER,
  kingCycleCount: null,
  textWinnerPlayerId: null,
  questions: [],
  selections: {},
  selectionOrder: [],
  players: [],
  currentQuestion: null,
  gameState: 'waiting',
  connectionStatus: 'Disconnected',
  connectionError: null,
  listenersBound: false,
  gameResult: null,
  questionUiMode: null,
  roundSummary: null,
  kingAnswer: null,
  lastRoundSummary: null,
  answerProgress: null,
  anonymousKingChoices: null,
  isGameOverFromServer: false,
  dynamicThemeColor: '#00F5FF',
  /** Hub Error mesajı (JoinRoom gibi invoke hata fırlatmayan çağrılar için). */
  lastHubError: null,

  initializeSignalR: async () => {
    const { listenersBound } = get();

    signalRService.setLifecycleHandlers({
      onConnected: () => {
        set({ connectionStatus: 'Connected', connectionError: null });
      },
      onReconnecting: (error) => {
        set({
          connectionStatus: 'Reconnecting',
          connectionError: error?.message ?? null,
        });
      },
      onReconnected: (connectionId) => {
        set({ connectionStatus: 'Connected', connectionError: null });
        const { roomId, localPlayerName } = get();
        if (roomId && localPlayerName) {
          signalRService.invoke('RejoinRoom', roomId, localPlayerName).catch(console.warn);
        }
      },
      onDisconnected: (error) => {
        set({
          connectionStatus: 'Disconnected',
          connectionError: error?.message ?? null,
        });
      },
      onError: (error) => {
        set({
          connectionStatus: 'Disconnected',
          connectionError: error?.message ?? 'SignalR connection error',
        });
      },
    });

    if (!listenersBound) {
      signalRService.on('RoomCreated', (roomCode) => {
        set((s) => ({
          roomId: String(roomCode ?? ''),
          players:
            s.players.length > 0
              ? s.players
              : [
                  {
                    id: s.localPlayerName,
                    name: s.localPlayerName,
                    isHost: true,
                    isKing: false,
                    score: 0,
                  },
                ],
        }));
      });

      signalRService.on('Error', (message) => {
        const msg = String(message ?? 'Bilinmeyen hata');
        set({ connectionError: msg, lastHubError: msg });
      });

      signalRService.on('Notify', (message) => {
        const msg = String(message ?? '');
        if (msg) {
          set({ lastHubError: msg });
        }
      });

      signalRService.on('UpdatePlayerList', (playerList) => {
        set((s) => ({
          players: mergePlayerList(s.players, playerList),
        }));
      });

      signalRService.on('GameStarted', (gameData) => {
        const kingName = gameData?.kingName ?? gameData?.KingName ?? '';
        const type = mapBackendQuestionType(gameData?.questionType);
        const { options, optionLetters } = buildLetterOptions(gameData?.options, type);
        const themeColor = getThemeColorForType(type);
        set((s) => ({
          dynamicThemeColor: themeColor,
          gameState: 'playing',
          currentQuestion: {
            id: null,
            type,
            text: gameData?.questionText ?? '',
            options,
            optionLetters,
          },
          players: (s.players ?? []).map((p) => ({
            ...p,
            isKing: p.name === kingName,
          })),
          selections: {},
          selectionOrder: [],
          lastRoundSummary: null,
          anonymousKingChoices: null,
          answerProgress: null,
          textWinnerPlayerId: null,
          kingAnswer: null,
        }));
      });

      signalRService.on('UpdateAnswerCount', (answered, target) => {
        set({
          answerProgress: { answered, target },
        });
      });

      signalRService.on('ShowKingSelection', (anonymousAnswers) => {
        set({
          anonymousKingChoices: Array.isArray(anonymousAnswers) ? anonymousAnswers : [],
          selections: {},
        });
      });

      signalRService.on('ShowResults', (payload) => {
        const prevScores = Object.fromEntries((get().players ?? []).map((p) => [p.name, p.score ?? 0]));
        const rawResults = payload?.playerResults ?? [];
        const results = rawResults.map((r) => ({
          playerName: r.playerName ?? r.PlayerName,
          isKing: !!(r.isKing ?? r.IsKing),
          answerText: r.answerText ?? r.AnswerText ?? '',
          isCorrect: !!(r.isCorrect ?? r.IsCorrect),
          score: Number(r.score ?? r.Score ?? 0),
        }));

        const entries = results.map((r) => ({
          playerId: r.playerName,
          name: r.playerName,
          isKing: r.isKing,
          choiceLabel: r.answerText,
          pointsEarned: Math.max(0, r.score - (prevScores[r.playerName] ?? 0)),
          score: r.score,
        }));

        const players = (get().players ?? []).map((p) => {
          const row = results.find((x) => x.playerName === p.name);
          return row ? { ...p, score: row.score, isKing: row.isKing } : p;
        });

        const isGameOver = !!(payload?.isGameOver ?? payload?.IsGameOver);

        set({
          players,
          lastRoundSummary: {
            questionText: get().currentQuestion?.text ?? '',
            kingAnswerCaption: null,
            kingAnswerHeadline: String(payload?.correctAnswerContent ?? payload?.CorrectAnswerContent ?? '—'),
            entries,
            fromServer: true,
          },
          anonymousKingChoices: null,
          answerProgress: null,
          gameState: isGameOver ? 'game_over' : get().gameState,
          isGameOverFromServer: isGameOver,
          selections: {},
        });
      });

      signalRService.on('AnswerUndone', () => {
        const name = get().localPlayerName;
        set((s) => {
          const newSelections = { ...s.selections };
          delete newSelections[name];
          return { selections: newSelections };
        });
      });

      signalRService.on('RejoinedLobby', (data) => {
        const playerList = data?.players ?? [];
        set((s) => ({
          gameState: 'waiting',
          players: mergePlayerList(s.players, playerList),
          roomId: data?.roomCode ? String(data.roomCode) : s.roomId,
        }));
      });

      signalRService.on('RejoinedGame', (data) => {
        const type = mapBackendQuestionType(data?.questionType);
        const { options, optionLetters } = buildLetterOptions(data?.options, type);
        const themeColor = getThemeColorForType(type);
        const kingName = data?.kingName ?? '';
        set((s) => {
          const newSelections = data?.alreadyAnswered
            ? { ...s.selections, [s.localPlayerName]: '__submitted__' }
            : {};
          return {
            gameState: 'playing',
            dynamicThemeColor: themeColor,
            currentQuestion: {
              id: null,
              type,
              text: data?.questionText ?? '',
              options,
              optionLetters,
            },
            players: s.players.map((p) => ({
              ...p,
              isKing: p.name === kingName,
            })),
            answerProgress:
              data?.answeredCount != null
                ? { answered: data.answeredCount, target: data.totalPlayers }
                : s.answerProgress,
            selections: newSelections,
          };
        });
      });

      set({ listenersBound: true });
    }

    await signalRService.startConnection();
  },

  createRoom: async (playerName) => {
    const name = String(playerName ?? '').trim();
    if (!name) {
      return '';
    }
    try {
      await get().initializeSignalR();
      set({
        localPlayerName: name,
        currentPlayerId: name,
        lastHubError: null,
        connectionError: null,
        players: [
          {
            id: name,
            name,
            isHost: true,
            isKing: false,
            score: 0,
          },
        ],
      });
      await signalRService.invoke('CreateRoom', name);
      await new Promise((r) => setTimeout(r, 80));
      if (get().lastHubError) {
        set({ connectionError: get().lastHubError });
        return '';
      }
      return get().roomId || '';
    } catch (error) {
      console.warn('[Store] CreateRoom failed:', error?.message ?? error);
      set({ connectionError: error?.message ?? 'CreateRoom failed' });
      return '';
    }
  },

  JoinRoom: async (roomCode, playerName) => {
    const code = String(roomCode ?? '').trim().toUpperCase();
    const name = String(playerName ?? '').trim();
    if (!code || !name) {
      return false;
    }
    try {
      await get().initializeSignalR();
      set({
        roomId: code,
        localPlayerName: name,
        currentPlayerId: name,
        connectionError: null,
        lastHubError: null,
        gameState: 'waiting',
      });
      await signalRService.invoke('JoinRoom', code, name);
      await new Promise((r) => setTimeout(r, 80));
      if (get().lastHubError) {
        set({ connectionError: get().lastHubError });
        return false;
      }
      return true;
    } catch (error) {
      console.warn('[Store] JoinRoom failed:', error?.message ?? error);
      set({ connectionError: error?.message ?? 'JoinRoom failed' });
      return false;
    }
  },

  joinRoom: async (roomId, playerName) => get().JoinRoom(roomId, playerName),

  startGameOnServer: async () => {
    const { roomId } = get();
    if (!roomId) {
      return false;
    }
    try {
      await signalRService.invoke('StartGame', roomId);
      return true;
    } catch (error) {
      console.warn('[Store] StartGame failed:', error?.message ?? error);
      set({ connectionError: error?.message ?? 'StartGame failed' });
      return false;
    }
  },

  SubmitAnswer: async (answer) => {
    const { roomId, localPlayerName } = get();
    if (!roomId || !localPlayerName) {
      return false;
    }
    const payload = String(answer ?? '');
    try {
      await signalRService.invoke('SubmitAnswer', roomId, localPlayerName, payload);
      return true;
    } catch (error) {
      console.warn('[Store] SubmitAnswer failed:', error?.message ?? error);
      set({ connectionError: error?.message ?? 'SubmitAnswer failed' });
      return false;
    }
  },

  undoAnswer: async () => {
    const { roomId, localPlayerName } = get();
    if (!roomId || !localPlayerName) return false;
    try {
      await signalRService.invoke('UndoAnswer', roomId, localPlayerName);
      return true;
    } catch (error) {
      console.warn('[Store] UndoAnswer failed:', error?.message ?? error);
      return false;
    }
  },

  SelectKingAnswer: async (answer) => get().SubmitAnswer(answer),

  setGameState: (state) => set({ gameState: state }),

  resetGame: () =>
    set({
      gameState: 'waiting',
      currentQuestion: null,
      lastRoundSummary: null,
      anonymousKingChoices: null,
      answerProgress: null,
      selections: {},
      selectionOrder: [],
      isGameOverFromServer: false,
      textWinnerPlayerId: null,
      kingAnswer: null,
      roundSummary: null,
      gameResult: null,
      dynamicThemeColor: '#00F5FF',
    }),

  makeSelection: (playerId, value) =>
    set((state) => ({
      selections: {
        ...state.selections,
        [playerId]: value,
      },
      selectionOrder: state.selectionOrder.includes(playerId)
        ? state.selectionOrder
        : [...state.selectionOrder, playerId],
    })),

  kingPickTextWinner: (playerId) => set({ textWinnerPlayerId: playerId }),

  pickKingAnonymousAnswer: (text) =>
    set((s) => ({
      selections: { ...s.selections, __kingAnonymousPick: text },
    })),

  fillBotNonKingTextAnswers: () => {},

  allSelected: () => computeAllSelected(get()),

  applyRoundScores: () => {},

  getRoundSummary: () => {
    const s = get().lastRoundSummary;
    if (s) {
      return s;
    }
    return {
      questionText: '',
      kingAnswerCaption: null,
      kingAnswerHeadline: '—',
      entries: [],
    };
  },

  nextRound: async () => {
    const st = get();
    if (st.gameState === 'game_over') {
      set({
        gameState: 'waiting',
        currentQuestion: null,
        lastRoundSummary: null,
        isGameOverFromServer: false,
        anonymousKingChoices: null,
        answerProgress: null,
        selections: {},
      });
      return;
    }
    try {
      await signalRService.invoke('StartGame', st.roomId);
      set({ lastRoundSummary: null });
    } catch (error) {
      console.warn('[Store] nextRound StartGame failed:', error?.message ?? error);
    }
  },

  clearRoundSummaryFlag: () =>
    set((s) => ({
      lastRoundSummary: s.lastRoundSummary
        ? { ...s.lastRoundSummary, fromServer: false }
        : null,
    })),

  /** GET /api/questions — sunucu soru listesi (mock değil). */
  fetchQuestionsCatalog: async () => {
    try {
      const rows = await requestQuestionsList();
      const list = Array.isArray(rows) ? rows : [];
      set({
        questions: list.map((q) => {
          const rawOpts = q.options ?? q.Options;
          const optionsFromApi = Array.isArray(rawOpts)
            ? rawOpts.map((x) => String(x ?? '')).filter((s) => s.trim() !== '')
            : [];
          return {
            id: q.id ?? q.Id,
            text: q.text ?? q.Text ?? '',
            questionType: q.questionType ?? q.QuestionType ?? 0,
            options: optionsFromApi,
            optionA: q.optionA ?? q.OptionA,
            optionB: q.optionB ?? q.OptionB,
            optionC: q.optionC ?? q.OptionC,
            optionD: q.optionD ?? q.OptionD,
            optionE: q.optionE ?? q.OptionE,
          };
        }),
      });
      return true;
    } catch (e) {
      console.warn('[Store] Soru listesi alınamadı (isteğe bağlı):', e?.message ?? e);
      return false;
    }
  },
}));
