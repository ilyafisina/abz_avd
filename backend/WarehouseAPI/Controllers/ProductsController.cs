using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly WarehouseContext _context;

    public ProductsController(WarehouseContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts([FromQuery] string? warehouse = null)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .AsQueryable();

        if (!string.IsNullOrEmpty(warehouse))
            query = query.Where(p => p.Warehouse == warehouse);

        return await query.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetProduct(int id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
            return NotFound();

        return product;
    }

    [HttpPost]
    public async Task<ActionResult<Product>> CreateProduct(CreateProductRequest request)
    {
        var product = new Product
        {
            Name = request.Name,
            Sku = request.Sku,
            CategoryId = request.CategoryId,
            Price = request.Price,
            Quantity = request.Quantity,
            Barcode = request.Barcode,
            QrCode = request.QrCode,
            Warehouse = request.Warehouse
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(int id, UpdateProductRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();

        product.Name = request.Name;
        product.Sku = request.Sku;
        product.CategoryId = request.CategoryId;
        product.Price = request.Price;
        product.Quantity = request.Quantity;
        product.Barcode = request.Barcode;
        product.QrCode = request.QrCode;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateProductRequest
{
    public string Name { get; set; } = null!;
    public string Sku { get; set; } = null!;
    public int CategoryId { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public string Warehouse { get; set; } = null!;
}

public class UpdateProductRequest
{
    public string Name { get; set; } = null!;
    public string Sku { get; set; } = null!;
    public int CategoryId { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
}
