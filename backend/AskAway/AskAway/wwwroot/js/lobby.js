
const screens = {
    loading: document.getElementById('loadingScreen'),
    welcome: document.getElementById('welcomeScreen'),
    join: document.getElementById('joinScreen'),
    lobby: document.getElementById('lobbyScreen'),
    game: document.getElementById('gameScreen'),
    results: document.getElementById('resultsScreen'),
    winner: document.getElementById('winnerScreen')
};

const buttons = {
    createRoom: document.getElementById('createRoomBtn'),
    joinRoom: document.getElementById('joinRoomBtn'),
    confirmJoin: document.getElementById('confirmJoinBtn'),
    backToWelcome: document.getElementById('backToWelcomeBtn'),
    startGame: document.getElementById('startGameBtn'),
    leaveLobby: document.getElementById('leaveLobbyBtn'),
    nextRound: document.getElementById('nextRoundBtn'),
    playAgain: document.getElementById('playAgainBtn')
};

const inputs = {
    playerName: document.getElementById('playerName'),
    joinPlayerName: document.getElementById('joinPlayerName'),
    roomCode: document.getElementById('roomCode')
};

const lobbyElements = {
    displayRoomCode: document.getElementById('displayRoomCode'),
    playersList: document.getElementById('playersList'),
    waitingIndicator: document.getElementById('waitingIndicator')
};

const gameElements = {
    questionText: document.getElementById('questionText'),
    timerProgress: document.getElementById('timerProgress'),
    timerText: document.getElementById('timerText'),
    optionButtons: document.querySelectorAll('.option-btn'),
    waitingState: document.getElementById('waitingForAnswers'),
    answeredCount: document.getElementById('answeredCount'),
    totalPlayers: document.getElementById('totalPlayers')
};

let isHost = false;
let myPlayerName = '';
let currentKingName = '';
let currentRoundQuestionType = 0;
let commentTimerInterval = null;
const CROWN_IMG = '/images/crown.png';

function getMyPlayerName() {
    const fromInput = (inputs.playerName?.value || inputs.joinPlayerName?.value || '').trim();
    const stored = (myPlayerName || sessionStorage.getItem('myPlayerName') || fromInput).trim();
    return stored;
}

function namesMatch(a, b) {
    const left = (a || '').trim().toLocaleLowerCase('tr-TR');
    const right = (b || '').trim().toLocaleLowerCase('tr-TR');
    return left.length > 0 && left === right;
}

function escapeHtml(text) {
    const el = document.createElement('span');
    el.textContent = text ?? '';
    return el.innerHTML;
}

function buildRainbowTitle(text) {
    const colors = ['#BF00FF', '#FFD700', '#00F5FF'];
    return text.split('').map(char => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        return `<span style="color:${color}">${escapeHtml(char)}</span>`;
    }).join('');
}

function showWinnerScreen(playerResults) {
    const sorted = [...playerResults].sort(
        (a, b) => b.score - a.score || String(a.playerName).localeCompare(String(b.playerName))
    );

    const winner = sorted[0];
    const second = sorted[1];
    const third = sorted[2];
    const others = sorted.slice(3);

    const titleEl = document.getElementById('winnerTitle');
    if (titleEl) titleEl.innerHTML = buildRainbowTitle('KRAL BELİRLENDİ!');

    const heroName = document.getElementById('winnerHeroName');
    if (heroName) heroName.textContent = winner?.playerName || '';

    const podiumRow = document.getElementById('podiumRow');
    if (podiumRow) {
        podiumRow.innerHTML = '';
        const h1 = 171, h2 = 117, h3 = 81;

        const slot2 = document.createElement('div');
        slot2.className = 'podium-slot';
        if (second) {
            slot2.innerHTML = `
                <span class="podium-player-name podium-name-2">${escapeHtml(second.playerName)}</span>
                <div class="podium-block podium-block-2" style="height:${h2}px">
                    <span class="podium-number" style="font-size:clamp(1.8rem,5vw,2.8rem)">2</span>
                </div>
                <span class="podium-score podium-score-2">${second.score}</span>`;
        }
        podiumRow.appendChild(slot2);

        const slot1 = document.createElement('div');
        slot1.className = 'podium-slot podium-slot-center';
        if (winner) {
            slot1.innerHTML = `
                <div class="podium-block podium-block-1" style="height:${h1}px">
                    <span class="podium-number" style="font-size:clamp(2.2rem,6vw,3.4rem)">1</span>
                </div>
                <span class="podium-score podium-score-1">${winner.score}</span>`;
        }
        podiumRow.appendChild(slot1);

        const slot3 = document.createElement('div');
        slot3.className = 'podium-slot';
        if (third) {
            slot3.innerHTML = `
                <span class="podium-player-name podium-name-3">${escapeHtml(third.playerName)}</span>
                <div class="podium-block podium-block-3" style="height:${h3}px">
                    <span class="podium-number" style="font-size:clamp(1.8rem,5vw,2.8rem)">3</span>
                </div>
                <span class="podium-score podium-score-3">${third.score}</span>`;
        }
        podiumRow.appendChild(slot3);
    }

    const othersSection = document.getElementById('otherPlayersSection');
    if (othersSection) {
        othersSection.innerHTML = '';
        others.forEach((p, i) => {
            const row = document.createElement('div');
            row.className = 'other-player-row';
            row.innerHTML = `
                <span class="other-player-pos">${i + 4}.</span>
                <span class="other-player-name">${escapeHtml(p.playerName)}</span>
                <span class="other-player-score">${p.score} Puan</span>`;
            othersSection.appendChild(row);
        });
    }

    showScreen('winner');
}

function getQuestionTypeValue(data) {
    const raw = data?.questionType ?? data?.QuestionType ?? 0;
    if (typeof raw === 'string') {
        const map = {
            multiplechoice: 0,
            playerselection: 1,
            playeroptions: 2,
            text_input: 2,
        };
        return map[raw.toLowerCase()] ?? 0;
    }
    return Number(raw);
}

function applyGameTheme(isKing) {
    const gameCard = document.getElementById('gameCard');
    const questionCard = document.getElementById('questionCard');
    if (gameCard) gameCard.classList.toggle('theme-king', !!isKing);
    if (questionCard) questionCard.classList.toggle('theme-king', !!isKing);
}

function applyDynamicTheme(typeVal) {
    const themes = {
        0: { color: '#00F5FF', glow: 'rgba(0,245,255,0.4)', shadow: '5px 10px 20px rgba(0,245,255,0.35)' },
        1: { color: '#BF00FF', glow: 'rgba(191,0,255,0.4)', shadow: '5px 10px 20px rgba(191,0,255,0.35)' },
        2: { color: '#FF6600', glow: 'rgba(255,102,0,0.4)', shadow: '5px 10px 20px rgba(255,102,0,0.35)' }
    };
    const t = themes[typeVal] ?? themes[0];
    document.documentElement.style.setProperty('--dynamic-theme-color', t.color);
    document.documentElement.style.setProperty('--dynamic-theme-glow', t.glow);
    document.documentElement.style.setProperty('--dynamic-theme-shadow', t.shadow);
}

function startCommentTimer(roomCode, playerName) {
    stopCommentTimer();
    let remaining = 60;
    const timerBox = document.getElementById('commentTimerBox');
    const timerBar = document.getElementById('commentTimerBar');
    const timerText = document.getElementById('commentTimerText');
    const timerFill = document.getElementById('commentTimerFill');
    if (timerBox) timerBox.style.display = 'flex';
    if (timerBar) timerBar.style.display = 'block';
    if (timerText) timerText.textContent = remaining;
    if (timerFill) timerFill.style.width = '100%';

    commentTimerInterval = setInterval(() => {
        remaining--;
        if (timerText) timerText.textContent = remaining;
        if (timerFill) timerFill.style.width = (remaining / 60 * 100) + '%';
        if (remaining <= 0) {
            stopCommentTimer();
            const input = document.getElementById('openEndedAnswer');
            const answer = (input?.value || '').trim() || 'Zaman Doldu';
            connection.invoke("SubmitAnswer", roomCode, playerName, answer)
                .then(() => {
                    if (document.getElementById('textInputContainer'))
                        document.getElementById('textInputContainer').style.display = 'none';
                    if (gameElements.waitingState) {
                        gameElements.waitingState.innerHTML = "<p>Süre doldu! Cevap otomatik gönderildi.</p>";
                        gameElements.waitingState.style.display = 'block';
                    }
                })
                .catch(err => console.error("Timer auto-submit hatası:", err));
        }
    }, 1000);
}

function stopCommentTimer() {
    if (commentTimerInterval !== null) {
        clearInterval(commentTimerInterval);
        commentTimerInterval = null;
    }
    const timerBox = document.getElementById('commentTimerBox');
    const timerBar = document.getElementById('commentTimerBar');
    if (timerBox) timerBox.style.display = 'none';
    if (timerBar) timerBar.style.display = 'none';
}

function showReconnectOverlay(show) {
    const overlay = document.getElementById('reconnectOverlay');
    if (overlay) overlay.style.display = show ? 'flex' : 'none';
}

function saveSession(roomCode, playerName, host) {
    sessionStorage.setItem('askaway_roomCode', roomCode);
    sessionStorage.setItem('askaway_playerName', playerName);
    sessionStorage.setItem('askaway_isHost', host ? 'true' : 'false');
}

function clearSession() {
    sessionStorage.removeItem('askaway_roomCode');
    sessionStorage.removeItem('askaway_playerName');
    sessionStorage.removeItem('askaway_isHost');
}

function showLoadingOverlay(show) {
    const loadingEl = screens.loading;
    if (!loadingEl) return;
    if (show) {
        loadingEl.classList.add('active');
    } else {
        loadingEl.classList.remove('active');
    }
}

function applyPlayerBackground(isKing) {
    const container = document.querySelector('.game-container');
    if (!container) return;

    if (isKing) {
        // preload king background, show loading overlay while loading
        showLoadingOverlay(true);
        const bgPath = '/images/kingBackGrounWeb.png?v=' + Date.now();
        const img = new Image();
        img.onload = () => {
            container.classList.add('king-mode');
            container.style.backgroundImage = `url('${bgPath}')`;
            showLoadingOverlay(false);
        };
        img.onerror = () => {
            console.warn('kingBackground.png failed to load, falling back to homeScreenweb.png');
            container.classList.add('king-mode');
            container.style.backgroundImage = "url('/images/homeScreenweb.png')";
            showLoadingOverlay(false);
        };
        img.src = bgPath;
    } else {
        container.classList.remove('king-mode');
        container.style.backgroundImage = "url('/images/homeScreenweb.png')";
    }
}

function resolveIsKing(data, kingName) {
    const fromServer = data?.isYouKing ?? data?.IsYouKing;
    if (typeof fromServer === 'boolean') {
        return fromServer;
    }
    return namesMatch(kingName, getMyPlayerName());
}

function renderKingBox(kingName, isKing) {
    const kingContainer = document.getElementById('kingBoxContainer');
    const kingBoxView = document.getElementById('kingBoxView');
    const kingSelfView = document.getElementById('kingSelfBoxView');
    const kingNameDisplay = document.getElementById('kingNameDisplay');
    const roleHint = document.getElementById('gameRoleHint');

    if (!kingBoxView || !kingSelfView) return;

    if (kingContainer) {
        kingContainer.style.display = 'block';
    }

    const name = (kingName || '').trim();

    if (isKing) {
        kingBoxView.style.display = 'none';
        kingSelfView.style.display = 'block';
        if (roleHint) roleHint.textContent = 'Doğru kabul ettiğin şıkkı seç.';
    } else {
        kingSelfView.style.display = 'none';
        kingBoxView.style.display = 'block';
        if (kingNameDisplay) {
            kingNameDisplay.textContent = name || '—';
        }
        if (roleHint) roleHint.textContent = 'Kralın seçeceği şıkkı tahmin et.';
    }
}

// --- 2. SIGNALR BAĞLANTISI ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/gameHub")
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .build();

connection.onreconnecting(() => {
    console.warn("SignalR bağlantısı koptu, yeniden bağlanılıyor...");
    showReconnectOverlay(true);
});

connection.onreconnected(() => {
    console.log("SignalR yeniden bağlandı.");
    showReconnectOverlay(false);
    const rc = sessionStorage.getItem('askaway_roomCode');
    const pn = sessionStorage.getItem('askaway_playerName');
    if (rc && pn) {
        connection.invoke("RejoinRoom", rc, pn).catch(err => console.error("RejoinRoom hatası:", err));
    }
});

connection.onclose((err) => {
    console.error("SignalR bağlantısı kalıcı olarak kapandı:", err);
    showReconnectOverlay(false);
});

connection.start().then(() => {
    console.log("SignalR Bağlantısı Başarılı!");
}).catch(err => console.error("Bağlantı Hatası: ", err.toString()));

// --- 3. SUNUCUDAN GELEN SİNYALLER ---

connection.on("RoomCreated", (roomCode) => {
    if (lobbyElements.displayRoomCode) lobbyElements.displayRoomCode.textContent = roomCode;
    if (buttons.startGame) buttons.startGame.style.display = 'flex';
    if (lobbyElements.playersList) lobbyElements.playersList.innerHTML = '';
    addPlayerToList(inputs.playerName.value.trim(), true);
    saveSession(roomCode, myPlayerName, true);
    showScreen('lobby');
});

connection.on("UpdatePlayerList", (players) => {
    if (lobbyElements.playersList) {
        lobbyElements.playersList.innerHTML = '';
        players.forEach(p => addPlayerToList(p.name, p.isHost));
    }
});

connection.on("RejoinedLobby", (data) => {
    if (lobbyElements.displayRoomCode) lobbyElements.displayRoomCode.textContent = data.roomCode;
    if (lobbyElements.playersList) {
        lobbyElements.playersList.innerHTML = '';
        (data.players || []).forEach(p => addPlayerToList(p.name, p.isHost));
    }
    const storedHost = sessionStorage.getItem('askaway_isHost') === 'true';
    isHost = storedHost;
    if (buttons.startGame) buttons.startGame.style.display = storedHost ? 'flex' : 'none';
    showScreen('lobby');
});

connection.on("RejoinedGame", (data) => {
    currentRoundQuestionType = getQuestionTypeValue(data);
    applyDynamicTheme(currentRoundQuestionType);
    const kingName = String(data.kingName ?? '').trim();
    const myName = getMyPlayerName();
    const isKing = data.isYouKing ?? namesMatch(kingName, myName);
    currentKingName = kingName;

    if (gameElements.questionText) gameElements.questionText.textContent = data.questionText ?? '';
    applyGameTheme(isKing);
    renderKingBox(kingName, isKing);

    const optionsContainer = document.querySelector('.options-container');
    const textInputContainer = document.getElementById('textInputContainer');
    const isTextQuestion = currentRoundQuestionType === 2;

    if (isTextQuestion) {
        if (optionsContainer) optionsContainer.style.display = 'none';
        if (!data.alreadyAnswered && !isKing) {
            if (textInputContainer) textInputContainer.style.display = 'block';
            const textInput = document.getElementById('openEndedAnswer');
            if (textInput) textInput.value = '';
            if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';
            startCommentTimer(getActiveRoomCode(), myName);
        } else if (isKing) {
            if (textInputContainer) textInputContainer.style.display = 'none';
            if (gameElements.waitingState) {
                gameElements.waitingState.innerHTML = "<p>Oyuncuların komik cevaplar yazması bekleniyor...</p>";
                gameElements.waitingState.style.display = 'block';
            }
        } else {
            if (textInputContainer) textInputContainer.style.display = 'none';
            if (gameElements.waitingState) {
                gameElements.waitingState.innerHTML = `<p>Cevap gönderildi! <span id="answeredCount">${data.answeredCount ?? 0}</span>/<span id="totalPlayers">${data.totalPlayers ?? 0}</span></p><button type="button" id="undoAnswerBtn" class="undo-btn" style="display:none;">Cevabımı Geri Al / Değiştir</button>`;
                gameElements.waitingState.style.display = 'block';
            }
        }
    } else {
        if (optionsContainer) optionsContainer.style.display = 'flex';
        if (textInputContainer) textInputContainer.style.display = 'none';
        gameElements.optionButtons.forEach((btn, index) => {
            if (data.options && index < data.options.length) {
                const optionText = btn.querySelector('.option-text');
                if (optionText) optionText.textContent = data.options[index];
                btn.classList.remove('selected');
                btn.disabled = false;
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });
        if (data.alreadyAnswered) {
            gameElements.optionButtons.forEach(b => b.disabled = true);
            if (gameElements.waitingState) {
                gameElements.waitingState.innerHTML = `<p>Cevap gönderildi! <span id="answeredCount">${data.answeredCount ?? 0}</span>/<span id="totalPlayers">${data.totalPlayers ?? 0}</span></p><button type="button" id="undoAnswerBtn" class="undo-btn">Cevabımı Geri Al / Değiştir</button>`;
                gameElements.waitingState.style.display = 'block';
                attachUndoListener();
            }
        } else {
            if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';
        }
    }

    showScreen('game');
    applyPlayerBackground(isKing);
});

connection.on("AnswerUndone", () => {
    stopCommentTimer();
    const undoBtn = document.getElementById('undoAnswerBtn');
    if (undoBtn) undoBtn.style.display = 'none';
    if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';

    if (currentRoundQuestionType === 2) {
        const textInputContainer = document.getElementById('textInputContainer');
        if (textInputContainer) textInputContainer.style.display = 'block';
        const textInput = document.getElementById('openEndedAnswer');
        if (textInput) textInput.value = '';
        const roomCode = getActiveRoomCode();
        const playerName = getMyPlayerName();
        startCommentTimer(roomCode, playerName);
    } else {
        gameElements.optionButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });
    }
});

connection.on("Notify", (message) => {
    alert(message);
});

connection.on("Error", (message) => {
    alert(message);
    showScreen('welcome');
});

// =======================================================
// 1. OYUN BAŞLADIĞINDA (KRAL KONTROLÜ DÜZELTİLDİ)
// =======================================================
connection.on("GameStarted", (data) => {
    console.log("GameStarted:", data);

    stopCommentTimer();

    const oldKingContainer = document.getElementById('kingSelectionContainer');
    if (oldKingContainer) {
        oldKingContainer.remove();
    }

    const kingName = String(data.kingName ?? data.KingName ?? '').trim();
    const myName = getMyPlayerName();
    const isKing = resolveIsKing(data, kingName);
    const questionType = getQuestionTypeValue(data);
    const isTextQuestion = questionType === 2;

    currentKingName = kingName;
    currentRoundQuestionType = questionType;
    applyDynamicTheme(questionType);

    const undoBtn = document.getElementById('undoAnswerBtn');
    if (undoBtn) undoBtn.style.display = 'none';

    if (gameElements.questionText) {
        gameElements.questionText.textContent = data.questionText ?? data.QuestionText ?? '';
    }

    applyGameTheme(isKing);
    renderKingBox(kingName, isKing);

    const optionsContainer = document.querySelector('.options-container');
    const textInputContainer = document.getElementById('textInputContainer');

    console.log('[GameStarted] kral:', kingName, '| ben:', myName, '| kral mıyım:', isKing);

    if (isTextQuestion) {
        if (optionsContainer) optionsContainer.style.display = 'none';

        if (isKing) {
            // KRALSAM KUTUYU GİZLE!
            if (textInputContainer) textInputContainer.style.display = 'none';
            if (gameElements.waitingState) {
                gameElements.waitingState.innerHTML = "<p>Oyuncuların komik cevaplar yazması bekleniyor...</p>";
                gameElements.waitingState.style.display = 'block';
            }
        } else {
            // OYUNCUYSAM KUTUYU AÇ!
            if (textInputContainer) textInputContainer.style.display = 'block';
            const textInput = document.getElementById('openEndedAnswer');
            if (textInput) textInput.value = '';
            if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';
            startCommentTimer(getActiveRoomCode(), myName);
        }
    } else {
        if (optionsContainer) optionsContainer.style.display = 'flex';
        if (textInputContainer) textInputContainer.style.display = 'none';

        gameElements.optionButtons.forEach((btn, index) => {
            if (data.options && index < data.options.length) {
                const optionText = btn.querySelector('.option-text');
                if (optionText) optionText.textContent = data.options[index];

                btn.classList.remove('selected');
                btn.disabled = false;
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });

        if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';
    }

    showScreen('game');
    // apply background after switching screens so loading overlay can display over the game screen
    applyPlayerBackground(isKing);
});

// =======================================================
// 2. GÖNDER BUTONU (GİZLİ EKRAN OKUMA DÜZELTİLDİ)
// =======================================================
const submitOpenEndedBtn = document.getElementById('submitOpenEndedBtn');
if (submitOpenEndedBtn) {
    submitOpenEndedBtn.onclick = () => {
        const answerInput = document.getElementById('openEndedAnswer');
        const answer = answerInput.value.trim();

        if (answer !== "") {
            stopCommentTimer();

            // textContent ile gizli div'den yazıyı oku
            let exactRoomCode = document.getElementById('displayRoomCode').textContent.trim();
            // Eğer lobide değil de join ekranındaysa inputtan almayı deneriz:
            if (exactRoomCode === "" || exactRoomCode === "----") {
                exactRoomCode = document.getElementById('roomCode').value.trim();
            }

            const exactPlayerName = getMyPlayerName();

            console.log("SON KONTROL -> Oda:", exactRoomCode, "Oyuncu:", exactPlayerName, "Cevap:", answer);

            if (exactRoomCode === "" || exactRoomCode === "----") {
                alert("Oda kodu hala bulunamadı! Lütfen oyunu yenileyip baştan oda kur.");
                return;
            }

            connection.invoke("SubmitAnswer", exactRoomCode, exactPlayerName, answer)
                .then(() => {
                    document.getElementById('textInputContainer').style.display = 'none';
                    if (gameElements.waitingState) {
                        gameElements.waitingState.innerHTML = "<p>Cevap Gönderildi! Diğerleri bekleniyor...</p><button type='button' id='undoAnswerBtn' class='undo-btn'>Cevabımı Geri Al / Değiştir</button>";
                        gameElements.waitingState.style.display = 'block';
                        attachUndoListener();
                    }
                })
                .catch(err => {
                    console.error("Gönderme Hatası:", err);
                    alert("Cevap gönderilirken sunucuda bir hata oluştu!");
                });
        } else {
            alert("Lütfen bir cevap yazın!");
        }
    };
}
connection.on("UpdateAnswerCount", (answered, total) => {
    if (gameElements.answeredCount) gameElements.answeredCount.textContent = answered;
    if (gameElements.totalPlayers) gameElements.totalPlayers.textContent = total;

    const undoBtn = document.getElementById('undoAnswerBtn');
    if (undoBtn) {
        const allAnswered = answered >= total;
        undoBtn.style.display = allAnswered ? 'none' : (gameElements.waitingState?.style.display === 'block' ? 'block' : 'none');
    }
});

connection.on("ShowResults", (data) => {
    console.log("Sonuçlar Verisi:", data);
    stopCommentTimer();
    applyDynamicTheme(currentRoundQuestionType);

    const resultsTitle = document.getElementById('resultsTitle');
    const kingChoice = document.getElementById('kingChoice');
    const resultsKingName = document.getElementById('resultsKingName');
    const scoreboardList = document.getElementById('scoreboardList');

    // 1. Sorun Çözümü: Kralın Seçimindeki çift harfi sildik, sadece metni gösteriyoruz
    if (kingChoice) {
        kingChoice.textContent = data.correctAnswerContent ?? '';
    }
    // Show the king's name (use data.kingName or fallback to currentKingName)
    if (resultsKingName) {
        resultsKingName.textContent = (data.kingName ?? data.KingName ?? currentKingName ?? '—');
    }

    if (scoreboardList) {
        scoreboardList.innerHTML = '';
        data.playerResults.forEach(p => {
            const li = document.createElement('li');
            li.className = `score-item ${p.isCorrect ? 'correct' : ''} ${p.isKing ? 'king' : ''}`;

            let icon = p.isKing ? "" : (p.isCorrect ? "+" : "—");
            let pointsText = p.isKing ? "" : (p.isCorrect ? "+" + p.pointsEarned : "0");

            // 2. Sorun Çözümü: Artık C#'tan gelen .answerText'i kullanıyoruz (Örn: Tutku Seçti)
            let playerVoteText = p.isKing ? "Kral" : `(${p.answerText} Seçti)`;

            // HTML Şablonu (Ters tırnaklara dikkat!)
            li.innerHTML = `
                <div class="score-left">
                    <span class="score-icon">${icon}</span>
                    <span class="player-name">${p.playerName} <small style="color: #A8DCE2; margin-left: 5px;">${playerVoteText}</small></span>
                </div>
                <div class="score-right">
                    <span class="score-points">${pointsText}</span>
                    <span class="score-total">${p.score} Puan</span>
                </div>
            `;
            scoreboardList.appendChild(li);
        });
    }

    if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';

    if (data.isGameOver) {
        showWinnerScreen(data.playerResults);
        return;
    }

    if (resultsTitle) {
        resultsTitle.textContent = "Tur Sonucu";
        if (isHost) {
            buttons.nextRound.style.display = 'flex';
            buttons.playAgain.style.display = 'none';
        } else {
            buttons.nextRound.style.display = 'none';
            buttons.playAgain.style.display = 'none';
        }
    }

    showScreen('results');
});

// --- 4. BUTON TIKLAMA OLAYLARI ---

if (buttons.createRoom) {
    buttons.createRoom.addEventListener('click', () => {
        const playerName = inputs.playerName.value.trim();
        if (!playerName) return alert('Lütfen adınızı girin!');
        myPlayerName = playerName;
        sessionStorage.setItem('myPlayerName', playerName);
        isHost = true;
        connection.invoke("CreateRoom", playerName).catch(err => console.error(err));
    });
}

if (buttons.joinRoom) {
    buttons.joinRoom.addEventListener('click', () => {
        const playerName = inputs.playerName.value.trim();
        if (!playerName) return alert('Lütfen adınızı girin!');
        inputs.joinPlayerName.value = playerName;
        showScreen('join');
    });
}

if (buttons.confirmJoin) {
    buttons.confirmJoin.addEventListener('click', () => {
        const playerName = inputs.joinPlayerName.value.trim();
        const roomCode = inputs.roomCode.value.trim().toUpperCase();
        if (!playerName || !roomCode || roomCode.length !== 4) return alert('Eksik bilgi!');
        myPlayerName = playerName;
        sessionStorage.setItem('myPlayerName', playerName);
        isHost = false;
        saveSession(roomCode, playerName, false);
        if (buttons.startGame) buttons.startGame.style.display = 'none';
        if (lobbyElements.displayRoomCode) lobbyElements.displayRoomCode.textContent = roomCode;
        showScreen('lobby');
        connection.invoke("JoinRoom", roomCode, playerName).catch(err => console.error(err));
    });
}

if (buttons.backToWelcome) {
    buttons.backToWelcome.addEventListener('click', () => resetToWelcome());
}

if (buttons.leaveLobby) {
    buttons.leaveLobby.addEventListener('click', () => resetToWelcome());
}

function resetToWelcome() {
    isHost = false;
    myPlayerName = '';
    currentKingName = '';
    currentRoundQuestionType = 0;
    stopCommentTimer();
    clearSession();
    sessionStorage.removeItem('myPlayerName');
    applyDynamicTheme(0);

    if (lobbyElements.displayRoomCode) {
        lobbyElements.displayRoomCode.textContent = '----';
    }
    if (lobbyElements.playersList) {
        lobbyElements.playersList.innerHTML = '';
    }
    if (buttons.startGame) {
        buttons.startGame.style.display = 'none';
    }
    if (buttons.nextRound) {
        buttons.nextRound.style.display = 'none';
    }
    if (buttons.playAgain) {
        buttons.playAgain.style.display = 'none';
    }
    if (gameElements.waitingState) {
        gameElements.waitingState.style.display = 'none';
    }

    const kingSelection = document.getElementById('kingSelectionContainer');
    if (kingSelection) {
        kingSelection.remove();
    }

    applyGameTheme(false);
    renderKingBox('', false);
    applyPlayerBackground(false);
    const roleHint = document.getElementById('gameRoleHint');
    if (roleHint) roleHint.textContent = '';

    showScreen('welcome');
}

function getActiveRoomCode() {
    const raw = lobbyElements.displayRoomCode ? lobbyElements.displayRoomCode.textContent : '';
    return (raw || '').trim().toUpperCase();
}

if (buttons.startGame) {
    buttons.startGame.addEventListener('click', () => {
        const roomCode = getActiveRoomCode();
        if (!roomCode || roomCode === '----') {
            alert('Oda kodu geçersiz. Lobiyi yeniden açmayı deneyin.');
            return;
        }
        connection.invoke("StartGame", roomCode).catch(err => {
            console.error(err);
            alert('Oyun başlatılamadı: ' + (err.message || String(err)));
        });
    });
}

if (buttons.nextRound) {
    buttons.nextRound.addEventListener('click', () => {
        const roomCode = getActiveRoomCode();
        connection.invoke("StartGame", roomCode).catch(err => {
            console.error(err);
            alert('Tur başlatılamadı: ' + (err.message || String(err)));
        });
    });
}

const returnToLobbyBtn = document.getElementById('returnToLobbyBtn');
if (returnToLobbyBtn) {
    returnToLobbyBtn.addEventListener('click', () => resetToWelcome());
}

// --- 5. OYUN EKRANI FONKSİYONLARI ---

gameElements.optionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        gameElements.optionButtons.forEach(b => b.disabled = true);
        btn.classList.add('selected');
        if (gameElements.waitingState) {
            gameElements.waitingState.innerHTML = `<p>Cevap gönderildi! <span id="answeredCount">0</span>/<span id="totalPlayers">0</span></p><button type="button" id="undoAnswerBtn" class="undo-btn">Cevabımı Geri Al / Değiştir</button>`;
            gameElements.waitingState.style.display = 'block';
            attachUndoListener();
        }

        const selectedOption = btn.dataset.option;
        const roomCode = getActiveRoomCode();
        const playerName = getMyPlayerName();

        connection.invoke("SubmitAnswer", roomCode, playerName, selectedOption).catch(err => console.error(err));
    });
});

function attachUndoListener() {
    const undoBtn = document.getElementById('undoAnswerBtn');
    if (!undoBtn) return;
    undoBtn.onclick = () => {
        const roomCode = getActiveRoomCode();
        const playerName = getMyPlayerName();
        connection.invoke("UndoAnswer", roomCode, playerName).catch(err => console.error("UndoAnswer hatası:", err));
    };
}

// --- 6. YARDIMCI FONKSİYONLAR ---

function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        if (screens[key]) screens[key].classList.remove('active');
    });
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    } else {
        console.error("Ekran bulunamadı:", screenName);
    }
}

function showWelcomeScreen() {
    showScreen('welcome');
}

if (document.readyState === 'complete') {
    showWelcomeScreen();
} else {
    window.addEventListener('load', showWelcomeScreen, { once: true });
}

function addPlayerToList(playerName, isCurrentHost = false) {
    if (lobbyElements.playersList) {
        const li = document.createElement('li');
        li.textContent = playerName + (isCurrentHost ? ' (Host)' : '');
        lobbyElements.playersList.appendChild(li);
    }
}

if (inputs.roomCode) {
    inputs.roomCode.addEventListener('input', (e) => e.target.value = e.target.value.toUpperCase());
}


// ==========================================================
// --- BÜYÜK FİNAL: KRAL SEÇİM EKRANI (Mod 2 Aşama 2) ---
// ==========================================================
connection.on("ShowKingSelection", (anonymousAnswers) => {
    console.log("Kral Seçim Ekranı Geldi! Gelen Cevaplar:", anonymousAnswers);
    stopCommentTimer();

    if (gameElements.waitingState) gameElements.waitingState.style.display = 'none';
    const textInputContainer = document.getElementById('textInputContainer');
    if (textInputContainer) textInputContainer.style.display = 'none';

    const classicOptions = document.querySelector('.options-container');
    if (classicOptions) classicOptions.style.display = 'none';

    let kingContainer = document.getElementById('kingSelectionContainer');
    if (!kingContainer) {
        kingContainer = document.createElement('div');
        kingContainer.id = 'kingSelectionContainer';
        kingContainer.className = 'options-container';

        const questionElement = document.getElementById('questionText');
        if (questionElement) {
            questionElement.parentNode.insertBefore(kingContainer, questionElement.nextSibling);
        }
    }

    kingContainer.innerHTML = '';
    kingContainer.style.display = 'flex';

    const exactPlayerName = getMyPlayerName();
    const amIKing = namesMatch(currentKingName, exactPlayerName);
    applyGameTheme(amIKing);
    renderKingBox(currentKingName, amIKing);

    // Başlık daha önce eklenmediyse ekle
    if (gameElements.questionText && !gameElements.questionText.innerHTML.includes("Karar Vakti")) {
        gameElements.questionText.innerHTML += "<br><span class='highlight-player' style='font-size: 1.2rem;'>Karar vakti! En komiğini seç!</span>";
    }

    anonymousAnswers.forEach(answer => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span class="option-text">${answer}</span>`;

        if (amIKing) {
            // Kral isem kilitler açık
            btn.disabled = false;
            btn.onclick = () => {
                // Oda kodunu da güvenli çekiyoruz
                let exactRoomCode = document.getElementById('displayRoomCode').textContent.trim();
                if (exactRoomCode === "" || exactRoomCode === "----") {
                    exactRoomCode = document.getElementById('roomCode').value.trim();
                }

                console.log("Kral Seçim Yaptı -> Oda:", exactRoomCode, "Kral:", exactPlayerName, "Seçilen:", answer);

                // Seçilen cevabı sunucuya fırlat!
                connection.invoke("SubmitAnswer", exactRoomCode, exactPlayerName, answer)
                    .catch(err => {
                        console.error("Kral Seçim Hatası:", err);
                        alert("Seçim gönderilirken hata oluştu!");
                    });

                // Seçtikten sonra çift tıklamayı önlemek için butonları kilitle
                kingContainer.querySelectorAll('button').forEach(b => b.disabled = true);
            };
        } else {
            // Normal oyuncuysam butonlar kilitli kalır
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            btn.style.opacity = '0.8';
        }

        kingContainer.appendChild(btn);
    });
});