using System.Text.Json;
using System.Text.Json.Nodes;
using AskAway.Data;
using AskAway.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AskAway.Controllers
{
    [Authorize(Roles = AdminController.AdminRole)]
    [Route("Admin/Questions")]
    public class QuestionsController : Controller
    {
        private static readonly JsonDocumentOptions JsonImportDocOpts = new()
        {
            CommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true,
        };

        private readonly ApplicationDbContext _context;

        public QuestionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [HttpGet("Index")]
        public async Task<IActionResult> Index()
        {
            var all = await _context.Questions
                .OrderBy(q => q.Id)
                .ToListAsync();

            var vm = new QuestionsIndexViewModel
            {
                MultipleChoice = all.Where(q => q.QuestionType == QuestionType.MultipleChoice).ToList(),
                PlayerSelection = all.Where(q => q.QuestionType == QuestionType.PlayerSelection).ToList(),
                PlayerOptions = all.Where(q => q.QuestionType == QuestionType.PlayerOptions).ToList(),
            };

            return View(vm);
        }

        [HttpGet("Create")]
        public IActionResult Create()
        {
            return View(new QuestionFormViewModel());
        }

        [HttpPost("Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(QuestionFormViewModel vm)
        {
            vm.Id = 0;

            if (!ModelState.IsValid || !TryValidateOptions(vm, out var optionsJson))
            {
                return View(vm);
            }

            var entity = new Question
            {
                Text = vm.Text.Trim(),
                QuestionType = vm.QuestionType,
                Options = optionsJson,
            };

            _context.Questions.Add(entity);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        [HttpGet("Edit/{id:int}")]
        public async Task<IActionResult> Edit(int id)
        {
            var entity = await _context.Questions.FindAsync(id);
            if (entity == null)
            {
                return NotFound();
            }

            var vm = new QuestionFormViewModel
            {
                Id = entity.Id,
                Text = entity.Text,
                QuestionType = entity.QuestionType,
                OptionsText = QuestionOptions.ToAdminText(entity.Options),
            };

            return View(vm);
        }

        [HttpPost("Edit/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int id, QuestionFormViewModel vm)
        {
            if (id != vm.Id)
            {
                return BadRequest();
            }

            var entity = await _context.Questions.FindAsync(id);
            if (entity == null)
            {
                return NotFound();
            }

            if (!ModelState.IsValid || !TryValidateOptions(vm, out var optionsJson))
            {
                return View(vm);
            }

            entity.Text = vm.Text.Trim();
            entity.QuestionType = vm.QuestionType;
            entity.Options = optionsJson;

            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        [HttpPost("Delete/{id:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var question = await _context.Questions.FindAsync(id);
            if (question != null)
            {
                _context.Questions.Remove(question);
                await _context.SaveChangesAsync();
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpGet("CreateFromJson")]
        public IActionResult CreateFromJson()
        {
            return View(new QuestionJsonImportViewModel());
        }

        [HttpPost("CreateFromJson")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateFromJson(QuestionJsonImportViewModel vm)
        {
            if (string.IsNullOrWhiteSpace(vm.JsonPayload))
            {
                ModelState.AddModelError(nameof(vm.JsonPayload), "JSON metni gerekli.");
                return View(vm);
            }

            List<Question> toAdd;
            try
            {
                toAdd = ParseQuestionsFromJson(vm.JsonPayload.Trim());
            }
            catch (JsonException ex)
            {
                ModelState.AddModelError(nameof(vm.JsonPayload), ex.Message);
                return View(vm);
            }

            if (toAdd.Count == 0)
            {
                ModelState.AddModelError(nameof(vm.JsonPayload), "En az bir geçerli soru üretilemedi.");
                return View(vm);
            }

            _context.Questions.AddRange(toAdd);
            await _context.SaveChangesAsync();
            TempData["JsonImportMessage"] = $"{toAdd.Count} soru eklendi.";
            return RedirectToAction(nameof(Index));
        }

        /// <summary>Çoktan seçmeli için şık doğrulaması; diğer tiplerde <paramref name="optionsJson"/> null döner.</summary>
        private bool TryValidateOptions(QuestionFormViewModel vm, out string? optionsJson)
        {
            optionsJson = null;

            if (vm.QuestionType != QuestionType.MultipleChoice)
            {
                return true;
            }

            var parsed = QuestionOptions.ParseAdminInput(vm.OptionsText);
            if (parsed.Count < 2)
            {
                ModelState.AddModelError(nameof(vm.OptionsText), "Çoktan seçmeli sorularda en az 2 şık girin.");
                return false;
            }

            if (parsed.Count > 5)
            {
                ModelState.AddModelError(nameof(vm.OptionsText), "En fazla 5 şık girebilirsiniz (A–E).");
                return false;
            }

            optionsJson = QuestionOptions.SerializeForStorage(parsed);
            if (optionsJson == null)
            {
                ModelState.AddModelError(nameof(vm.OptionsText), "Şıklar kaydedilemedi.");
                return false;
            }

            return true;
        }

        private List<Question> ParseQuestionsFromJson(string json)
        {
            var node = JsonNode.Parse(json, documentOptions: JsonImportDocOpts);
            if (node == null)
            {
                throw new JsonException("Boş veya geçersiz JSON.");
            }

            var list = new List<Question>();
            if (node is JsonArray arr)
            {
                var i = 0;
                foreach (var item in arr)
                {
                    if (item is not JsonObject o)
                    {
                        throw new JsonException($"Dizi öğesi [{i}]: bir nesne (object) olmalı.");
                    }

                    list.Add(ParseQuestionObject(o, i));
                    i++;
                }
            }
            else if (node is JsonObject o)
            {
                list.Add(ParseQuestionObject(o, 0));
            }
            else
            {
                throw new JsonException("Kök bir nesne { ... } veya dizi [ ... ] olmalı.");
            }

            return list;
        }

        private static Question ParseQuestionObject(JsonObject o, int index)
        {
            var label = index == 0 && o.Count > 0 ? "Soru" : $"Soru [{index}]";
            var text = GetStringProp(o, "text");
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new JsonException($"{label}: \"text\" zorunlu.");
            }

            var typeNode = GetPropCi(o, "questionType") ?? GetPropCi(o, "QuestionType");
            if (!TryParseQuestionType(typeNode, out var qType, out var typeErr))
            {
                throw new JsonException($"{label}: {typeErr}");
            }

            string? optionsJson = null;
            if (qType == QuestionType.MultipleChoice)
            {
                var optNode = GetPropCi(o, "options") ?? GetPropCi(o, "Options");
                if (optNode is not JsonArray optArr)
                {
                    throw new JsonException($"{label}: çoktan seçmeli için \"options\" bir dizi olmalı.");
                }

                var opts = new List<string>();
                foreach (var el in optArr)
                {
                    if (el == null)
                    {
                        continue;
                    }

                    var s = NodeToTrimmedString(el);
                    if (!string.IsNullOrEmpty(s))
                    {
                        opts.Add(s);
                    }
                }

                if (opts.Count < 2)
                {
                    throw new JsonException($"{label}: en az 2 dolu şık gerekli.");
                }

                if (opts.Count > 5)
                {
                    throw new JsonException($"{label}: en fazla 5 şık.");
                }

                optionsJson = QuestionOptions.SerializeForStorage(opts);
                if (optionsJson == null)
                {
                    throw new JsonException($"{label}: şıklar kayda dönüştürülemedi.");
                }
            }

            return new Question
            {
                Text = text.Trim(),
                QuestionType = qType,
                Options = optionsJson,
            };
        }

        private static JsonNode? GetPropCi(JsonObject o, string name)
        {
            foreach (var p in o)
            {
                if (string.Equals(p.Key, name, StringComparison.OrdinalIgnoreCase))
                {
                    return p.Value;
                }
            }

            return null;
        }

        private static string? GetStringProp(JsonObject o, string key)
        {
            var n = GetPropCi(o, key);
            return NodeToTrimmedString(n);
        }

        private static string? NodeToTrimmedString(JsonNode? n)
        {
            if (n == null)
            {
                return null;
            }

            if (n is JsonValue jv)
            {
                if (jv.TryGetValue<string>(out var s))
                {
                    return s;
                }

                if (jv.TryGetValue<int>(out var i))
                {
                    return i.ToString();
                }
            }

            return n.ToString()?.Trim();
        }

        private static bool TryParseQuestionType(JsonNode? n, out QuestionType qt, out string err)
        {
            qt = default;
            err = "\"questionType\" gerekli (0–2, enum adı veya standard / player_select / text_input).";
            if (n == null)
            {
                return false;
            }

            if (n is JsonValue jv)
            {
                if (jv.TryGetValue<int>(out var i))
                {
                    if (Enum.IsDefined(typeof(QuestionType), i))
                    {
                        qt = (QuestionType)i;
                        return true;
                    }

                    err = $"Geçersiz questionType sayısı: {i}.";
                    return false;
                }

                if (jv.TryGetValue<string>(out var s))
                {
                    return TryParseQuestionTypeFromString(s, out qt, out err);
                }
            }

            var raw = n.ToString()?.Trim().Trim('"');
            return TryParseQuestionTypeFromString(raw, out qt, out err);
        }

        private static bool TryParseQuestionTypeFromString(string? raw, out QuestionType qt, out string err)
        {
            qt = default;
            err = "questionType anlaşılamadı.";
            if (string.IsNullOrWhiteSpace(raw))
            {
                return false;
            }

            var compact = raw.Replace("_", "", StringComparison.Ordinal)
                .Replace(" ", "", StringComparison.Ordinal);
            var lower = compact.ToLowerInvariant();

            switch (lower)
            {
                case "0":
                case "multiplechoice":
                case "standard":
                    qt = QuestionType.MultipleChoice;
                    return true;
                case "1":
                case "playerselection":
                case "playerselect":
                    qt = QuestionType.PlayerSelection;
                    return true;
                case "2":
                case "playeroptions":
                case "textinput":
                    qt = QuestionType.PlayerOptions;
                    return true;
            }

            if (Enum.TryParse<QuestionType>(compact, true, out var e))
            {
                qt = e;
                return true;
            }

            return false;
        }
    }
}
