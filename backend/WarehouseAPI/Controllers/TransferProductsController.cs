using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/transfers/{transferId}/products")]
public class TransferProductsController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public TransferProductsController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransferProduct>>> GetTransferProducts(int transferId)
    {
        var products = await _context.TransferProducts
            .Where(tp => tp.TransferId == transferId)
            .Include(tp => tp.Product)
            .ToListAsync();

        return Ok(products);
    }

    [HttpGet("{productId}")]
    public async Task<ActionResult<TransferProduct>> GetTransferProduct(int transferId, int productId)
    {
        var transferProduct = await _context.TransferProducts
            .Include(tp => tp.Product)
            .FirstOrDefaultAsync(tp => tp.TransferId == transferId && tp.ProductId == productId);

        if (transferProduct == null)
            return NotFound();

        return transferProduct;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<TransferProduct>> AddProductToTransfer(
        int transferId,
        [FromBody] AddProductRequest request)
    {
        var transfer = await _context.Transfers.FindAsync(transferId);
        if (transfer == null)
            return NotFound("Transfer not found");

        var product = await _context.Products.FindAsync(request.ProductId);
        if (product == null)
            return NotFound("Product not found");

        var transferProduct = new TransferProduct
        {
            TransferId = transferId,
            ProductId = request.ProductId,
            Quantity = request.Quantity
        };

        _context.TransferProducts.Add(transferProduct);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "CREATE",
            "TransferProduct",
            transferProduct.ProductId,
            userId,
            transfer.FromWarehouseId,
            description: $"Product {product.Name} (qty: {request.Quantity}) added to transfer {transferId}",
            logLevel: "INFO"
        );

        return CreatedAtAction(nameof(GetTransferProduct),
            new { transferId, productId = request.ProductId }, transferProduct);
    }

    [HttpPut("{productId}")]
    [Authorize]
    public async Task<IActionResult> UpdateTransferProduct(
        int transferId,
        int productId,
        [FromBody] UpdateTransferProductRequest request)
    {
        var transferProduct = await _context.TransferProducts
            .FirstOrDefaultAsync(tp => tp.TransferId == transferId && tp.ProductId == productId);

        if (transferProduct == null)
            return NotFound();

        var transfer = await _context.Transfers.FindAsync(transferId);

        transferProduct.Quantity = request.Quantity;
        transferProduct.ReceivedQuantity = request.ReceivedQuantity;
        transferProduct.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "UPDATE",
            "TransferProduct",
            productId,
            userId,
            transfer?.FromWarehouseId,
            description: $"Product {productId} in transfer {transferId} updated",
            logLevel: "INFO"
        );

        return NoContent();
    }

    [HttpDelete("{productId}")]
    [Authorize]
    public async Task<IActionResult> RemoveProductFromTransfer(int transferId, int productId)
    {
        var transferProduct = await _context.TransferProducts
            .FirstOrDefaultAsync(tp => tp.TransferId == transferId && tp.ProductId == productId);

        if (transferProduct == null)
            return NotFound();

        var transfer = await _context.Transfers.FindAsync(transferId);

        _context.TransferProducts.Remove(transferProduct);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "DELETE",
            "TransferProduct",
            productId,
            userId,
            transfer?.FromWarehouseId,
            description: $"Product {productId} removed from transfer {transferId}",
            logLevel: "INFO"
        );

        return NoContent();
    }
}

public class AddProductRequest
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}

public class UpdateTransferProductRequest
{
    public int Quantity { get; set; }
    public int? ReceivedQuantity { get; set; }
}
