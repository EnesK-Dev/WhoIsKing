using AskAway.Configuration;
using AskAway.Data;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AdminSettings>(
    builder.Configuration.GetSection(AdminSettings.SectionName));

// 1. MVC (Controller ve View) yap�s�n� ekliyoruz
builder.Services.AddControllersWithViews();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Admin/Login";
        options.LogoutPath = "/Admin/Logout";
        options.AccessDeniedPath = "/Admin/Login";
        options.Cookie.Name = "AskAway.Admin";
        options.Cookie.HttpOnly = true;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
    });

builder.Services.AddAuthorization();

// 2. Veritaban� (DbContext) ayar�n� ekliyoruz
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// 3. SignalR (Ger�ek Zamanl� �leti�im) servisini ekliyoruz
builder.Services.AddSignalR();

// Expo / ngrok / taray�c� istemciler i�in (geli�tirme)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyHeader()
            .AllowAnyMethod()
            .SetIsOriginAllowed(_ => true);
    });
});

// Arka plan temizlik servisimizi sisteme kaydediyoruz
builder.Services.AddHostedService<RoomCleanupService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // wwwroot klas�r�ndeki CSS ve JS dosyalar�n� okuyabilmek i�in

app.UseRouting();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Attribute route: GET /api/Question (Swagger)
app.MapControllers();

// 4. Varsay�lan sayfa y�nlendirmesi
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapHub<AskAway.Hubs.GameHub>("/gameHub");

app.Run();