using System.Text.Json;

namespace AskAway.Models
{
    public static class QuestionOptions
    {
        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
        };

        public static IReadOnlyList<string> ParseStoredOptions(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return Array.Empty<string>();
            }

            try
            {
                var arr = JsonSerializer.Deserialize<string[]>(json, JsonOpts);
                if (arr == null)
                {
                    return Array.Empty<string>();
                }

                return arr
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s.Trim())
                    .ToList();
            }
            catch (JsonException)
            {
                return Array.Empty<string>();
            }
        }

        public static string? SerializeForStorage(IEnumerable<string> options)
        {
            var list = options
                .Where(o => !string.IsNullOrWhiteSpace(o))
                .Select(o => o.Trim())
                .Take(5)
                .ToList();

            if (list.Count < 2)
            {
                return null;
            }

            return JsonSerializer.Serialize(list, JsonOpts);
        }

        /// <summary>Kayıtlı JSON şıklarını admin textarea metnine (satır satır) çevirir.</summary>
        public static string ToAdminText(string? json)
        {
            var list = ParseStoredOptions(json);
            return list.Count == 0 ? "" : string.Join(Environment.NewLine, list);
        }

        /// <summary>Virgül veya satır sonu ile ayrılmış metinden şık listesi (en fazla 5).</summary>
        public static IReadOnlyList<string> ParseAdminInput(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return Array.Empty<string>();
            }

            return text
                .Split(new[] { ',', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim())
                .Where(p => p.Length > 0)
                .Take(5)
                .ToList();
        }

        public static string? LetterToOptionText(Question q, string? letter)
        {
            var opts = ParseStoredOptions(q.Options);
            int idx = letter switch
            {
                "A" => 0,
                "B" => 1,
                "C" => 2,
                "D" => 3,
                "E" => 4,
                _ => -1,
            };

            if (idx < 0 || idx >= opts.Count)
            {
                return null;
            }

            return opts[idx];
        }
    }
}
