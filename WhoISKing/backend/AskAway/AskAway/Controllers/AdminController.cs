using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AskAway.Configuration;
using AskAway.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AskAway.Controllers
{
    [Route("Admin")]
    public class AdminController : Controller
    {
        public const string AdminRole = "Admin";

        private readonly AdminSettings _admin;

        public AdminController(IOptions<AdminSettings> adminOptions)
        {
            _admin = adminOptions.Value;
        }

        [HttpGet("Login")]
        [AllowAnonymous]
        public IActionResult Login(string? returnUrl = null)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return SafeRedirect(returnUrl);
            }

            return View(new AdminLoginViewModel { ReturnUrl = returnUrl });
        }

        [HttpPost("Login")]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(AdminLoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var cfgUser = _admin.Username ?? "";
            var cfgPass = _admin.Password ?? "";

            if (cfgUser.Length == 0 || cfgPass.Length == 0)
            {
                ModelState.AddModelError(string.Empty, "Admin hesabı yapılandırılmamış. appsettings içinde AdminSettings kontrol edin.");
                return View(model);
            }

            if (!FixedTimeEquals(model.Username, cfgUser) || !FixedTimeEquals(model.Password, cfgPass))
            {
                ModelState.AddModelError(string.Empty, "Kullanıcı adı veya şifre hatalı.");
                return View(model);
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, model.Username.Trim()),
                new Claim(ClaimTypes.Role, AdminRole),
            };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            var props = new AuthenticationProperties
            {
                IsPersistent = true,
                AllowRefresh = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8),
            };

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                props);

            return SafeRedirect(model.ReturnUrl);
        }

        [HttpPost("Logout")]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction(nameof(Login));
        }

        private IActionResult SafeRedirect(string? returnUrl)
        {
            if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }

            return RedirectToAction("Index", "Questions");
        }

        /// <summary>UTF-8 baytları üzerinde sabit süreli karşılaştırma (basit sızıntı azaltımı).</summary>
        private static bool FixedTimeEquals(string a, string b)
        {
            var ba = Encoding.UTF8.GetBytes(a.Trim());
            var bb = Encoding.UTF8.GetBytes(b.Trim());
            return ba.Length == bb.Length && CryptographicOperations.FixedTimeEquals(ba, bb);
        }
    }
}
