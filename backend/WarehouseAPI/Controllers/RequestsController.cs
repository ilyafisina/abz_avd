using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RequestsController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public RequestsController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Request>>> GetRequests([FromQuery] string? status = null, [FromQuery] int? warehouse = null)
    {
        var query = _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);
        if (warehouse.HasValue)
            query = query.Where(r => r.WarehouseId == warehouse.Value);
        return await query.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Request>> GetRequest(int id)
    {
        var request = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (request == null)
            return NotFound();
        return request;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<Request>> CreateRequest(Request request)
    {
        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        // Загружаем свежие данные с RequestProducts
        var createdRequest = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == request.Id);

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "CREATE",
            "Request",
            request.Id,
            userId,
            request.WarehouseId,
            description: $"Request {request.Id} created with status {request.Status}",
            logLevel: "INFO"
        );

        return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, createdRequest);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateRequest(int id, Request request)
    {
        if (id != request.Id)
            return BadRequest();

        var oldRequest = await _context.Requests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        var oldStatus = oldRequest?.Status;

        _context.Entry(request).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!RequestExists(id))
                return NotFound();
            throw;
        }

        string description = $"Request {id} updated";
        if (oldStatus != request.Status)
            description = $"Request {id} status changed from {oldStatus} to {request.Status}";

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "UPDATE",
            "Request",
            id,
            userId,
            request.WarehouseId,
            description: description,
            logLevel: "INFO"
        );

        // Возвращаем обновленный Request с RequestProducts
        var updatedRequest = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        return Ok(updatedRequest);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateRequestStatus(
        int id,
        [FromBody] UpdateRequestStatusDto statusUpdate,
        [FromQuery] int loggedInUserId)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();

        var user = await _context.Users.FindAsync(loggedInUserId);
        if (user == null)
            return Unauthorized();

        // Check permissions based on user role and request status
        bool canChangeStatus = false;

        if (user.Role == "admin")
        {
            // Admin can change any status
            canChangeStatus = true;
        }
        else if (user.Role == "manager")
        {
            // Manager can only manage requests for their warehouse
            if (request.WarehouseId == user.WarehouseId)
            {
                // Manager from source warehouse can:
                // - approve/reject pending requests
                // - return from approved to pending (for editing)
                if (request.Status == "pending" && (statusUpdate.NewStatus == "approved" || statusUpdate.NewStatus == "rejected"))
                {
                    canChangeStatus = true;
                }
                else if (request.Status == "approved" && statusUpdate.NewStatus == "pending")
                {
                    canChangeStatus = true; // Allow returning to pending for editing
                }
                else if (request.Status == "approved" && statusUpdate.NewStatus == "in_transit")
                {
                    canChangeStatus = true; // Allow moving to in_transit
                }
            }
            if (request.TransferWarehouseId == user.WarehouseId)
            {
                // Manager from target warehouse can complete in_transit requests
                if (request.Status == "in_transit" && statusUpdate.NewStatus == "completed")
                {
                    canChangeStatus = true;
                }
            }
        }

        if (!canChangeStatus)
            return BadRequest("You don't have permission to change this request status");

        // Validate status transition (skip for admin)
        if (user.Role != "admin")
        {
            var validTransitions = new Dictionary<string, string[]>
            {
                { "pending", new string[] { "approved", "rejected" } },
                { "approved", new string[] { "in_transit", "rejected", "pending" } },
                { "in_transit", new string[] { "completed", "rejected" } },
                { "rejected", new string[] { "pending" } },
                { "completed", new string[] { } }
            };

            if (!validTransitions.ContainsKey(request.Status) || !validTransitions[request.Status].Contains(statusUpdate.NewStatus))
                return BadRequest($"Invalid status transition from {request.Status} to {statusUpdate.NewStatus}");
        }

        var oldStatus = request.Status;
        request.Status = statusUpdate.NewStatus;

        if (statusUpdate.NewStatus == "approved")
        {
            request.ApprovedBy = user.Id;
            request.ApprovedAt = DateTime.UtcNow;
        }
        else if (statusUpdate.NewStatus == "in_transit")
        {
            // При переходе на "in_transit" создаём ТТН (Transfer)
            if (request.TransferWarehouseId.HasValue)
            {
                var transfer = new Transfer
                {
                    CreatedByUserId = loggedInUserId,
                    FromWarehouseId = request.WarehouseId,
                    ToWarehouseId = request.TransferWarehouseId.Value,
                    Status = "in_transit",
                    StartedAt = DateTime.UtcNow
                };

                _context.Transfers.Add(transfer);
                await _context.SaveChangesAsync(); // Сохраняем Transfer чтобы получить ID

                // Добавляем товары в ТТН
                var requestProducts = await _context.RequestProducts
                    .Where(rp => rp.RequestId == request.Id)
                    .Include(rp => rp.Product)
                    .ToListAsync();

                foreach (var rp in requestProducts)
                {
                    var transferProduct = new TransferProduct
                    {
                        TransferId = transfer.Id,
                        ProductId = rp.ProductId,
                        Quantity = rp.Quantity
                    };
                    _context.TransferProducts.Add(transferProduct);
                }
            }
        }
        else if (statusUpdate.NewStatus == "completed")
        {
            request.CompletedBy = user.Id;
            request.CompletedAt = DateTime.UtcNow;

            // Обновляем товары: уменьшаем количество на площадке отправления, увеличиваем на площадке получения
            if (request.TransferWarehouseId.HasValue)
            {
                var requestProducts = await _context.RequestProducts
                    .Where(rp => rp.RequestId == request.Id)
                    .Include(rp => rp.Product)
                    .ToListAsync();

                foreach (var rp in requestProducts)
                {
                    // Уменьшаем на площадке отправления
                    var fromProduct = await _context.Products
                        .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.WarehouseId);
                    if (fromProduct != null)
                    {
                        fromProduct.Quantity -= rp.Quantity;
                        _context.Products.Update(fromProduct);
                    }

                    // Увеличиваем на площадке получения (с проверкой по штрихкоду)
                    if (rp.Product != null && rp.Product.Barcode != null)
                    {
                        // Ищем товар по штрихкоду на целевой площадке
                        var toProduct = await _context.Products
                            .FirstOrDefaultAsync(p => p.Barcode == rp.Product.Barcode && p.WarehouseId == request.TransferWarehouseId.Value);
                        
                        if (toProduct != null)
                        {
                            // Товар существует - плюсуем количество
                            toProduct.Quantity += rp.Quantity;
                            _context.Products.Update(toProduct);
                        }
                        else
                        {
                            // Товара нет - создаём новый на целевой площадке
                            var newProduct = new Product
                            {
                                Name = rp.Product.Name,
                                Sku = rp.Product.Sku,
                                Barcode = rp.Product.Barcode,
                                QrCode = rp.Product.QrCode,
                                CategoryId = rp.Product.CategoryId,
                                Price = rp.Product.Price,
                                Quantity = rp.Quantity,
                                MinQuantity = rp.Product.MinQuantity,
                                Location = rp.Product.Location,
                                WarehouseId = request.TransferWarehouseId.Value
                            };
                            _context.Products.Add(newProduct);
                        }
                    }
                    else
                    {
                        // Нет штрихкода - пытаемся найти по ID
                        var toProduct = await _context.Products
                            .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.TransferWarehouseId.Value);
                        
                        if (toProduct != null)
                        {
                            toProduct.Quantity += rp.Quantity;
                            _context.Products.Update(toProduct);
                        }
                    }
                }
            }
        }

        request.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Перезагружаем request с RequestProducts для ответа
        var updatedRequest = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        await _auditService.LogActionAsync(
            "UPDATE",
            "Request",
            id,
            null,
            request.WarehouseId,
            description: $"Request {id} status changed from {oldStatus} to {statusUpdate.NewStatus} by {user.Username}",
            logLevel: "INFO"
        );

        return Ok(updatedRequest);
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> DeleteRequest(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();

        _context.Requests.Remove(request);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "DELETE",
            "Request",
            id,
            userId,
            request.WarehouseId,
            description: $"Request {id} with status {request.Status} deleted",
            logLevel: "WARNING"
        );

        return NoContent();
    }

    [HttpPost("{id}/products")]
    public async Task<IActionResult> AddProductToRequest(int id, [FromBody] AddProductToRequestDto productData)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound("Request not found");

        var product = await _context.Products.FindAsync(productData.ProductId);
        if (product == null)
            return NotFound("Product not found");

        // Проверяем, не существует ли уже такой товар в этой заявке
        var existingProduct = await _context.RequestProducts
            .FirstOrDefaultAsync(rp => rp.RequestId == id && rp.ProductId == productData.ProductId);

        if (existingProduct != null)
        {
            // Если существует, увеличиваем количество
            existingProduct.Quantity += productData.Quantity;
            _context.RequestProducts.Update(existingProduct);
        }
        else
        {
            // Если нет, создаём новый RequestProduct
            var requestProduct = new RequestProduct
            {
                RequestId = id,
                ProductId = productData.ProductId,
                Quantity = productData.Quantity,
            };
            _context.RequestProducts.Add(requestProduct);
        }

        await _context.SaveChangesAsync();

        // Возвращаем обновленный Request с товарами
        var updatedRequest = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        return Ok(updatedRequest);
    }

    [HttpDelete("{id}/products/{productId}")]
    public async Task<IActionResult> RemoveProductFromRequest(int id, int productId)
    {
        var requestProduct = await _context.RequestProducts
            .FirstOrDefaultAsync(rp => rp.RequestId == id && rp.ProductId == productId);

        if (requestProduct == null)
            return NotFound("Product not found in request");

        _context.RequestProducts.Remove(requestProduct);
        await _context.SaveChangesAsync();

        // Возвращаем обновленный Request с товарами
        var updatedRequest = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        return Ok(updatedRequest);
    }

    private bool RequestExists(int id)
    {
        return _context.Requests.Any(e => e.Id == id);
    }
}
