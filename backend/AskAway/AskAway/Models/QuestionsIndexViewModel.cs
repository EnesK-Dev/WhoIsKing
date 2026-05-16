namespace AskAway.Models
{
    public class QuestionsIndexViewModel
    {
        public IReadOnlyList<Question> MultipleChoice { get; init; } = Array.Empty<Question>();

        public IReadOnlyList<Question> PlayerSelection { get; init; } = Array.Empty<Question>();

        public IReadOnlyList<Question> PlayerOptions { get; init; } = Array.Empty<Question>();
    }
}
