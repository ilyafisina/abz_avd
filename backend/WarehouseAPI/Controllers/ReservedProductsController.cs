using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservedProductsController : ControllerBase
{
    private readonly WarehouseContext _context;

    public ReservedProductsController(WarehouseContext context)
    {
        _context = context;
    }

    // Получить все зарезервированные товары для площадки
    [HttpGet("warehouse/{warehouseId}")]
    public async Task<ActionResult<IEnumerable<ReservedProduct>>> GetReservedProductsByWarehouse(int warehouseId)
    {
        var reserved = await _context.ReservedProducts
            .Where(r => r.WarehouseId == warehouseId)
            .Include(r => r.Product)
            .Include(r => r.Request)
            .ToListAsync();

        return Ok(reserved);
    }

    // Получить зарезервированные товары для конкретного товара
    [HttpGet("product/{productId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetReservationsByProduct(int productId)
    {
        var reservations = await _context.ReservedProducts
            .Where(r => r.ProductId == productId)
            .Include(r => r.Request)
            .Include(r => r.Warehouse)
            .Select(r => new
            {
                r.Id,
                r.RequestId,
                r.ProductId,
                r.WarehouseId,
                WarehouseName = r.Warehouse.Name,
                r.ReservedQuantity,
                r.Status,
                RequestStatus = r.Request.Status,
                r.CreatedAt,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(reservations);
    }

    // Получить зарезервированные товары для конкретной заявки
    [HttpGet("request/{requestId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetReservationsByRequest(int requestId)
    {
        var reservations = await _context.ReservedProducts
            .Where(r => r.RequestId == requestId)
            .Include(r => r.Product)
            .Include(r => r.Warehouse)
            .Select(r => new
            {
                r.Id,
                r.RequestId,
                r.ProductId,
                ProductName = r.Product.Name,
                ProductBarcode = r.Product.Barcode,
                r.WarehouseId,
                WarehouseName = r.Warehouse.Name,
                r.ReservedQuantity,
                r.Status,
                r.CreatedAt,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(reservations);
    }

    // Получить информацию об ожидаемых товарах на площадке получения
    [HttpGet("expected/{warehouseId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetExpectedProducts(int warehouseId)
    {
        var expectedProducts = await _context.ReservedProducts
            .Where(r => r.WarehouseId == warehouseId && r.Status == "pending")
            .Include(r => r.Product)
            .Include(r => r.Request)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                ProductName = r.Product.Name,
                ProductBarcode = r.Product.Barcode,
                ProductSku = r.Product.Sku,
                r.ReservedQuantity,
                r.RequestId,
                r.Status,
                RequestStatus = r.Request.Status,
                SourceWarehouseId = r.Request.WarehouseId,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(expectedProducts);
    }

    // Получить информацию о полученных товарах
    [HttpGet("received/{warehouseId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetReceivedProducts(int warehouseId)
    {
        var receivedProducts = await _context.ReservedProducts
            .Where(r => r.WarehouseId == warehouseId && r.Status == "received")
            .Include(r => r.Product)
            .Include(r => r.Request)
            .Select(r => new
            {
                r.Id,
                r.ProductId,
                ProductName = r.Product.Name,
                ProductBarcode = r.Product.Barcode,
                r.ReservedQuantity,
                r.RequestId,
                r.Status,
                RequestStatus = r.Request.Status,
                r.UpdatedAt
            })
            .ToListAsync();

        return Ok(receivedProducts);
    }
}
