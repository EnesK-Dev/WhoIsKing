using System.ComponentModel.DataAnnotations;

namespace AskAway.Models
{
    public class QuestionFormViewModel
    {
        /// <summary>0 = yeni soru; düzenlemede veritabanı kimliği.</summary>
        public int Id { get; set; }

        [Required(ErrorMessage = "Soru metni gerekli.")]
        [Display(Name = "Soru metni")]
        public string Text { get; set; } = "";

        [Display(Name = "Soru tipi")]
        public QuestionType QuestionType { get; set; } = QuestionType.MultipleChoice;

        /// <summary>Çoktan seçmeli için: virgül veya satır başına bir şık (2–5 arası).</summary>
        [Display(Name = "Şıklar")]
        public string? OptionsText { get; set; }
    }
}
