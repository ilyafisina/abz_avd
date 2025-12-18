// Пример интеграции RequestTransferService в контроллер
// Этот файл показывает, как использовать IRequestTransferService в RequestsController

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers.Examples;

/// <summary>
/// Пример имплементации контроллера с использованием RequestTransferService.
/// Замените существующие методы в RequestsController на этот вариант для улучшенной обработки ошибок.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class RequestsControllerWithServiceExample : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IRequestTransferService _transferService;
    private readonly IAuditService _auditService;
    private readonly ILogger<RequestsControllerWithServiceExample> _logger;

    public RequestsControllerWithServiceExample(
        WarehouseContext context,
        IRequestTransferService transferService,
        IAuditService auditService,
        ILogger<RequestsControllerWithServiceExample> logger)
    {
        _context = context;
        _transferService = transferService;
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Пример: одобрить заявку и зарезервировать товары.
    /// 
    /// Использует RequestTransferService.ApproveAndReserveAsync() вместо встроенной логики.
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize(Roles = "admin,manager")]
    public async Task<IActionResult> ApproveRequest(int id, [FromQuery] int loggedInUserId)
    {
        try
        {
            _logger.LogInformation($"[ApproveRequest] Попытка одобрения заявки {id} пользователем {loggedInUserId}");

            // Загружаем заявку и пользователя
            var request = await _context.Requests
                .Include(r => r.RequestProducts)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                _logger.LogWarning($"[ApproveRequest] Заявка {id} не найдена");
                return NotFound(new { error = "Заявка не найдена", code = "NOT_FOUND" });
            }

            var user = await _context.Users.FindAsync(loggedInUserId);
            if (user == null)
            {
                _logger.LogWarning($"[ApproveRequest] Пользователь {loggedInUserId} не найден");
                return Unauthorized(new { error = "Пользователь не найден", code = "USER_NOT_FOUND" });
            }

            // Проверяем права
            if (user.Role != "admin" && (user.Role != "manager" || user.WarehouseId != request.WarehouseId))
            {
                _logger.LogWarning($"[ApproveRequest] Недостаточно прав для пользователя {loggedInUserId}");
                return Forbid();
            }

            // Проверяем текущий статус
            if (request.Status != "черновик" && request.Status != "на_согласовании")
            {
                return BadRequest(new
                {
                    error = $"Невозможно одобрить заявку со статусом '{request.Status}'",
                    code = "INVALID_STATUS"
                });
            }

            // Валидируем доступность товаров
            var stockErrors = await _transferService.ValidateStockAsync(request);
            if (stockErrors.Any())
            {
                _logger.LogWarning($"[ApproveRequest] Недостаточно товара для заявки {id}");
                return UnprocessableEntity(new
                {
                    error = "Недостаточно товара для одобрения",
                    code = "INSUFFICIENT_STOCK",
                    details = stockErrors
                });
            }

            // Выполняем одобрение и резервирование
            await _transferService.ApproveAndReserveAsync(request, user);

            // Логируем действие
            await _auditService.LogActionAsync(
                "APPROVE",
                "Request",
                request.Id,
                user.Id,
                request.WarehouseId,
                description: $"Заявка {request.Id} одобрена пользователем {user.Username}, товары зарезервированы",
                logLevel: "INFO"
            );

            // Загружаем обновленную заявку
            var updatedRequest = await _context.Requests
                .Include(r => r.RequestProducts)
                .ThenInclude(rp => rp.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            return Ok(updatedRequest);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning($"[ApproveRequest] Ошибка валидации для заявки {id}: {ex.Message}");
            return BadRequest(new { error = ex.Message, code = "VALIDATION_ERROR" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[ApproveRequest] Неожиданная ошибка при одобрении заявки {id}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера", code = "INTERNAL_ERROR" });
        }
    }

    /// <summary>
    /// Пример: отправить товар (списать со склада отправления).
    /// 
    /// Использует RequestTransferService.SendTransferAsync().
    /// </summary>
    [HttpPost("{id}/send")]
    [Authorize(Roles = "admin,manager,warehouseman")]
    public async Task<IActionResult> SendRequest(int id, [FromQuery] int loggedInUserId)
    {
        try
        {
            _logger.LogInformation($"[SendRequest] Попытка отправки заявки {id} пользователем {loggedInUserId}");

            var request = await _context.Requests
                .Include(r => r.RequestProducts)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound(new { error = "Заявка не найдена", code = "NOT_FOUND" });
            }

            var user = await _context.Users.FindAsync(loggedInUserId);
            if (user == null)
            {
                return Unauthorized(new { error = "Пользователь не найден", code = "USER_NOT_FOUND" });
            }

            // Проверяем, что заявка одобрена
            if (request.Status != "одобрено")
            {
                return BadRequest(new
                {
                    error = $"Невозможно отправить заявку со статусом '{request.Status}'",
                    code = "INVALID_STATUS",
                    allowed_statuses = new[] { "одобрено" }
                });
            }

            // Отправляем товар
            await _transferService.SendTransferAsync(request, user);

            // Обновляем статус в Request
            request.Status = "в_пути";
            request.UpdatedAt = DateTime.UtcNow;
            _context.Requests.Update(request);
            await _context.SaveChangesAsync();

            // Логируем
            await _auditService.LogActionAsync(
                "SEND",
                "Request",
                request.Id,
                user.Id,
                request.WarehouseId,
                description: $"Заявка {request.Id} отправлена пользователем {user.Username}",
                logLevel: "INFO"
            );

            var updatedRequest = await _context.Requests
                .Include(r => r.RequestProducts)
                .ThenInclude(rp => rp.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            return Ok(updatedRequest);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning($"[SendRequest] Ошибка валидации: {ex.Message}");
            return BadRequest(new { error = ex.Message, code = "VALIDATION_ERROR" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[SendRequest] Ошибка при отправке заявки {id}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера", code = "INTERNAL_ERROR" });
        }
    }

    /// <summary>
    /// Пример: завершить приёмку товара (добавить на склад получения).
    /// 
    /// Использует RequestTransferService.CompleteTransferAsync().
    /// </summary>
    [HttpPost("{id}/complete")]
    [Authorize(Roles = "admin,manager,warehouseman")]
    public async Task<IActionResult> CompleteRequest(int id, [FromQuery] int loggedInUserId)
    {
        try
        {
            _logger.LogInformation($"[CompleteRequest] Попытка завершения заявки {id} пользователем {loggedInUserId}");

            var request = await _context.Requests
                .Include(r => r.RequestProducts)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound(new { error = "Заявка не найдена", code = "NOT_FOUND" });
            }

            var user = await _context.Users.FindAsync(loggedInUserId);
            if (user == null)
            {
                return Unauthorized(new { error = "Пользователь не найден", code = "USER_NOT_FOUND" });
            }

            // Проверяем статус
            if (request.Status != "на_приемке")
            {
                return BadRequest(new
                {
                    error = $"Невозможно завершить заявку со статусом '{request.Status}'",
                    code = "INVALID_STATUS",
                    allowed_statuses = new[] { "на_приемке" }
                });
            }

            // Завершаем приёмку
            await _transferService.CompleteTransferAsync(request, user);

            // Обновляем статус
            request.Status = "завершено";
            request.UpdatedAt = DateTime.UtcNow;
            _context.Requests.Update(request);
            await _context.SaveChangesAsync();

            // Логируем
            await _auditService.LogActionAsync(
                "COMPLETE",
                "Request",
                request.Id,
                user.Id,
                request.TransferWarehouseId ?? 0,
                description: $"Заявка {request.Id} завершена пользователем {user.Username}",
                logLevel: "INFO"
            );

            var updatedRequest = await _context.Requests
                .Include(r => r.RequestProducts)
                .ThenInclude(rp => rp.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            return Ok(updatedRequest);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning($"[CompleteRequest] Ошибка валидации: {ex.Message}");
            return BadRequest(new { error = ex.Message, code = "VALIDATION_ERROR" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[CompleteRequest] Ошибка при завершении заявки {id}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера", code = "INTERNAL_ERROR" });
        }
    }

    /// <summary>
    /// Пример: отменить заявку с возвратом товаров.
    /// 
    /// Использует RequestTransferService.CancelTransferAsync().
    /// </summary>
    [HttpPost("{id}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelRequest(int id, [FromQuery] int loggedInUserId, [FromBody] CancelRequestDto cancelDto)
    {
        try
        {
            _logger.LogInformation($"[CancelRequest] Попытка отмены заявки {id} пользователем {loggedInUserId}");

            var request = await _context.Requests
                .Include(r => r.RequestProducts)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound(new { error = "Заявка не найдена", code = "NOT_FOUND" });
            }

            var user = await _context.Users.FindAsync(loggedInUserId);
            if (user == null)
            {
                return Unauthorized(new { error = "Пользователь не найден", code = "USER_NOT_FOUND" });
            }

            // Проверяем финальные статусы
            if (request.Status == "завершено" || request.Status == "отменено")
            {
                return BadRequest(new
                {
                    error = $"Невозможно отменить заявку со статусом '{request.Status}'",
                    code = "INVALID_STATUS"
                });
            }

            // Отменяем
            await _transferService.CancelTransferAsync(request, user, cancelDto.Reason);

            // Обновляем статус
            request.Status = "отменено";
            request.UpdatedAt = DateTime.UtcNow;
            _context.Requests.Update(request);
            await _context.SaveChangesAsync();

            // Логируем
            await _auditService.LogActionAsync(
                "CANCEL",
                "Request",
                request.Id,
                user.Id,
                request.WarehouseId,
                description: $"Заявка {request.Id} отменена пользователем {user.Username}. Причина: {cancelDto.Reason ?? "не указана"}",
                logLevel: "WARNING"
            );

            var updatedRequest = await _context.Requests
                .Include(r => r.RequestProducts)
                .ThenInclude(rp => rp.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            return Ok(updatedRequest);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning($"[CancelRequest] Ошибка валидации: {ex.Message}");
            return BadRequest(new { error = ex.Message, code = "VALIDATION_ERROR" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[CancelRequest] Ошибка при отмене заявки {id}");
            return StatusCode(500, new { error = "Внутренняя ошибка сервера", code = "INTERNAL_ERROR" });
        }
    }

    /// <summary>
    /// Пример: получить информацию о валидации товаров (перед отправкой).
    /// 
    /// Используется для предварительной проверки в UI.
    /// </summary>
    [HttpGet("{id}/validate-stock")]
    public async Task<IActionResult> ValidateStock(int id)
    {
        try
        {
            var request = await _context.Requests
                .Include(r => r.RequestProducts)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound();
            }

            var errors = await _transferService.ValidateStockAsync(request);

            return Ok(new
            {
                isValid = errors.Count == 0,
                errors = errors,
                message = errors.Count == 0 ? "Все товары доступны" : "Обнаружены проблемы с товарами"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"[ValidateStock] Ошибка при валидации заявки {id}");
            return StatusCode(500);
        }
    }
}

/// <summary>
/// DTO для отмены заявки.
/// </summary>
public class CancelRequestDto
{
    public string? Reason { get; set; }  // Причина отмены
}

/// <summary>
/// ИНТЕГРАЦИЯ В Program.cs
/// 
/// Добавьте следующие строки в Program.cs для регистрации сервиса:
/// 
/// // Регистрация сервиса перемещения товаров
/// builder.Services.AddScoped<IRequestTransferService, RequestTransferService>();
/// 
/// Пример в контексте Program.cs:
/// 
/// var builder = WebApplication.CreateBuilder(args);
/// 
/// // Add services to the container
/// builder.Services.AddDbContext<WarehouseContext>(options =>
///     options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
/// 
/// builder.Services.AddScoped<IAuditService, AuditService>();
/// builder.Services.AddScoped<IRequestTransferService, RequestTransferService>();
/// 
/// builder.Services.AddControllers();
/// builder.Services.AddEndpointsApiExplorer();
/// builder.Services.AddSwaggerGen();
/// 
/// var app = builder.Build();
/// // ... конфигурация app ...
/// app.Run();
/// </summary>
public partial class IntegrationGuide { }
