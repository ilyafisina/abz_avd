using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public CategoriesController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
    {
        return await _context.Categories.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Category>> GetCategory(int id)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null)
            return NotFound();

        return category;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Category>> CreateCategory(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name,
            Description = request.Description
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "CREATE",
            "Category",
            category.Id,
            userId,
            null,
            description: $"Category {category.Name} created",
            logLevel: "INFO"
        );

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateCategory(int id, UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound();

        category.Name = request.Name;
        category.Description = request.Description;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "UPDATE",
            "Category",
            id,
            userId,
            null,
            description: $"Category {category.Name} updated",
            logLevel: "INFO"
        );

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null)
            return NotFound();

        // Проверить, есть ли товары в этой категории
        if (category.Products.Any())
            return BadRequest("Cannot delete category with products");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "DELETE",
            "Category",
            id,
            userId,
            null,
            description: $"Category {category.Name} deleted",
            logLevel: "INFO"
        );

        return NoContent();
    }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}

public class UpdateCategoryRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}
