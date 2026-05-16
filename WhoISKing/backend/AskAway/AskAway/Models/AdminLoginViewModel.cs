using System.ComponentModel.DataAnnotations;

namespace AskAway.Models
{
    public class AdminLoginViewModel
    {
        [Required(ErrorMessage = "Kullanıcı adı gerekli.")]
        [Display(Name = "Kullanıcı adı")]
        public string Username { get; set; } = "";

        [Required(ErrorMessage = "Şifre gerekli.")]
        [DataType(DataType.Password)]
        [Display(Name = "Şifre")]
        public string Password { get; set; } = "";

        public string? ReturnUrl { get; set; }
    }
}
