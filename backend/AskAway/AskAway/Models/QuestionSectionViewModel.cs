namespace AskAway.Models
{
    public class QuestionSectionViewModel
    {
        public required string AnchorId { get; init; }

        public required string Title { get; init; }

        public IReadOnlyList<Question> Questions { get; init; } = Array.Empty<Question>();
    }
}
