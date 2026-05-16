namespace AskAway.Models
{
    /// <summary>
    /// Soru türleri. Sayısal değerler GameHub tur döngüsü (targetMode) ve istemci eşlemesi ile uyumludur.
    /// </summary>
    public enum QuestionType
    {
        /// <summary>Manuel şıklar (Options JSON).</summary>
        MultipleChoice = 0,

        /// <summary>Şıklar oyunda odadaki oyuncu isimlerinden üretilir (Kral hariç).</summary>
        PlayerSelection = 1,

        /// <summary>Oyuncular metin yazar; Kral anonim şıklar arasından seçer.</summary>
        PlayerOptions = 2,
    }
}
