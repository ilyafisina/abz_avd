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
        
        // Добавляем загрузку пользователей, которые одобрили, завершили или отменили заявку
        query = query
            .AsNoTracking();
        
        var requests = await query.ToListAsync();
        
        // Загружаем дополнительно пользователей (вручную из-за сложности Include)
        foreach (var request in requests)
        {
            if (request.ApprovedBy.HasValue)
            {
                request.ApprovedByUser = await _context.Users.FindAsync(request.ApprovedBy.Value);
            }
            if (request.ReceivedBy.HasValue)
            {
                request.ReceivedByUser = await _context.Users.FindAsync(request.ReceivedBy.Value);
            }
            if (request.CompletedBy.HasValue)
            {
                request.CompletedByUser = await _context.Users.FindAsync(request.CompletedBy.Value);
            }
            if (request.CancelledBy.HasValue)
            {
                request.CancelledByUser = await _context.Users.FindAsync(request.CancelledBy.Value);
            }
        }
        
        if (!string.IsNullOrEmpty(status))
            requests = requests.Where(r => r.Status == status).ToList();
        if (warehouse.HasValue)
            requests = requests.Where(r => r.WarehouseId == warehouse.Value).ToList();
        
        return requests;
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
        
        // Загружаем пользователей, которые совершили операции с заявкой
        if (request.ApprovedBy.HasValue)
        {
            request.ApprovedByUser = await _context.Users.FindAsync(request.ApprovedBy.Value);
        }
        if (request.ReceivedBy.HasValue)
        {
            request.ReceivedByUser = await _context.Users.FindAsync(request.ReceivedBy.Value);
        }
        if (request.CompletedBy.HasValue)
        {
            request.CompletedByUser = await _context.Users.FindAsync(request.CompletedBy.Value);
        }
        if (request.CancelledBy.HasValue)
        {
            request.CancelledByUser = await _context.Users.FindAsync(request.CancelledBy.Value);
        }
        
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
        var request = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);
        
        if (request == null)
            return NotFound("Заявка не найдена");

        var user = await _context.Users.FindAsync(loggedInUserId);
        if (user == null)
            return Unauthorized("Пользователь не найден");

        var oldStatus = request.Status;

        // Проверяем права доступа в зависимости от статуса и роли
        bool canChangeStatus = CheckPermissionsForStatusChange(user, request, statusUpdate.NewStatus);
        if (!canChangeStatus)
        {
            var errorMsg = $"У вас нет прав для изменения статуса на '{statusUpdate.NewStatus}'. Текущий статус: {request.Status}, роль: {user.Role}, склад пользователя: {user.WarehouseId}, склад отправления: {request.WarehouseId}, склад получения: {request.TransferWarehouseId}";
            Console.WriteLine($"ERROR: {errorMsg}");
            return BadRequest(errorMsg);
        }

        // Проверяем валидность перехода статуса
        if (!IsValidStatusTransition(request.Status, statusUpdate.NewStatus))
        {
            var errorMsg = $"Невозможно изменить статус с '{request.Status}' на '{statusUpdate.NewStatus}'";
            Console.WriteLine($"ERROR: {errorMsg}");
            return BadRequest(errorMsg);
        }

        // Выполняем действия согласно новому статусу
        try
        {
            switch (statusUpdate.NewStatus)
            {
                case "на_согласовании":
                    // Переход на согласование (только из черновика)
                    break;

                case "одобрено":
                    // Утверждение заявки
                    // 1. Резервируем товары на площадке отправления (уменьшаем количество)
                    // 2. Создаем записи в ReservedProducts на площадке отправления
                    request.ApprovedBy = user.Id;
                    request.ApprovedAt = DateTime.UtcNow;
                    await ApproveAndReserveProducts(request);
                    Console.WriteLine($"[DEBUG] StatusChange: Заявка {request.Id} одобрена, товары зарезервированы");
                    break;

                case "в_пути":
                    // Переход в статус "в пути"
                    // 1. Обновляем статус на площадке отправления с "pending" на "sent"
                    // 2. Создаем резервирования на площадке получения со статусом "pending"
                    await SendTransfer(request);
                    Console.WriteLine($"[DEBUG] StatusChange: Заявка {request.Id} отправлена в пути");
                    break;

                case "на_приемке":
                    // Товары поступили на площадку получения, ждем приемки
                    Console.WriteLine($"[DEBUG] StatusChange: Заявка {request.Id} на приемке у получателя");
                    break;

                case "завершено":
                    // Приемка завершена успешно
                    // 1. Обновляем статус на обеих площадках
                    // 2. Добавляем товары на площадку получения
                    request.ReceivedBy = user.Id;
                    request.ReceivedAt = DateTime.UtcNow;
                    await CompleteTransfer(request);
                    Console.WriteLine($"[DEBUG] StatusChange: Заявка {request.Id} завершена, товары добавлены на получение");
                    break;

                case "отменено":
                    // Отмена перемещения - возвращаем товары на площадку отправления
                    request.CancelledBy = user.Id;
                    request.CancelledAt = DateTime.UtcNow;
                    request.CancellationReason = statusUpdate.Reason ?? "Не указана причина";
                    await CancelTransfer(request, oldStatus);
                    Console.WriteLine($"[DEBUG] StatusChange: Заявка {request.Id} отменена, товары восстановлены (был статус: {oldStatus})");
                    break;
            }

            request.Status = statusUpdate.NewStatus;
            request.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Загружаем обновленную заявку
            var updatedRequest = await _context.Requests
                .Include(r => r.RequestProducts)
                .ThenInclude(rp => rp.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            // Логируем действие
            await _auditService.LogActionAsync(
                "UPDATE",
                "Request",
                id,
                user.Id,
                request.WarehouseId,
                description: $"Статус заявки изменен с '{oldStatus}' на '{statusUpdate.NewStatus}' пользователем {user.Username}",
                logLevel: "INFO"
            );

            return Ok(updatedRequest);
        }
        catch (Exception ex)
        {
            await _auditService.LogActionAsync(
                "ERROR",
                "Request",
                id,
                user.Id,
                request.WarehouseId,
                description: $"Ошибка при изменении статуса: {ex.Message}",
                logLevel: "ERROR"
            );
            return StatusCode(500, $"Ошибка при изменении статуса: {ex.Message}");
        }
    }

    private bool CheckPermissionsForStatusChange(User user, Request request, string newStatus)
    {
        if (user.Role == "admin")
            return true;

        // Статусы для менеджера
        if (user.Role == "manager")
        {
            if (user.WarehouseId != request.WarehouseId && user.WarehouseId != request.TransferWarehouseId)
                return false;

            return (request.Status, newStatus) switch
            {
                // Менеджер площадки отправления может согласовать
                ("черновик", "на_согласовании") => user.WarehouseId == request.WarehouseId,
                ("на_согласовании", "одобрено") => user.WarehouseId == request.WarehouseId,
                ("на_согласовании", "отменено") => user.WarehouseId == request.WarehouseId,
                ("одобрено", "в_пути") => user.WarehouseId == request.WarehouseId,
                ("одобрено", "отменено") => user.WarehouseId == request.WarehouseId,
                
                // Менеджер площадки получения может принять на приемку
                ("в_пути", "на_приемке") => user.WarehouseId == request.TransferWarehouseId,
                ("на_приемке", "завершено") => user.WarehouseId == request.TransferWarehouseId,
                ("на_приемке", "отменено") => user.WarehouseId == request.TransferWarehouseId,
                
                // Старые статусы для обратной совместимости
                ("draft", "на_согласовании") => user.WarehouseId == request.WarehouseId,
                ("pending", "на_согласовании") => user.WarehouseId == request.WarehouseId,
                ("pending", "отменено") => user.WarehouseId == request.WarehouseId,
                ("on_review", "одобрено") => user.WarehouseId == request.WarehouseId,
                ("on_review", "отменено") => user.WarehouseId == request.WarehouseId,
                ("approved", "в_пути") => user.WarehouseId == request.WarehouseId,
                ("in_transit", "на_приемке") => user.WarehouseId == request.TransferWarehouseId,
                ("on_reception", "завершено") => user.WarehouseId == request.TransferWarehouseId,
                
                _ => false
            };
        }

        // Статусы для складовщика
        if (user.Role == "warehouseman")
        {
            // Создатель заявки может отменить на этапе черновик или pending
            if ((request.Status == "черновик" || request.Status == "draft" || request.Status == "pending") && newStatus == "отменено")
                return true;

            // Складовщик площадки отправления может отменить в пути
            if (request.Status == "в_пути" && newStatus == "отменено" && user.WarehouseId == request.WarehouseId)
                return true;

            // Все пользователи площадки получения могут принять товары
            if (request.Status == "в_пути" && newStatus == "на_приемке" && user.WarehouseId == request.TransferWarehouseId)
                return true;

            // Все пользователи площадки получения могут завершить приемку
            if (request.Status == "на_приемке" && newStatus == "завершено" && user.WarehouseId == request.TransferWarehouseId)
                return true;

            // Все пользователи площадки получения могут отменить при расхождении
            if (request.Status == "на_приемке" && newStatus == "отменено" && user.WarehouseId == request.TransferWarehouseId)
                return true;

            return false;
        }

        return false;
    }

    private bool IsValidStatusTransition(string currentStatus, string newStatus)
    {
        var validTransitions = new Dictionary<string, string[]>
        {
            { "черновик", new[] { "на_согласовании", "отменено" } },
            { "на_согласовании", new[] { "одобрено", "отменено" } },
            { "одобрено", new[] { "в_пути", "отменено" } },
            { "в_пути", new[] { "на_приемке", "отменено" } },
            { "на_приемке", new[] { "завершено", "отменено" } },
            { "завершено", Array.Empty<string>() },
            { "отменено", Array.Empty<string>() },
            // Старые статусы для обратной совместимости
            { "draft", new[] { "на_согласовании", "отменено" } },
            { "pending", new[] { "на_согласовании", "отменено" } },
            { "on_review", new[] { "одобрено", "отменено" } },
            { "approved", new[] { "в_пути", "отменено" } },
            { "in_transit", new[] { "на_приемке", "отменено" } },
            { "on_reception", new[] { "завершено", "отменено" } }
        };

        if (!validTransitions.ContainsKey(currentStatus))
            return false;

        return validTransitions[currentStatus].Contains(newStatus);
    }

    // Этап 1: Одобрение заявки + Резервирование товаров на площадке отправления
    private async Task ApproveAndReserveProducts(Request request)
    {
        var requestProducts = await _context.RequestProducts
            .Where(rp => rp.RequestId == request.Id)
            .Include(rp => rp.Product)
            .ToListAsync();

        foreach (var rp in requestProducts)
        {
            // 1. Уменьшаем количество на площадке отправления (списываем)
            var fromProduct = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.WarehouseId);
            
            if (fromProduct != null)
            {
                fromProduct.Quantity -= rp.ReservedQuantity;
                _context.Products.Update(fromProduct);
                Console.WriteLine($"[DEBUG] ApproveAndReserve: Списан товар {rp.ProductId} на площадке {request.WarehouseId}, осталось {fromProduct.Quantity}");
            }
            else
            {
                Console.WriteLine($"[DEBUG] ApproveAndReserve: ОШИБКА - товар {rp.ProductId} не найден на площадке {request.WarehouseId}");
            }

            // 2. Создаем резервирование на площадке отправления со статусом "pending"
            var reservedAtSource = new ReservedProduct
            {
                RequestId = request.Id,
                ProductId = rp.ProductId,
                WarehouseId = request.WarehouseId,  // На площадке ОТПРАВЛЕНИЯ
                ReservedQuantity = rp.ReservedQuantity,
                Status = "pending"  // Ждет отправки
            };
            _context.ReservedProducts.Add(reservedAtSource);
            Console.WriteLine($"[DEBUG] ApproveAndReserve: Создано резервирование товара {rp.ProductId} на площадке отправки (статус: pending)");
        }
    }

    // Этап 2: Отправка товара в пути
    private async Task SendTransfer(Request request)
    {
        if (!request.TransferWarehouseId.HasValue)
            return;

        var requestProducts = await _context.RequestProducts
            .Where(rp => rp.RequestId == request.Id)
            .Include(rp => rp.Product)
            .ToListAsync();

        foreach (var rp in requestProducts)
        {
            // 1. Обновляем статус резервирования на площадке отправления с "pending" на "sent"
            var reservedAtSource = await _context.ReservedProducts
                .FirstOrDefaultAsync(r => r.RequestId == request.Id 
                    && r.ProductId == rp.ProductId 
                    && r.WarehouseId == request.WarehouseId);
            
            if (reservedAtSource != null)
            {
                reservedAtSource.Status = "sent";
                _context.ReservedProducts.Update(reservedAtSource);
                Console.WriteLine($"[DEBUG] SendTransfer: Статус резервирования товара {rp.ProductId} на отправке изменен на 'sent'");
            }

            // 2. Создаем резервирование на площадке получения со статусом "pending" (ожидание прибытия)
            var reservedAtDest = new ReservedProduct
            {
                RequestId = request.Id,
                ProductId = rp.ProductId,
                WarehouseId = request.TransferWarehouseId.Value,  // На площадке ПОЛУЧЕНИЯ
                ReservedQuantity = rp.ReservedQuantity,
                Status = "pending"  // Ожидание прибытия
            };
            _context.ReservedProducts.Add(reservedAtDest);
            Console.WriteLine($"[DEBUG] SendTransfer: Создано резервирование товара {rp.ProductId} на площадке получения (статус: pending)");
        }
    }

    // Этап 3: Завершение приемки
    private async Task CompleteTransfer(Request request)
    {
        if (!request.TransferWarehouseId.HasValue)
            return;

        var requestProducts = await _context.RequestProducts
            .Where(rp => rp.RequestId == request.Id)
            .Include(rp => rp.Product)
            .ToListAsync();

        foreach (var rp in requestProducts)
        {
            // 1. Обновляем статус резервирования на площадке отправления на "completed"
            var reservedAtSource = await _context.ReservedProducts
                .FirstOrDefaultAsync(r => r.RequestId == request.Id 
                    && r.ProductId == rp.ProductId 
                    && r.WarehouseId == request.WarehouseId);
            
            if (reservedAtSource != null)
            {
                reservedAtSource.Status = "completed";
                _context.ReservedProducts.Update(reservedAtSource);
                Console.WriteLine($"[DEBUG] CompleteTransfer: Статус резервирования товара {rp.ProductId} на отправке изменен на 'completed'");
            }

            // 2. Обновляем статус резервирования на площадке получения на "received"
            var reservedAtDest = await _context.ReservedProducts
                .FirstOrDefaultAsync(r => r.RequestId == request.Id 
                    && r.ProductId == rp.ProductId 
                    && r.WarehouseId == request.TransferWarehouseId.Value);
            
            if (reservedAtDest != null)
            {
                reservedAtDest.Status = "received";
                _context.ReservedProducts.Update(reservedAtDest);
                Console.WriteLine($"[DEBUG] CompleteTransfer: Статус резервирования товара {rp.ProductId} на приемке изменен на 'received'");
            }

            // 3. Добавляем товар на площадку получения
            if (rp.Product != null && rp.Product.Barcode != null)
            {
                var toProduct = await _context.Products
                    .FirstOrDefaultAsync(p => p.Barcode == rp.Product.Barcode && p.WarehouseId == request.TransferWarehouseId.Value);
                
                if (toProduct != null)
                {
                    toProduct.Quantity += rp.ReservedQuantity;
                    _context.Products.Update(toProduct);
                    Console.WriteLine($"[DEBUG] CompleteTransfer: Добавлено {rp.ReservedQuantity} шт. товара {rp.ProductId} на площадку получения, всего {toProduct.Quantity}");
                }
                else
                {
                    var newProduct = new Product
                    {
                        Name = rp.Product.Name,
                        Sku = rp.Product.Sku,
                        Barcode = rp.Product.Barcode,
                        QrCode = rp.Product.QrCode,
                        CategoryId = rp.Product.CategoryId,
                        Price = rp.Product.Price,
                        Quantity = rp.ReservedQuantity,
                        MinQuantity = rp.Product.MinQuantity,
                        Location = rp.Product.Location,
                        WarehouseId = request.TransferWarehouseId.Value
                    };
                    _context.Products.Add(newProduct);
                    Console.WriteLine($"[DEBUG] CompleteTransfer: Создан новый товар {rp.ProductId} на площадке получения с количеством {rp.ReservedQuantity}");
                }
            }
        }
    }

    // Отмена заявки - возвращаем товары и обновляем статусы резервирований
    // ЭТА ФУНКЦИЯ РАБОТАЕТ ДЛЯ ЛЮБОГО СТАТУСА!
    private async Task CancelTransfer(Request request, string oldStatus)
    {
        Console.WriteLine($"[DEBUG CancelTransfer] Начало отмены заявки {request.Id} (был статус: {oldStatus})");

        var requestProducts = await _context.RequestProducts
            .Where(rp => rp.RequestId == request.Id)
            .Include(rp => rp.Product)
            .ToListAsync();

        foreach (var rp in requestProducts)
        {
            Console.WriteLine($"[DEBUG CancelTransfer] Обработка товара {rp.ProductId}, зарезервировано: {rp.ReservedQuantity}, был статус: {oldStatus}");

            // Возвращаем товар на площадку отправления при отмене с ЛЮБого статуса (кроме черновика и на_согласовании)
            // где товар еще не был зарезервирован
            if (oldStatus != "черновик" && oldStatus != "на_согласовании")
            {
                Console.WriteLine($"[DEBUG CancelTransfer] Товар {rp.ProductId}: возвращаем количество {rp.ReservedQuantity} на площадку отправления");
                
                var fromProduct = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.WarehouseId);
                
                if (fromProduct != null)
                {
                    fromProduct.Quantity += rp.ReservedQuantity;
                    _context.Products.Update(fromProduct);
                    Console.WriteLine($"[DEBUG CancelTransfer] Успешно возвращено {rp.ReservedQuantity} шт. товара {rp.ProductId}, новое количество: {fromProduct.Quantity}");
                }
                else
                {
                    Console.WriteLine($"[DEBUG CancelTransfer] ОШИБКА: товар {rp.ProductId} не найден на площадке отправления {request.WarehouseId}");
                }
            }
            else
            {
                Console.WriteLine($"[DEBUG CancelTransfer] Товар {rp.ProductId}: статус {oldStatus} - товар не был зарезервирован, ничего не возвращаем");
            }

            // Обновляем статус резервирования на площадке отправления на "cancelled"
            var reservedAtSource = await _context.ReservedProducts
                .FirstOrDefaultAsync(r => r.RequestId == request.Id 
                    && r.ProductId == rp.ProductId 
                    && r.WarehouseId == request.WarehouseId);
            
            if (reservedAtSource != null)
            {
                reservedAtSource.Status = "cancelled";
                _context.ReservedProducts.Update(reservedAtSource);
                Console.WriteLine($"[DEBUG CancelTransfer] ReservedProduct товара {rp.ProductId} на отправке обновлен -> 'cancelled'");
            }
            else
            {
                Console.WriteLine($"[DEBUG CancelTransfer] ВНИМАНИЕ: ReservedProduct товара {rp.ProductId} на отправке не найден!");
            }

            // Обновляем статус резервирования на площадке получения на "cancelled" (если есть)
            if (request.TransferWarehouseId.HasValue)
            {
                var reservedAtDest = await _context.ReservedProducts
                    .FirstOrDefaultAsync(r => r.RequestId == request.Id 
                        && r.ProductId == rp.ProductId 
                        && r.WarehouseId == request.TransferWarehouseId.Value);
                
                if (reservedAtDest != null)
                {
                    reservedAtDest.Status = "cancelled";
                    _context.ReservedProducts.Update(reservedAtDest);
                    Console.WriteLine($"[DEBUG CancelTransfer] ReservedProduct товара {rp.ProductId} на приемке обновлен -> 'cancelled'");
                }
                else
                {
                    Console.WriteLine($"[DEBUG CancelTransfer] ReservedProduct товара {rp.ProductId} на приемке не найден (возможно еще не создан)");
                }
            }
        }

        // Сохраняем все изменения
        await _context.SaveChangesAsync();
        Console.WriteLine($"[DEBUG CancelTransfer] Отмена заявки {request.Id} завершена успешно");
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

    // Получить информацию о резервированных товарах для конкретного товара
    [HttpGet("reserved/{productId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetReservedProductInfo(int productId, [FromQuery] int? warehouseId = null)
    {
        var query = _context.ReservedProducts
            .Where(r => r.ProductId == productId)
            .Include(r => r.Request)
            .AsQueryable();

        if (warehouseId.HasValue)
            query = query.Where(r => r.WarehouseId == warehouseId.Value);

        var reservations = await query
            .Select(r => new
            {
                r.Id,
                r.RequestId,
                r.ReservedQuantity,
                r.Status, // pending, received, cancelled
                r.CreatedAt,
                RequestStatus = r.Request.Status,
                WarehouseId = r.WarehouseId
            })
            .ToListAsync();

        return Ok(reservations);
    }

    // Получить информацию об ожидаемых товарах на площадке получения
    [HttpGet("expected/{warehouseId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetExpectedProductsAtWarehouse(int warehouseId)
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
                r.ReservedQuantity,
                r.RequestId,
                r.Status,
                RequestStatus = r.Request.Status,
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(expectedProducts);
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
            existingProduct.ReservedQuantity += productData.ReservedQuantity;
            _context.RequestProducts.Update(existingProduct);
        }
        else
        {
            // Если нет, создаём новый RequestProduct
            var requestProduct = new RequestProduct
            {
                RequestId = id,
                ProductId = productData.ProductId,
                ReservedQuantity = productData.ReservedQuantity,
            };
            _context.RequestProducts.Add(requestProduct);
        }

        // Создаём ReservedProduct запись на площадке получения
        if (request.TransferWarehouseId.HasValue)
        {
            var existingReserved = await _context.Set<ReservedProduct>()
                .FirstOrDefaultAsync(rp => rp.ProductId == productData.ProductId 
                    && rp.WarehouseId == request.TransferWarehouseId.Value 
                    && rp.RequestId == id);

            if (existingReserved != null)
            {
                existingReserved.ReservedQuantity += productData.ReservedQuantity;
                _context.Set<ReservedProduct>().Update(existingReserved);
            }
            else
            {
                var reservedProduct = new ReservedProduct
                {
                    ProductId = productData.ProductId,
                    WarehouseId = request.TransferWarehouseId.Value,
                    RequestId = id,
                    ReservedQuantity = productData.ReservedQuantity,
                    Status = "pending"
                };
                _context.Set<ReservedProduct>().Add(reservedProduct);
            }
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

        // Также удаляем ReservedProduct запись для этого товара
        var reservedProducts = await _context.Set<ReservedProduct>()
            .Where(rp => rp.RequestId == id && rp.ProductId == productId)
            .ToListAsync();
        
        foreach (var reserved in reservedProducts)
        {
            _context.Set<ReservedProduct>().Remove(reserved);
        }

        await _context.SaveChangesAsync();

        // Возвращаем обновленный Request с товарами
        var updatedRequest = await _context.Requests
            .Include(r => r.RequestProducts)
            .ThenInclude(rp => rp.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        return Ok(updatedRequest);
    }

    [HttpGet("reserved-products")]
    public async Task<ActionResult<IEnumerable<ReservedProduct>>> GetReservedProducts()
    {
        var results = await _context.ReservedProducts
            .Include(rp => rp.Product)
            .Include(rp => rp.Warehouse)
            .Include(rp => rp.Request)
            .ToListAsync();
        
        Console.WriteLine($"[DEBUG] GetReservedProducts: Найдено {results.Count} резервирований");
        foreach (var rp in results)
        {
            Console.WriteLine($"[DEBUG] ReservedProduct: Id={rp.Id}, ProductId={rp.ProductId}, RequestId={rp.RequestId}, Status={rp.Status}");
        }
        
        return results;
    }

    private bool RequestExists(int id)
    {
        return _context.Requests.Any(e => e.Id == id);
    }
}
