using AskAway.Data;
using AskAway.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AskAway.Hubs
{
    // Hub sınıfından miras alıyoruz, bu sayede SignalR yetenekleri kazanıyor
    public class GameHub : Hub
    {
        private readonly ApplicationDbContext _context;

        // Veritabanı (DbContext) tercümanımızı buraya çağırıyoruz
        public GameHub(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>SignalR grup adı veritabanındaki <see cref="Room.RoomCode"/> ile aynı olmalı (4 büyük harf/rakam, trim).</summary>
        private static string NormalizeRoomCode(string? roomCode) =>
            (roomCode ?? string.Empty).Trim().ToUpperInvariant();

        /// <summary>EF Core SQLite <c>OrderBy(_ =&gt; Guid.NewGuid())</c> çevirisini desteklemez; havuzu bellekte karıştırırız.</summary>
        private static Question? PickRandomQuestion(IReadOnlyList<Question> pool) =>
            pool.Count == 0 ? null : pool[Random.Shared.Next(pool.Count)];

        // 1. ODA KURMA METODU
        public async Task CreateRoom(string playerName)
        {
            // Rastgele 4 haneli kod üret (Örn: "A7B2")
            string roomCode = Guid.NewGuid().ToString().Substring(0, 4).ToUpper();

            // Odayı veritabanına kaydet
            var room = new Room { RoomCode = roomCode, CurrentState = "Lobby" };
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            // Kuran kişiyi "Host" (Kral değil, oda sahibi) olarak kaydet
            var player = new Player
            {
                Name = playerName,
                ConnectionId = Context.ConnectionId, // Tarayıcı kimliği
                IsHost = true,
                RoomId = room.Id
            };
            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            // Oyuncuyu SignalR grubuna (odaya) ekle
            await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

            // Oyuncunun ekranına (Frontend'e) oda kodunu gönder
            await Clients.Caller.SendAsync("RoomCreated", roomCode);
        }

        // 2. ODAYA KATILMA METODU
        public async Task JoinRoom(string roomCode, string playerName)
        {
            var code = NormalizeRoomCode(roomCode);
            if (code.Length != 4)
            {
                await Clients.Caller.SendAsync("Error", "Oda kodu 4 karakter olmalıdır.");
                return;
            }

            // .Include(r => r.Players) ile oyuncuları da çek
            var room = await _context.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.RoomCode == code);

            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Böyle bir oda bulunamadı!");
                return;
            }

            if (room.Players.Count >= 6)
            {
                await Clients.Caller.SendAsync("Error", "Oda dolu! Maksimum 6 oyuncu katılabilir.");
                return;
            }

            var player = new Player
            {
                Name = playerName,
                ConnectionId = Context.ConnectionId,
                IsHost = false,
                RoomId = room.Id
            };
            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            await Groups.AddToGroupAsync(Context.ConnectionId, code);

            // DEĞİŞEN KISIM BURASI: Odadaki tüm oyuncuların güncel listesini çekiyoruz
            var playerList = await _context.Players
                .Where(p => p.RoomId == room.Id)
                .Select(p => new { p.Name, p.IsHost })
                .ToListAsync();

            // Sadece katılanın adını değil, tüm listeyi herkese gönderiyoruz
            await Clients.Group(code).SendAsync("UpdatePlayerList", playerList);
        }

        // 3. OYUNU BAŞLATMA METODU
        public async Task StartGame(string roomCode)
        {
            var code = NormalizeRoomCode(roomCode);
            if (code.Length != 4)
            {
                await Clients.Caller.SendAsync("Notify", "Geçersiz oda kodu.");
                return;
            }

            // Odayı ve içindeki oyuncuları bul
            var room = await _context.Rooms.Include(r => r.Players).FirstOrDefaultAsync(r => r.RoomCode == code);
            if (room == null)
            {
                await Clients.Caller.SendAsync("Notify", "Oda bulunamadı. Sayfayı yenileyip odayı yeniden kurmayı deneyin.");
                return;
            }

            if (!room.Players.Any())
            {
                await Clients.Caller.SendAsync("Notify", "Odada oyuncu yok.");
                return;
            }

            // --- 1. OYUN SIFIRLAMA VE TEMİZLİK ---
            if (room.Players.Any(p => p.Score >= room.WinningScore))
            {
                foreach (var p in room.Players) { p.Score = 0; }
                room.CurrentRound = 1; // Oyun tamamen bittiyse turu da 1'den başlat
                room.CurrentKingIndex = 0; // İhtiyat olarak sıfırlıyoruz
            }

            foreach (var p in room.Players)
            {
                p.CurrentAnswer = null;
                p.AnswerOrder = 0;
            }
            await _context.SaveChangesAsync();

            // --- 3. TUR MANTIĞINA GÖRE SORU SEÇİMİ (YENİ MANTIK) ---
            int playerCount = room.Players.Count;

            // Matematik: Herkes bir kez Kral olana kadar mod değişmez! 
            // Örn 3 oyuncu varsa: Tur 1, 2, 3 -> Mod 0. Tur 4, 5, 6 -> Mod 1.
            int targetMode = ((room.CurrentRound - 1) / playerCount) % 3;

            var modePool = await _context.Questions
                .Where(q => q.QuestionType == (QuestionType)targetMode)
                .ToListAsync();

            var question = PickRandomQuestion(modePool);

            // Eğer o modda hiç soru yoksa, herhangi bir soru getir (Oyunun kitlenmemesi için)
            if (question == null)
            {
                var anyPool = await _context.Questions.ToListAsync();
                question = PickRandomQuestion(anyPool);
            }

            if (question == null)
            {
                await Clients.Caller.SendAsync(
                    "Notify",
                    "Veritabanında hiç soru yok. Admin panelinden (/Admin/Questions) en az bir soru ekleyin.");
                return;
            }

            // --- 4. SIRALI KRAL SEÇİMİ (YENİ MANTIK) ---
            var playersList = room.Players.OrderBy(p => p.Id).ToList();

            // Kral her tur düzenli olarak bir sonraki kişiye geçer
            var king = playersList[(room.CurrentRound - 1) % playerCount];

            // Bir sonraki tur hazırlıkları
            room.CurrentRound++; // Turu bir artırıyoruz
            room.CurrentState = "Playing";
            room.KingPlayerId = king.Id;
            room.CurrentQuestionId = question.Id;
            await _context.SaveChangesAsync();

            // --- 5. MODA GÖRE ŞIKLARI HAZIRLA ---
            object finalOptions;

            // Oyuncu seçme: şıklar odadaki oyuncu isimleri (Kral hariç)
            if (question.QuestionType == QuestionType.PlayerSelection)
            {
                var otherPlayers = room.Players
                    .Where(p => p.Name != king.Name)
                    .Select(p => p.Name)
                    .ToList();

                finalOptions = otherPlayers;
            }
            else
            {
                // Çoktan seçmeli: Options JSON; oyuncu katılımlı tipte şık yoktur (oyun içi doldurulur)
                finalOptions = QuestionOptions.ParseStoredOptions(question.Options);
            }

            foreach (var p in room.Players)
            {
                var gameData = new
                {
                    kingName = king.Name,
                    isYouKing = p.Id == king.Id,
                    questionText = question.Text,
                    options = finalOptions,
                    questionType = question.QuestionType
                };

                await Clients.Client(p.ConnectionId).SendAsync("GameStarted", gameData);
            }
        }
        // 4b. CEVABI GERİ ALMA METODU
        public async Task UndoAnswer(string roomCode, string playerName)
        {
            var code = NormalizeRoomCode(roomCode);
            var room = await _context.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.RoomCode == code);
            if (room == null || room.CurrentState != "Playing") return;

            var player = room.Players.FirstOrDefault(p =>
                string.Equals(p.Name, playerName, StringComparison.OrdinalIgnoreCase));
            if (player == null || string.IsNullOrEmpty(player.CurrentAnswer)) return;

            player.CurrentAnswer = null;
            player.AnswerOrder = 0;
            await _context.SaveChangesAsync();

            int answeredCount = room.Players.Count(p => !string.IsNullOrEmpty(p.CurrentAnswer));
            int totalPlayers = room.Players.Count;

            await Clients.Group(code).SendAsync("UpdateAnswerCount", answeredCount, totalPlayers);
            await Clients.Caller.SendAsync("AnswerUndone");
        }

        // 4c. ODAYA YENİDEN KATILMA METODU (Yenileme / Alt-Tab sonrası)
        public async Task RejoinRoom(string roomCode, string playerName)
        {
            var code = NormalizeRoomCode(roomCode);
            var room = await _context.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.RoomCode == code);
            if (room == null)
            {
                await Clients.Caller.SendAsync("Error", "Oda bulunamadı.");
                return;
            }

            var player = room.Players.FirstOrDefault(p =>
                string.Equals(p.Name, playerName, StringComparison.OrdinalIgnoreCase));
            if (player == null)
            {
                await Clients.Caller.SendAsync("Error", "Oyuncu bu odada bulunamadı.");
                return;
            }

            player.ConnectionId = Context.ConnectionId;
            await _context.SaveChangesAsync();
            await Groups.AddToGroupAsync(Context.ConnectionId, code);

            var playerList = room.Players
                .Select(p => new { name = p.Name, isHost = p.IsHost })
                .ToList();

            if (room.CurrentState == "Lobby")
            {
                await Clients.Caller.SendAsync("RejoinedLobby", new { players = playerList, roomCode = code });
            }
            else if (room.CurrentState == "Playing" && room.CurrentQuestionId.HasValue)
            {
                var question = await _context.Questions.FindAsync(room.CurrentQuestionId.Value);
                var king = room.Players.FirstOrDefault(p => p.Id == room.KingPlayerId);
                bool isYouKing = string.Equals(king?.Name, playerName, StringComparison.OrdinalIgnoreCase);

                List<string> options;
                if (question?.QuestionType == QuestionType.PlayerSelection)
                {
                    options = room.Players
                        .Where(p => p.Id != king?.Id)
                        .Select(p => p.Name)
                        .ToList();
                }
                else
                {
                    options = QuestionOptions.ParseStoredOptions(question?.Options).ToList();
                }

                int answeredCount = room.Players.Count(p => !string.IsNullOrEmpty(p.CurrentAnswer));
                bool alreadyAnswered = !string.IsNullOrEmpty(player.CurrentAnswer);

                await Clients.Caller.SendAsync("RejoinedGame", new
                {
                    kingName = king?.Name,
                    isYouKing,
                    questionText = question?.Text,
                    options,
                    questionType = (int)(question?.QuestionType ?? QuestionType.MultipleChoice),
                    answeredCount,
                    totalPlayers = room.Players.Count,
                    alreadyAnswered
                });
            }
        }

        // 4. CEVAP GÖNDERME METODU
        public async Task SubmitAnswer(string roomCode, string playerName, string selectedOption)
        {
            var code = NormalizeRoomCode(roomCode);
            if (code.Length != 4)
            {
                return;
            }

            // 1. Odayı, oyuncuları ve o anki soruyu veritabanından getiriyoruz
            var room = await _context.Rooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.RoomCode == code);

            if (room == null) return;

            var player = room.Players.FirstOrDefault(p => p.ConnectionId == Context.ConnectionId)
                ?? room.Players.FirstOrDefault(p => p.Name == playerName);
            var currentQuestion = await _context.Questions.FindAsync(room.CurrentQuestionId);
            if (player == null || currentQuestion == null) return;

            var king = room.Players.First(p => p.Id == room.KingPlayerId);

            bool isMod2 = currentQuestion.QuestionType == QuestionType.PlayerOptions;
            bool isKing = player.Id == king.Id;

            // 2. Cevap veren oyuncuyu kaydediyoruz
            if (string.IsNullOrEmpty(player.CurrentAnswer))
            {
                int currentOrder = room.Players.Count(p => !string.IsNullOrEmpty(p.CurrentAnswer)) + 1;
                player.CurrentAnswer = selectedOption;
                player.AnswerOrder = currentOrder;
                await _context.SaveChangesAsync();
            }

            int totalPlayers = room.Players.Count;

            // ====================================================================
            // MOD 2 (YORUM) için çift aşamalı özel kurallar
            // ====================================================================
            if (isMod2)
            {
                if (isKing)
                {
                    // AŞAMA 3: KRAL SON KARARINI VERDİ VE OYUN BİTİYOR!
                    // Kralın seçtiği cevabı yazan "Kazananı" buluyoruz
                    var winner = room.Players.FirstOrDefault(p => p.Id != king.Id && p.CurrentAnswer == selectedOption);

                    int mod2Points = 5;
                    if (winner != null)
                    {
                        winner.Score += mod2Points;
                    }

                    var roundResults = new List<object>();
                    foreach (var p in room.Players)
                    {
                        bool isWinner = (winner != null && p.Id == winner.Id);
                        int pointsEarned = isWinner ? mod2Points : 0;
                        roundResults.Add(new
                        {
                            playerName = p.Name,
                            isKing = p.Id == king.Id,
                            answerText = p.Id == king.Id ? "Seçici" : p.CurrentAnswer,
                            isCorrect = isWinner,
                            score = p.Score,
                            pointsEarned
                        });
                    }

                    bool isGameOver = room.Players.Any(p => p.Score >= room.WinningScore);
                    await _context.SaveChangesAsync();

                    // Sonuç ekranını herkese yolla
                    await Clients.Group(code).SendAsync("ShowResults", new
                    {
                        correctAnswerLetter = "",
                        correctAnswerContent = selectedOption, // Kralın seçtiği komik yazı
                        playerResults = roundResults.OrderByDescending(r => (int)r.GetType().GetProperty("score").GetValue(r)).ToList(),
                        isGameOver = isGameOver
                    });
                }
                else
                {
                    // AŞAMA 1 & 2: OYUNCULAR YAZI YAZIYOR (Kral beklenmiyor)
                    // Mod 2'de hedef kişi sayısı toplam sayıdan 1 eksiktir (Kral yazmayacağı için)
                    int targetAnswers = totalPlayers - 1;
                    int answeredPlayers = await _context.Players
                        .Where(p => p.RoomId == room.Id && p.Id != king.Id && !string.IsNullOrEmpty(p.CurrentAnswer))
                        .CountAsync();

                    await Clients.Group(code).SendAsync("UpdateAnswerCount", answeredPlayers, targetAnswers);

                    if (answeredPlayers >= targetAnswers)
                    {
                        // HERKES YAZDI! Şimdi cevapları toplayıp anonim (isimsiz) şekilde Kral'a yollayalım
                        var anonymousAnswers = await _context.Players
                            .Where(p => p.RoomId == room.Id && p.Id != king.Id && !string.IsNullOrEmpty(p.CurrentAnswer))
                            .Select(p => p.CurrentAnswer!)
                            .ToListAsync();

                        anonymousAnswers = anonymousAnswers
                            .OrderBy(_ => Guid.NewGuid()) // Cevapları karıştır
                            .ToList();

                        // Yeni komut: "KralSeçimEkranınıGöster"
                        await Clients.Group(code).SendAsync("ShowKingSelection", anonymousAnswers);
                    }
                }
            }
            // ====================================================================
            // MOD 0 ve 1 için klasik kurallar (eski kod)
            // ====================================================================
            // ====================================================================
            // MOD 0 ve 1 için klasik kurallar (güncellendi)
            // ====================================================================
            else
            {
                int answeredPlayers = await _context.Players
                    .Where(p => p.RoomId == room.Id && !string.IsNullOrEmpty(p.CurrentAnswer))
                    .CountAsync();

                await Clients.Group(code).SendAsync("UpdateAnswerCount", answeredPlayers, totalPlayers);

                if (answeredPlayers >= totalPlayers)
                {
                    string kingLetter = king.CurrentAnswer; // Kralın seçtiği harf (A, B, C...)
                    string kingAnswerText = "";

                    // 1. Kralın cevabını çözümle
                    if (currentQuestion.QuestionType == QuestionType.PlayerSelection)
                    {
                        var dynamicOptions = room.Players.Where(p => p.Name != king.Name).Select(p => p.Name).ToList();

                        int kingIndex = kingLetter switch { "A" => 0, "B" => 1, "C" => 2, "D" => 3, "E" => 4, _ => -1 };

                        kingAnswerText = (kingIndex >= 0 && kingIndex < dynamicOptions.Count)
                            ? dynamicOptions[kingIndex]
                            : kingLetter;
                    }
                    else
                    {
                        kingAnswerText = QuestionOptions.LetterToOptionText(currentQuestion, kingLetter) ?? "Bilinmeyen Şık";
                    }

                    // Puanları dağıt: 1. doğru cevap +5, 2. +4, 3. ve sonrası +3
                    var correctPlayers = room.Players
                        .Where(p => p.Id != king.Id && p.CurrentAnswer == kingLetter)
                        .OrderBy(p => p.AnswerOrder)
                        .ToList();

                    var earnedMap = new Dictionary<int, int>();
                    for (int i = 0; i < correctPlayers.Count; i++)
                    {
                        var p = correctPlayers[i];
                        int earned = i == 0 ? 5 : (i == 1 ? 4 : 3);
                        p.Score += earned;
                        earnedMap[p.Id] = earned;
                    }

                    // 2. Oyuncuların cevaplarını çözümle
                    var roundResults = new List<object>();
                    foreach (var p in room.Players)
                    {
                        bool isCorrect = (p.Id != king.Id && p.CurrentAnswer == kingLetter);
                        string playerAnswerText = "";

                        if (!string.IsNullOrEmpty(p.CurrentAnswer))
                        {
                            if (currentQuestion.QuestionType == QuestionType.PlayerSelection)
                            {
                                var dynamicOptions = room.Players.Where(pl => pl.Name != king.Name).Select(pl => pl.Name).ToList();
                                int pIndex = p.CurrentAnswer switch { "A" => 0, "B" => 1, "C" => 2, "D" => 3, "E" => 4, _ => -1 };
                                playerAnswerText = (pIndex >= 0 && pIndex < dynamicOptions.Count) ? dynamicOptions[pIndex] : p.CurrentAnswer;
                            }
                            else
                            {
                                playerAnswerText = QuestionOptions.LetterToOptionText(currentQuestion, p.CurrentAnswer) ?? "Cevapsız";
                            }
                        }

                        int pointsEarned = 0;
                        if (isCorrect) earnedMap.TryGetValue(p.Id, out pointsEarned);
                        roundResults.Add(new
                        {
                            playerName = p.Name,
                            isKing = p.Id == king.Id,
                            answerText = playerAnswerText,
                            isCorrect = isCorrect,
                            score = p.Score,
                            pointsEarned
                        });
                    }

                    bool isGameOver = room.Players.Any(p => p.Score >= room.WinningScore);
                    await _context.SaveChangesAsync();

                    await Clients.Group(code).SendAsync("ShowResults", new
                    {
                        correctAnswerLetter = kingLetter,
                        correctAnswerContent = kingAnswerText,
                        playerResults = roundResults.OrderByDescending(r => (int)r.GetType().GetProperty("score").GetValue(r)).ToList(),
                        isGameOver = isGameOver
                    });
                }
            }
        }
    }
}