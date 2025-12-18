using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WarehouseAPI.Models;
using WarehouseAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace WarehouseAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly WarehouseContext _context;
        private readonly IConfiguration _configuration;
        private readonly string _secretKey = "your-secret-key-here-minimum-32-characters-required";

        public AuthController(WarehouseContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Username and password are required" });
                }

                // Find user by username
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == request.Username);

                if (user == null)
                {
                    return Unauthorized(new { message = "Invalid username or password" });
                }

                // Verify password (simple comparison for demo - use proper hashing in production)
                if (user.PasswordHash != request.Password)
                {
                    return Unauthorized(new { message = "Invalid username or password" });
                }

                // Generate JWT token
                var token = GenerateJwtToken(user);

                return Ok(new LoginResponse
                {
                    Token = token,
                    User = new UserDto
                    {
                        Id = user.Id,
                        Username = user.Username,
                        Email = user.Email,
                        Role = user.Role,
                        IsOnline = user.IsOnline
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPost("register")]
        public async Task<ActionResult<LoginResponse>> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Username and password are required" });
                }

                // Check if user already exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == request.Username);

                if (existingUser != null)
                {
                    return BadRequest(new { message = "Username already exists" });
                }

                // Create new user
                var newUser = new User
                {
                    Username = request.Username,
                    Email = request.Email,
                    PasswordHash = request.Password, // Hash in production!
                    Role = request.Role ?? "Viewer",
                    IsOnline = true,
                    WarehouseId = request.WarehouseId
                };

                _context.Users.Add(newUser);
                await _context.SaveChangesAsync();

                // Generate JWT token
                var token = GenerateJwtToken(newUser);

                return Ok(new LoginResponse
                {
                    Token = token,
                    User = new UserDto
                    {
                        Id = newUser.Id,
                        Username = newUser.Username,
                        Email = newUser.Email,
                        Role = newUser.Role,
                        IsOnline = newUser.IsOnline
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                // Get user ID from token
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                {
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null)
                    {
                        user.IsOnline = false;
                        await _context.SaveChangesAsync();
                    }
                }

                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Internal server error: {ex.Message}" });
            }
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Email, user.Email ?? ""),
                    new Claim("role", user.Role),
                    new Claim("warehouseId", (user.WarehouseId ?? 0).ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    // DTOs
    public class RegisterRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public int? WarehouseId { get; set; }
    }

    public class LoginResponse
    {
        public string Token { get; set; }
        public UserDto User { get; set; }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public bool IsOnline { get; set; }
    }
}
