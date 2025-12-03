using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public UsersController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        return await _context.Users.Include(u => u.Warehouse).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User?>> GetUser(int id)
    {
        var user = await _context.Users.Include(u => u.Warehouse).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound();
        return user;
    }

    [HttpPost("login")]
    public async Task<ActionResult<object>> Login(LoginRequest request)
    {
        var user = await _context.Users.Include(u => u.Warehouse).FirstOrDefaultAsync(u => u.Username == request.Username);
        
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        if (user == null || user.PasswordHash != HashPassword(request.Password))
        {
            await _auditService.LogActionAsync(
                "LOGIN_FAILED",
                "User",
                null,
                null,
                null,
                description: $"Failed login attempt for user: {request.Username}",
                logLevel: "WARNING",
                ipAddress: ipAddress
            );
            return Unauthorized();
        }

        // Обновляем статус online и время последнего посещения
        user.IsOnline = true;
        user.LastSeenAt = DateTime.Now;
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "LOGIN",
            "User",
            user.Id,
            user.Id,
            user.WarehouseId,
            description: $"User {user.Username} logged in",
            logLevel: "INFO",
            ipAddress: ipAddress
        );

        return Ok(new 
        { 
            user = new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                phone = user.Phone,
                role = user.Role,
                firstName = user.FirstName ?? user.Username,
                lastName = user.LastName ?? "",
                isActive = user.IsActive,
                isOnline = user.IsOnline,
                lastSeenAt = user.LastSeenAt,
                createdAt = user.CreatedAt,
                warehouseId = user.WarehouseId,
                warehouse = user.Warehouse != null ? new { id = user.Warehouse.Id, name = user.Warehouse.Name } : null
            },
            token = GenerateToken(user.Id, user.Username, user.Role)
        });
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<object>> CreateUser(User user)
    {
        // Проверяем валидность данных
        if (string.IsNullOrWhiteSpace(user.Username) || string.IsNullOrWhiteSpace(user.Email))
            return BadRequest(new { error = "Username и Email обязательны" });

        // Проверяем уникальность username
        var existingUsername = await _context.Users.FirstOrDefaultAsync(u => u.Username == user.Username);
        if (existingUsername != null)
            return BadRequest(new { error = "Пользователь с таким никнеймом уже существует" });

        // Проверяем уникальность email
        var existingEmail = await _context.Users.FirstOrDefaultAsync(u => u.Email == user.Email);
        if (existingEmail != null)
            return BadRequest(new { error = "Пользователь с таким email уже существует" });

        // Проверяем уникальность phone если указан
        if (!string.IsNullOrWhiteSpace(user.Phone))
        {
            var existingPhone = await _context.Users.FirstOrDefaultAsync(u => u.Phone == user.Phone);
            if (existingPhone != null)
                return BadRequest(new { error = "Пользователь с таким номером телефона уже существует" });
        }

        user.PasswordHash = HashPassword(user.PasswordHash);
        user.CreatedAt = DateTime.Now;
        user.UpdatedAt = DateTime.Now;
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "CREATE",
            "User",
            user.Id,
            userId,
            user.WarehouseId,
            description: $"User {user.Username} ({user.Email}) created",
            logLevel: "INFO"
        );
        
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateUser(int id, User user)
    {
        try
        {
            if (id != user.Id)
                return BadRequest(new { error = "ID не совпадает" });

            var existingUser = await _context.Users.FindAsync(id);
            if (existingUser == null)
                return NotFound(new { error = "Пользователь не найден" });

            // Проверяем уникальность username если изменился
            if (existingUser.Username != user.Username)
            {
                var duplicateUsername = await _context.Users.FirstOrDefaultAsync(u => u.Username == user.Username);
                if (duplicateUsername != null)
                    return BadRequest(new { error = "Пользователь с таким никнеймом уже существует" });
            }

            // Проверяем уникальность email если изменился
            if (existingUser.Email != user.Email)
            {
                var duplicateEmail = await _context.Users.FirstOrDefaultAsync(u => u.Email == user.Email);
                if (duplicateEmail != null)
                    return BadRequest(new { error = "Пользователь с таким email уже существует" });
            }

            // Проверяем уникальность phone если изменился и не пустой
            if (!string.IsNullOrWhiteSpace(user.Phone) && existingUser.Phone != user.Phone)
            {
                var duplicatePhone = await _context.Users.FirstOrDefaultAsync(u => u.Phone == user.Phone);
                if (duplicatePhone != null)
                    return BadRequest(new { error = "Пользователь с таким номером телефона уже существует" });
            }

            existingUser.Username = user.Username;
            existingUser.Email = user.Email;
            existingUser.Phone = user.Phone;
            existingUser.FirstName = user.FirstName;
            existingUser.LastName = user.LastName;
            existingUser.Role = user.Role;
            existingUser.WarehouseId = user.WarehouseId;
            existingUser.IsActive = user.IsActive;
            existingUser.UpdatedAt = DateTime.Now;

            if (!string.IsNullOrEmpty(user.PasswordHash))
            {
                if (user.PasswordHash.Length < 40 || !IsValidBase64(user.PasswordHash))
                {
                    existingUser.PasswordHash = HashPassword(user.PasswordHash);
                }
                else
                {
                    existingUser.PasswordHash = user.PasswordHash;
                }
            }

            _context.Entry(existingUser).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            await _auditService.LogActionAsync(
                "UPDATE",
                "User",
                id,
                int.TryParse(userIdClaim, out var userId) ? userId : (int?)null,
                existingUser.WarehouseId,
                description: $"User {existingUser.Username} updated"
            );

            return NoContent();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"UpdateUser error: {ex.Message}");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "DELETE",
            "User",
            id,
            userId,
            user.WarehouseId,
            description: $"User {user.Username} deleted",
            logLevel: "WARNING"
        );

        return NoContent();
    }

    private bool UserExists(int id)
    {
        return _context.Users.Any(e => e.Id == id);
    }

    private bool IsValidBase64(string str)
    {
        try
        {
            System.Convert.FromBase64String(str);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private string HashPassword(string password)
    {
        // Для демонстрации используем простой хеш
        return System.Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(password)));
    }

    private string GenerateToken(int userId, string username, string role)
    {
        var secretKey = "your-secret-key-here-minimum-32-characters-required";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, role)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("{id}/logout")]
    [Authorize]
    public async Task<ActionResult<object>> Logout(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "Пользователь не найден" });

        user.IsOnline = false;
        user.LastSeenAt = DateTime.Now;
        await _context.SaveChangesAsync();

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogActionAsync(
            "LOGOUT",
            "User",
            id,
            id,
            user.WarehouseId,
            description: $"User {user.Username} logged out",
            logLevel: "INFO",
            ipAddress: ipAddress
        );

        return Ok(new { message = "Успешно вышли из системы" });
    }

    [HttpPost("{id}/update-last-seen")]
    [Authorize]
    public async Task<ActionResult<object>> UpdateLastSeen(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "Пользователь не найден" });

        user.LastSeenAt = DateTime.Now;
        if (!user.IsOnline)
        {
            user.IsOnline = true;
        }
        await _context.SaveChangesAsync();

        return Ok(new { message = "Статус обновлен", lastSeenAt = user.LastSeenAt, isOnline = user.IsOnline });
    }

}

public class LoginRequest
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}
