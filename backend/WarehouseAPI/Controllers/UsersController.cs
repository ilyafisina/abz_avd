using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly WarehouseContext _context;

    public UsersController(WarehouseContext context)
    {
        _context = context;
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
        if (user == null || user.PasswordHash != HashPassword(request.Password))
            return Unauthorized();

        return Ok(new 
        { 
            user = new
            {
                id = user.Id,
                username = user.Username,
                email = user.Email,
                role = user.Role,
                firstName = user.FirstName ?? user.Username,
                lastName = user.LastName ?? "",
                isActive = user.IsActive,
                createdAt = user.CreatedAt,
                warehouseId = user.WarehouseId,
                warehouse = user.Warehouse != null ? new { id = user.Warehouse.Id, name = user.Warehouse.Name } : null
            },
            token = GenerateToken(user.Id, user.Username, user.Role)
        });
    }

    [HttpPost]
    public async Task<ActionResult<User>> CreateUser(User user)
    {
        user.PasswordHash = HashPassword(user.PasswordHash);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, User user)
    {
        if (id != user.Id)
            return BadRequest();

        _context.Entry(user).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!UserExists(id))
                return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private bool UserExists(int id)
    {
        return _context.Users.Any(e => e.Id == id);
    }

    private string HashPassword(string password)
    {
        // Для демонстрации используем простой хеш
        return System.Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(password)));
    }

    private string GenerateToken(int userId, string username, string role)
    {
        // Простой токен для текущей реализации
        // В продакшене нужно использовать JWT
        return System.Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{userId}:{username}:{role}:{DateTime.UtcNow.Ticks}")
        );
    }
}

public class LoginRequest
{
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
}
