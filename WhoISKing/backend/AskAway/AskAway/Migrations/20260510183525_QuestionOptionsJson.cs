using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AskAway.Migrations
{
    /// <inheritdoc />
    public partial class QuestionOptionsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Options",
                table: "Questions",
                type: "TEXT",
                nullable: true);

            // Çoktan seçmeli (0) sorular: A–E sütunlarını tek JSON dizisinde birleştir (SQLite json_array).
            migrationBuilder.Sql(
                """
                UPDATE Questions
                SET Options = json_array(OptionA, OptionB, OptionC, OptionD, OptionE)
                WHERE QuestionType = 0;
                """);

            migrationBuilder.DropColumn(
                name: "OptionA",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "OptionB",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "OptionC",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "OptionD",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "OptionE",
                table: "Questions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OptionA",
                table: "Questions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionB",
                table: "Questions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionC",
                table: "Questions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionD",
                table: "Questions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionE",
                table: "Questions",
                type: "TEXT",
                nullable: true);

            // Geri alma: json_extract ile ilk beş öğe (varsa) A–E’ye kopyala
            migrationBuilder.Sql(
                """
                UPDATE Questions
                SET
                    OptionA = json_extract(Options, '$[0]'),
                    OptionB = json_extract(Options, '$[1]'),
                    OptionC = json_extract(Options, '$[2]'),
                    OptionD = json_extract(Options, '$[3]'),
                    OptionE = json_extract(Options, '$[4]')
                WHERE Options IS NOT NULL AND TRIM(Options) != '';
                """);

            migrationBuilder.DropColumn(
                name: "Options",
                table: "Questions");
        }
    }
}
