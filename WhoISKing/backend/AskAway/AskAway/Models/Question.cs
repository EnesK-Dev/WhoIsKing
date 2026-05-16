namespace AskAway.Models
{
    public class Question
    {
        public int Id { get; set; }

        public string Text { get; set; } = "";

        /// <summary>Çoktan seçmeli sorularda şıkların JSON dizisi (örn. ["A","B","C"]). Diğer tiplerde null.</summary>
        public string? Options { get; set; }

        public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;
    }
}
