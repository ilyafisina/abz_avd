using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly WarehouseContext _context;

    public CategoriesController(WarehouseContext context)
    {
        _context = context;
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
    public async Task<ActionResult<Category>> CreateCategory(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name,
            Description = request.Description
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(int id, UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound();

        category.Name = request.Name;
        category.Description = request.Description;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
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
