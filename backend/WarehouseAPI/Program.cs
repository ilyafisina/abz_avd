using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Services;
using System.Text.Json.Serialization;
using log4net;

var builder = WebApplication.CreateBuilder(args);

// Configure log4net
log4net.Config.XmlConfigurator.Configure(new System.IO.FileInfo("log4net.config"));

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure JSON serialization to handle circular references
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Audit Service
builder.Services.AddScoped<IAuditService, AuditService>();

// Add CORS with explicit configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Add DbContext
var connectionString = "Server=localhost;Port=3307;Database=abz_warehouse_new;Uid=root;Pwd=228abc228;";
builder.Services.AddDbContext<WarehouseContext>(options =>
    options.UseMySql(connectionString, 
        ServerVersion.AutoDetect(connectionString),
        mysqlOptions => mysqlOptions.EnableRetryOnFailure()
    )
);

var app = builder.Build();

// Configure the HTTP request pipeline
// IMPORTANT: CORS must be before all other middleware
app.UseCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// Run migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<WarehouseContext>();
    try
    {
        db.Database.Migrate();
        Console.WriteLine("✓ Database migrations applied successfully");
        
        // Seed test users if they don't exist
        SeedTestData(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"✗ Error applying migrations: {ex.Message}");
    }
}

// Seed test data function
void SeedTestData(WarehouseContext context)
{
    var users = context.Users.ToList();
    if (users.Count == 0)
    {
        var hash = HashPassword("password");
        var testUsers = new[]
        {
            new WarehouseAPI.Models.User
            {
                Username = "admin",
                Email = "admin@warehouse.local",
                PasswordHash = hash,
                Role = "admin",
                FirstName = "System",
                LastName = "Admin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new WarehouseAPI.Models.User
            {
                Username = "manager1",
                Email = "manager@warehouse.local",
                PasswordHash = hash,
                Role = "manager",
                FirstName = "Сергей",
                LastName = "Иванов",
                WarehouseId = 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new WarehouseAPI.Models.User
            {
                Username = "warehouseman1",
                Email = "warehouse@warehouse.local",
                PasswordHash = hash,
                Role = "warehouseman",
                FirstName = "Иван",
                LastName = "Петров",
                WarehouseId = 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        context.Users.AddRange(testUsers);
        context.SaveChanges();
        Console.WriteLine("✓ Test users seeded successfully");
    }
}

string HashPassword(string password)
{
    return System.Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(password)));
}

app.Run("http://localhost:5000");
