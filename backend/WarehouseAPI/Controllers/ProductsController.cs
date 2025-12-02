using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public ProductsController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts([FromQuery] int? warehouse = null)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .AsQueryable();

        if (warehouse.HasValue)
            query = query.Where(p => p.WarehouseId == warehouse.Value);

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
            MinQuantity = request.MinQuantity,
            Barcode = request.Barcode,
            QrCode = request.QrCode,
            Location = request.Location,
            WarehouseId = request.WarehouseId
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "CREATE",
            "Product",
            product.Id,
            null,
            product.WarehouseId,
            description: $"Product {product.Name} (SKU: {product.Sku}) created with price {product.Price}",
            logLevel: "INFO"
        );

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(int id, UpdateProductRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();

        var oldValues = new { product.Name, product.Sku, product.Price, product.Quantity, product.Location };

        if (!string.IsNullOrEmpty(request.Name)) product.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Sku)) product.Sku = request.Sku;
        if (request.CategoryId.HasValue) product.CategoryId = request.CategoryId.Value;
        if (request.Price.HasValue) product.Price = request.Price.Value;
        if (request.Quantity.HasValue) product.Quantity = request.Quantity.Value;
        if (request.MinQuantity.HasValue) product.MinQuantity = request.MinQuantity.Value;
        if (request.Barcode != null) product.Barcode = request.Barcode;
        if (request.QrCode != null) product.QrCode = request.QrCode;
        if (request.Location != null) product.Location = request.Location;
        
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var newValues = new { product.Name, product.Sku, product.Price, product.Quantity, product.Location };
        
        await _auditService.LogActionAsync(
            "UPDATE",
            "Product",
            id,
            null,
            product.WarehouseId,
            description: $"Product {product.Name} updated",
            logLevel: "INFO"
        );

        return Ok(product);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound();

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "DELETE",
            "Product",
            id,
            null,
            product.WarehouseId,
            description: $"Product {product.Name} deleted",
            logLevel: "WARNING"
        );

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
    public int MinQuantity { get; set; } = 50;
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public string? Location { get; set; }
    public int WarehouseId { get; set; }
}

public class UpdateProductRequest
{
    public string? Name { get; set; }
    public string? Sku { get; set; }
    public int? CategoryId { get; set; }
    public decimal? Price { get; set; }
    public int? Quantity { get; set; }
    public int? MinQuantity { get; set; }
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public string? Location { get; set; }
}
