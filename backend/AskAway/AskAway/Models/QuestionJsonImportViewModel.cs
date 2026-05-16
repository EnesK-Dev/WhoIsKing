using System.ComponentModel.DataAnnotations;

namespace AskAway.Models
{
    public class QuestionJsonImportViewModel
    {
        /// <summary>Tek soru nesnesi veya soru dizisi (JSON).</summary>
        [Display(Name = "JSON")]
        public string JsonPayload { get; set; } = "";
    }
}
