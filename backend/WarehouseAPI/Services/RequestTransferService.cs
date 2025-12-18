using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Services;

/// <summary>
/// Сервис для обработки бизнес-логики перемещения товаров между площадками.
/// Управляет жизненным циклом заявок и соответствующими изменениями в запасах.
/// </summary>
public interface IRequestTransferService
{
    /// <summary>
    /// Одобрить заявку и зарезервировать товары на площадке отправления.
    /// Статус: черновик/на_согласовании → одобрено
    /// </summary>
    Task ApproveAndReserveAsync(Request request, User approvingUser);

    /// <summary>
    /// Отправить товар (списать со склада отправления).
    /// Статус: одобрено → в_пути
    /// </summary>
    Task SendTransferAsync(Request request, User sendingUser);

    /// <summary>
    /// Завершить приёмку товара (добавить на склад получения).
    /// Статус: на_приемке → завершено
    /// </summary>
    Task CompleteTransferAsync(Request request, User receivingUser);

    /// <summary>
    /// Отменить заявку на любом этапе с возвратом товаров (если необходимо).
    /// Статус: (любой) → отменено
    /// </summary>
    Task CancelTransferAsync(Request request, User cancellingUser, string? reason);

    /// <summary>
    /// Проверить доступность товаров для отправки.
    /// </summary>
    Task<bool> AreProductsAvailableAsync(Request request);

    /// <summary>
    /// Получить детальную информацию об ошибке недостатка товара.
    /// </summary>
    Task<List<StockValidationError>> ValidateStockAsync(Request request);
}

/// <summary>
/// Ошибка при валидации товара.
/// </summary>
public class StockValidationError
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Available { get; set; }
    public int Reserved { get; set; }
    public int Requested { get; set; }
    public int Shortage => Requested - (Available - Reserved);
}

/// <summary>
/// Имплементация IRequestTransferService.
/// </summary>
public class RequestTransferService : IRequestTransferService
{
    private readonly WarehouseContext _context;
    private readonly ILogger<RequestTransferService> _logger;

    public RequestTransferService(WarehouseContext context, ILogger<RequestTransferService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Одобрить заявку и зарезервировать товары на площадке отправления.
    /// 
    /// Процесс:
    /// 1. Загрузить товары из RequestProducts
    /// 2. Для каждого товара:
    ///    - Проверить доступность (Quantity >= ReservedQuantity)
    ///    - Уменьшить Quantity (списание из доступных)
    ///    - Создать ReservedProduct (status='pending') на площадке отправления
    /// 3. Обновить Request (ApprovedBy, ApprovedAt)
    /// </summary>
    public async Task ApproveAndReserveAsync(Request request, User approvingUser)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _logger.LogInformation($"[ApproveAndReserve] Начало одобрения заявки {request.Id}");

            // Загружаем товары
            var requestProducts = await _context.RequestProducts
                .Where(rp => rp.RequestId == request.Id)
                .Include(rp => rp.Product)
                .ToListAsync();

            foreach (var rp in requestProducts)
            {
                // Проверяем доступность
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.WarehouseId);

                if (product == null)
                {
                    throw new InvalidOperationException(
                        $"Товар {rp.ProductId} не найден на площадке отправления {request.WarehouseId}");
                }

                if (product.Quantity < rp.ReservedQuantity)
                {
                    throw new InvalidOperationException(
                        $"Недостаточно товара {rp.ProductId}. Требуется: {rp.ReservedQuantity}, Доступно: {product.Quantity}");
                }

                // Списываем товар (уменьшаем Quantity)
                product.Quantity -= rp.ReservedQuantity;
                _context.Products.Update(product);

                _logger.LogInformation($"[ApproveAndReserve] Товар {rp.ProductId} списан " +
                    $"({rp.ReservedQuantity} шт.), осталось {product.Quantity}");

                // Создаём резервирование на площадке отправления
                var reserved = new ReservedProduct
                {
                    RequestId = request.Id,
                    ProductId = rp.ProductId,
                    WarehouseId = request.WarehouseId,
                    ReservedQuantity = rp.ReservedQuantity,
                    Status = "pending",  // Ожидание отправки
                    CreatedAt = DateTime.UtcNow
                };
                _context.ReservedProducts.Add(reserved);

                _logger.LogInformation($"[ApproveAndReserve] Создано резервирование {rp.ProductId} " +
                    $"(статус=pending) на площадке отправления");
            }

            // Обновляем заявку
            request.ApprovedBy = approvingUser.Id;
            request.ApprovedAt = DateTime.UtcNow;
            _context.Requests.Update(request);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation($"[ApproveAndReserve] Заявка {request.Id} успешно одобрена и товары зарезервированы");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, $"[ApproveAndReserve] Ошибка при одобрении заявки {request.Id}");
            throw;
        }
    }

    /// <summary>
    /// Отправить товар (списать со склада отправления и перебросить на площадку получения).
    /// 
    /// Процесс:
    /// 1. Загрузить товары из RequestProducts
    /// 2. Для каждого товара:
    ///    - UPDATE ReservedProduct на FromWarehouse (status='pending' → 'sent')
    ///    - CREATE ReservedProduct на ToWarehouse (status='pending')
    /// 3. Обновить Request (SentAt, SentById)
    /// </summary>
    public async Task SendTransferAsync(Request request, User sendingUser)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _logger.LogInformation($"[SendTransfer] Начало отправки заявки {request.Id}");

            if (!request.TransferWarehouseId.HasValue)
            {
                throw new InvalidOperationException($"Не указана площадка получения для заявки {request.Id}");
            }

            var requestProducts = await _context.RequestProducts
                .Where(rp => rp.RequestId == request.Id)
                .Include(rp => rp.Product)
                .ToListAsync();

            foreach (var rp in requestProducts)
            {
                // Обновляем резервирование на площадке отправления
                var reservedAtSource = await _context.ReservedProducts
                    .FirstOrDefaultAsync(r => r.RequestId == request.Id
                        && r.ProductId == rp.ProductId
                        && r.WarehouseId == request.WarehouseId);

                if (reservedAtSource != null)
                {
                    reservedAtSource.Status = "sent";
                    reservedAtSource.UpdatedAt = DateTime.UtcNow;
                    _context.ReservedProducts.Update(reservedAtSource);

                    _logger.LogInformation($"[SendTransfer] Резервирование товара {rp.ProductId} " +
                        $"на отправке: статус 'sent'");
                }

                // Создаём резервирование на площадке получения
                var reservedAtDest = new ReservedProduct
                {
                    RequestId = request.Id,
                    ProductId = rp.ProductId,
                    WarehouseId = request.TransferWarehouseId.Value,
                    ReservedQuantity = rp.ReservedQuantity,
                    Status = "pending",  // Ожидание прибытия
                    CreatedAt = DateTime.UtcNow
                };
                _context.ReservedProducts.Add(reservedAtDest);

                _logger.LogInformation($"[SendTransfer] Создано резервирование товара {rp.ProductId} " +
                    $"на площадке получения (статус=pending)");
            }

            // Обновляем заявку
            request.Status = "в_пути";  // На случай, если контроллер не установил
            request.UpdatedAt = DateTime.UtcNow;
            _context.Requests.Update(request);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation($"[SendTransfer] Заявка {request.Id} успешно отправлена");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, $"[SendTransfer] Ошибка при отправке заявки {request.Id}");
            throw;
        }
    }

    /// <summary>
    /// Завершить приёмку товара (добавить на склад получения).
    /// 
    /// Процесс:
    /// 1. Загрузить товары из RequestProducts
    /// 2. Для каждого товара:
    ///    - UPDATE ReservedProduct на FromWarehouse (status → 'completed')
    ///    - UPDATE ReservedProduct на ToWarehouse (status → 'received')
    ///    - SELECT или CREATE Product на ToWarehouse
    ///    - UPDATE Quantity на ToWarehouse
    /// 3. Обновить Request (ReceivedAt, ReceivedById)
    /// </summary>
    public async Task CompleteTransferAsync(Request request, User receivingUser)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _logger.LogInformation($"[CompleteTransfer] Начало завершения приёмки заявки {request.Id}");

            if (!request.TransferWarehouseId.HasValue)
            {
                throw new InvalidOperationException($"Не указана площадка получения для заявки {request.Id}");
            }

            var requestProducts = await _context.RequestProducts
                .Where(rp => rp.RequestId == request.Id)
                .Include(rp => rp.Product)
                .ToListAsync();

            foreach (var rp in requestProducts)
            {
                // Обновляем статус на площадке отправления
                var reservedAtSource = await _context.ReservedProducts
                    .FirstOrDefaultAsync(r => r.RequestId == request.Id
                        && r.ProductId == rp.ProductId
                        && r.WarehouseId == request.WarehouseId);

                if (reservedAtSource != null)
                {
                    reservedAtSource.Status = "completed";
                    reservedAtSource.UpdatedAt = DateTime.UtcNow;
                    _context.ReservedProducts.Update(reservedAtSource);

                    _logger.LogInformation($"[CompleteTransfer] Резервирование товара {rp.ProductId} " +
                        $"на отправке: статус 'completed'");
                }

                // Обновляем статус на площадке получения
                var reservedAtDest = await _context.ReservedProducts
                    .FirstOrDefaultAsync(r => r.RequestId == request.Id
                        && r.ProductId == rp.ProductId
                        && r.WarehouseId == request.TransferWarehouseId.Value);

                if (reservedAtDest != null)
                {
                    reservedAtDest.Status = "received";
                    reservedAtDest.UpdatedAt = DateTime.UtcNow;
                    _context.ReservedProducts.Update(reservedAtDest);

                    _logger.LogInformation($"[CompleteTransfer] Резервирование товара {rp.ProductId} " +
                        $"на приемке: статус 'received'");
                }

                // Добавляем товар на площадку получения
                if (rp.Product != null && rp.Product.Barcode != null)
                {
                    // Ищем товар по штрихкоду на площадке получения
                    var existingProduct = await _context.Products
                        .FirstOrDefaultAsync(p => p.Barcode == rp.Product.Barcode 
                            && p.WarehouseId == request.TransferWarehouseId.Value);

                    if (existingProduct != null)
                    {
                        // Товар найден — увеличиваем количество
                        existingProduct.Quantity += rp.ReservedQuantity;
                        _context.Products.Update(existingProduct);

                        _logger.LogInformation($"[CompleteTransfer] Товар {rp.ProductId} добавлен на площадку " +
                            $"получения: +{rp.ReservedQuantity}, всего {existingProduct.Quantity}");
                    }
                    else
                    {
                        // Товар не найден — создаём новую запись
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

                        _logger.LogInformation($"[CompleteTransfer] Новый товар {rp.ProductId} создан на площадке " +
                            $"получения: {rp.ReservedQuantity} шт.");
                    }
                }
            }

            // Обновляем заявку
            request.ReceivedBy = receivingUser.Id;
            request.ReceivedAt = DateTime.UtcNow;
            _context.Requests.Update(request);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation($"[CompleteTransfer] Заявка {request.Id} успешно завершена и товары добавлены");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, $"[CompleteTransfer] Ошибка при завершении приёмки заявки {request.Id}");
            throw;
        }
    }

    /// <summary>
    /// Отменить заявку на любом этапе с возвратом товаров (если они были списаны).
    /// 
    /// Процесс:
    /// 1. Если oldStatus не 'черновик' и не 'на_согласовании' (т.е. товары были списаны):
    ///    - Вернуть товары на площадку отправления
    /// 2. UPDATE ReservedProducts → 'cancelled'
    /// 3. Обновить Request (CancelledAt, CancelledBy, CancellationReason)
    /// </summary>
    public async Task CancelTransferAsync(Request request, User cancellingUser, string? reason)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            _logger.LogInformation($"[CancelTransfer] Начало отмены заявки {request.Id} (был статус: {request.Status})");

            var oldStatus = request.Status;
            var requestProducts = await _context.RequestProducts
                .Where(rp => rp.RequestId == request.Id)
                .Include(rp => rp.Product)
                .ToListAsync();

            foreach (var rp in requestProducts)
            {
                // Возвращаем товары, если они были списаны (т.е. не на этапе черновика/согласования)
                if (oldStatus != "черновик" && oldStatus != "на_согласовании")
                {
                    var product = await _context.Products
                        .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.WarehouseId);

                    if (product != null)
                    {
                        product.Quantity += rp.ReservedQuantity;
                        _context.Products.Update(product);

                        _logger.LogInformation($"[CancelTransfer] Товар {rp.ProductId} возвращен на площадку: " +
                            $"+{rp.ReservedQuantity}, новое количество {product.Quantity}");
                    }
                    else
                    {
                        _logger.LogWarning($"[CancelTransfer] Товар {rp.ProductId} не найден на площадке " +
                            $"отправления {request.WarehouseId} для возврата");
                    }
                }

                // Обновляем статусы резервирований
                var reservedAtSource = await _context.ReservedProducts
                    .FirstOrDefaultAsync(r => r.RequestId == request.Id
                        && r.ProductId == rp.ProductId
                        && r.WarehouseId == request.WarehouseId);

                if (reservedAtSource != null)
                {
                    reservedAtSource.Status = "cancelled";
                    reservedAtSource.UpdatedAt = DateTime.UtcNow;
                    _context.ReservedProducts.Update(reservedAtSource);

                    _logger.LogInformation($"[CancelTransfer] Резервирование товара {rp.ProductId} " +
                        $"на отправке: статус 'cancelled'");
                }

                // Отменяем резервирование на площадке получения (если есть)
                if (request.TransferWarehouseId.HasValue)
                {
                    var reservedAtDest = await _context.ReservedProducts
                        .FirstOrDefaultAsync(r => r.RequestId == request.Id
                            && r.ProductId == rp.ProductId
                            && r.WarehouseId == request.TransferWarehouseId.Value);

                    if (reservedAtDest != null)
                    {
                        reservedAtDest.Status = "cancelled";
                        reservedAtDest.UpdatedAt = DateTime.UtcNow;
                        _context.ReservedProducts.Update(reservedAtDest);

                        _logger.LogInformation($"[CancelTransfer] Резервирование товара {rp.ProductId} " +
                            $"на приемке: статус 'cancelled'");
                    }
                }
            }

            // Обновляем заявку
            request.CancelledBy = cancellingUser.Id;
            request.CancelledAt = DateTime.UtcNow;
            request.CancellationReason = reason ?? "Не указана причина";
            _context.Requests.Update(request);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation($"[CancelTransfer] Заявка {request.Id} успешно отменена");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, $"[CancelTransfer] Ошибка при отмене заявки {request.Id}");
            throw;
        }
    }

    /// <summary>
    /// Проверить доступность товаров для отправки.
    /// </summary>
    public async Task<bool> AreProductsAvailableAsync(Request request)
    {
        var errors = await ValidateStockAsync(request);
        return errors.Count == 0;
    }

    /// <summary>
    /// Получить детальную информацию об ошибках при валидации товара.
    /// </summary>
    public async Task<List<StockValidationError>> ValidateStockAsync(Request request)
    {
        var errors = new List<StockValidationError>();

        var requestProducts = await _context.RequestProducts
            .Where(rp => rp.RequestId == request.Id)
            .Include(rp => rp.Product)
            .ToListAsync();

        foreach (var rp in requestProducts)
        {
            // Получаем текущий товар на площадке отправления
            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == rp.ProductId && p.WarehouseId == request.WarehouseId);

            if (product == null)
            {
                errors.Add(new StockValidationError
                {
                    ProductId = rp.ProductId,
                    ProductName = rp.Product?.Name ?? $"Product {rp.ProductId}",
                    Available = 0,
                    Reserved = 0,
                    Requested = rp.ReservedQuantity
                });
                continue;
            }

            // Получаем количество уже зарезервированных товаров
            var reservedCount = await _context.ReservedProducts
                .Where(r => r.ProductId == rp.ProductId && r.WarehouseId == request.WarehouseId)
                .SumAsync(r => r.ReservedQuantity);

            int available = product.Quantity - reservedCount;

            if (available < rp.ReservedQuantity)
            {
                errors.Add(new StockValidationError
                {
                    ProductId = rp.ProductId,
                    ProductName = product.Name,
                    Available = product.Quantity,
                    Reserved = reservedCount,
                    Requested = rp.ReservedQuantity
                });
            }
        }

        return errors;
    }
}
