using AskAway.Data;
using AskAway.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AskAway.Controllers;

/// <summary>
/// JSON API — Swagger: GET /api/Question
/// (Yönetim arayüzü: <see cref="QuestionsController"/>.)
/// </summary>
[ApiController]
[Route("api/Question")]
public class QuestionController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromServices] ApplicationDbContext db)
    {
        var rows = await db.Questions
            .AsNoTracking()
            .OrderBy(q => q.Id)
            .Select(q => new { q.Id, q.Text, q.QuestionType, q.Options })
            .ToListAsync();

        var list = rows.Select(q => new
        {
            q.Id,
            q.Text,
            QuestionType = (int)q.QuestionType,
            Options = QuestionOptions.ParseStoredOptions(q.Options),
        });

        return Ok(list);
    }
}
