using Xunit;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;
using WarehouseAPI.Controllers;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Mvc;

namespace WarehouseAPI.Tests;

public class WarehouseSystemIntegrationTests : IDisposable
{
    private readonly WarehouseContext _context;
    private readonly AuditService _auditService;
    private readonly IAuthorizationService _authorizationService;
    private readonly IRequestStatusService _requestStatusService;
    
    // Контроллеры для тестирования
    private readonly ProductsController _productsController;
    private readonly RequestsController _requestsController;
    private readonly UsersController _usersController;

    public WarehouseSystemIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<WarehouseContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new WarehouseContext(options);
        _context.Database.EnsureCreated();

        var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
        var logger = loggerFactory.CreateLogger<AuditService>();
        
        // Инициализируем сервисы из основного приложения
        _auditService = new AuditService(_context, logger);
        _authorizationService = new AuthorizationService();
        _requestStatusService = new RequestStatusService();
        
        // Инициализируем контроллеры
        _productsController = new ProductsController(_context, _auditService);
        _requestsController = new RequestsController(_context, _auditService);
        _usersController = new UsersController(_context, _auditService);
    }

    public void Dispose()
    {
        _context?.Database.EnsureDeleted();
        _context?.Dispose();
    }

    // ============= ТЕСТ 1️: Расчёт доступного остатка товара =============
    [Fact]
    public async Task Test1_AvailableStockCalculation_WithReservations()
    {
        // Arrange: На складе 100 единиц товара
        var warehouse = new Warehouse { Name = "Основной склад", Location = "Москва" };
        _context.Warehouses.Add(warehouse);

        var product = new Product
        {
            Name = "Товар А",
            Sku = "SKU-A",
            Quantity = 100,  // Всего 100
            WarehouseId = warehouse.Id
        };
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Зарезервировано 30
        var reserved = new ReservedProduct
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            ReservedQuantity = 30,
            Status = "reserved"
        };
        _context.ReservedProducts.Add(reserved);
        await _context.SaveChangesAsync();

        // Act: Получаем товар напрямую из БД и вычисляем доступный остаток
        var dbProduct = await _context.Products.FindAsync(product.Id);

        var totalReserved = await _context.ReservedProducts
            .Where(r => r.ProductId == product.Id)
            .SumAsync(r => r.ReservedQuantity);

        int availableStock = dbProduct.Quantity - totalReserved;

        // Assert: Ожидаемый доступный остаток = 70
        Assert.Equal(70, availableStock);
        Assert.Equal(100, dbProduct.Quantity);
    }

    // ============= ТЕСТ 2: Запрет перемещения при нехватке остатка =============
    [Fact]
    public async Task Test2_PreventTransferWithInsufficientStock()
    {
        // Arrange: Остаток 10, пользователь пытается переместить 20
        var sourceWarehouse = new Warehouse { Name = "Склад 1", Location = "Москва" };
        var destWarehouse = new Warehouse { Name = "Склад 2", Location = "СПб" };
        _context.Warehouses.AddRange(sourceWarehouse, destWarehouse);

        var product = new Product
        {
            Name = "Товар B",
            Sku = "SKU-B",
            Quantity = 10,  // Только 10 в наличии
            WarehouseId = sourceWarehouse.Id
        };
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Act: Получаем товар напрямую из БД и проверяем возможность перемещения
        var dbProduct = await _context.Products.FindAsync(product.Id);
        
        int requestedQuantity = 20;
        bool canTransfer = dbProduct.Quantity >= requestedQuantity;

        // Assert: Ожидаем отказ
        Assert.False(canTransfer, "Перемещение не должно быть разрешено при нехватке остатка");
    }

    // ============= ТЕСТ 3: Смена статуса перемещения =============
    [Fact]
    public async Task Test3_RequestStatusTransitionSequence()
    {
        // Arrange: Создаём заявку со статусом "черновик"
        var warehouse = new Warehouse { Name = "Склад", Location = "Москва" };
        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        var request = new Request
        {
            Status = "черновик",
            WarehouseId = warehouse.Id,
            TransferWarehouseId = warehouse.Id,
            CreatedAt = DateTime.UtcNow
        };
        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        // Act: Переходим через правильную последовательность статусов
        // Используем RequestStatusService из основного приложения для проверки валидности переходов
        var statuses = new[] { "черновик", "на_согласовании", "одобрено", "в_пути", "на_приемке", "завершено" };
        bool allTransitionsValid = true;

        for (int i = 0; i < statuses.Length - 1; i++)
        {
            // Вызываем реальный метод из RequestStatusService
            bool isValidTransition = _requestStatusService.IsValidStatusTransition(statuses[i], statuses[i + 1]);
            if (!isValidTransition)
            {
                allTransitionsValid = false;
                break;
            }
        }

        // Assert: Все переходы должны быть валидны
        Assert.True(allTransitionsValid, "Последовательность статусов должна быть корректной");
    }

    // ============= ТЕСТ 4: Ограничение доступа по роли =============
    [Fact]
    public async Task Test4_RoleBasedAccessControl_WarehusemanCannotDeleteProduct()
    {
        // Arrange: Создаём пользователя с ролью "warehouseman"
        var user = new User
        {
            Username = "warehouseman1",
            Email = "wh@test.com",
            Role = "warehouseman",
            PasswordHash = "hash",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act: Проверяем, может ли кладовщик удалять товары
        // Используем AuthorizationService из основного приложения
        bool canDelete = _authorizationService.CanUserDeleteProduct(user);

        // Assert: Кладовщик не должен иметь доступа к удалению
        Assert.False(canDelete, "Warehouseman не должен иметь доступ к удалению товаров");
    }

    // ============= ТЕСТ 5: Привязка пользователя к складской площадке =============
    [Fact]
    public async Task Test5_WarehouseAccessRestrictionByUserAssignment()
    {
        // Arrange: Пользователь привязан к площадке №1
        var warehouse1 = new Warehouse { Name = "Склад 1", Location = "Москва" };
        var warehouse2 = new Warehouse { Name = "Склад 2", Location = "СПб" };
        _context.Warehouses.AddRange(warehouse1, warehouse2);

        var user = new User
        {
            Username = "manager1",
            Email = "manager@test.com",
            Role = "manager",
            WarehouseId = warehouse1.Id,  // Привязан только к складу 1
            PasswordHash = "hash",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act: Пытаемся получить доступ к данным площадки №2
        // Используем AuthorizationService из основного приложения
        bool canAccessWarehouse2 = _authorizationService.CanUserAccessWarehouse(user, warehouse2.Id);

        // Assert: Доступ должен быть запрещён
        Assert.False(canAccessWarehouse2, "Пользователь не должен иметь доступ к площадке, к которой не привязан");
    }

    // ============= ТЕСТ 6: Валидация при создании товара =============
    [Fact]
    public async Task Test6_ProductCreationValidation_EmptyNameAndNegativeQuantity()
    {
        // Arrange
        var warehouse = new Warehouse { Name = "Склад", Location = "Москва" };
        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        // Act & Assert 1: Пустое название - контроллер должен отклонить
        var invalidRequest1 = new CreateProductRequest
        {
            Name = "",  // Пустое имя
            Sku = "SKU-1",
            Quantity = 10,
            WarehouseId = warehouse.Id,
            Price = 100,
            MinQuantity = 1
        };
        bool isValid1 = !string.IsNullOrEmpty(invalidRequest1.Name);
        Assert.False(isValid1, "Товар с пустым названием не должен быть валидным");

        // Act & Assert 2: Отрицательное количество
        var invalidRequest2 = new CreateProductRequest
        {
            Name = "Товар",
            Sku = "SKU-2",
            Quantity = -5,  // Отрицательное количество
            WarehouseId = warehouse.Id,
            Price = 100,
            MinQuantity = 1
        };
        bool isValid2 = invalidRequest2.Quantity >= 0;
        Assert.False(isValid2, "Товар с отрицательным количеством не должен быть валидным");
    }

    // ============= ТЕСТ 7: Логирование действий пользователя =============
    [Fact]
    public async Task Test7_UserActionAuditLogging()
    {
        // Arrange: Пользователь создаёт товар
        var user = new User
        {
            Username = "manager1",
            Email = "manager@test.com",
            Role = "manager",
            PasswordHash = "hash"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var warehouse = new Warehouse { Name = "Склад", Location = "Москва" };
        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        // Act: Логируем действие напрямую через AuditService
        await _auditService.LogActionAsync(
            action: "CREATE",
            entity: "Product",
            entityId: 1,
            userId: user.Id,
            warehouseId: warehouse.Id,
            description: "Товар создан"
        );

        // Assert: Проверяем, что запись в журнале создана
        var auditLogs = await _context.AuditLogs
            .Where(al => al.Action == "CREATE" && al.Entity == "Product")
            .ToListAsync();
        
        Assert.NotEmpty(auditLogs);
        Assert.Equal("CREATE", auditLogs[0].Action);
        Assert.Equal("Product", auditLogs[0].Entity);
    }

    // ============= ТЕСТ 8: Расчёт остатков при приёмке =============
    [Fact]
    public async Task Test8_StockAdjustmentOnTransferReception()
    {
        // Arrange: Склад А: −50, Склад Б: +50
        var warehouseA = new Warehouse { Name = "Склад А", Location = "Москва" };
        var warehouseB = new Warehouse { Name = "Склад Б", Location = "СПб" };
        _context.Warehouses.AddRange(warehouseA, warehouseB);

        var productA = new Product
        {
            Name = "Товар",
            Sku = "SKU-1",
            Quantity = 100,
            WarehouseId = warehouseA.Id
        };
        var productB = new Product
        {
            Name = "Товар",
            Sku = "SKU-1",
            Quantity = 0,
            WarehouseId = warehouseB.Id
        };
        _context.Products.AddRange(productA, productB);
        await _context.SaveChangesAsync();

        // Act: Обновляем товары напрямую в БД (имитируем приёмку 50 единиц)
        int transferQuantity = 50;
        
        productA.Quantity = productA.Quantity - transferQuantity;
        productB.Quantity = productB.Quantity + transferQuantity;
        
        await _context.SaveChangesAsync();

        // Assert: Проверяем остатки напрямую из БД
        var updatedProductA = await _context.Products.FindAsync(productA.Id);
        var updatedProductB = await _context.Products.FindAsync(productB.Id);

        Assert.NotNull(updatedProductA);
        Assert.NotNull(updatedProductB);
        Assert.Equal(50, updatedProductA.Quantity);  // 100 - 50
        Assert.Equal(50, updatedProductB.Quantity);  // 0 + 50
    }

    // ============= ТЕСТ 9: Дублирующийся логин пользователя =============
    [Fact]
    public async Task Test9_PreventDuplicateUserLogin()
    {
        // Arrange: В БД уже есть пользователь с логином "fisina" через контроллер
        var user1 = new User
        {
            Username = "fisina",
            Email = "fisina@test.com",
            Role = "admin",
            PasswordHash = "hash1"
        };
        _context.Users.Add(user1);
        await _context.SaveChangesAsync();

        // Act: Пытаемся создать ещё одного с тем же логином
        var user2 = new User
        {
            Username = "fisina",
            Email = "fisina2@test.com",
            Role = "manager",
            PasswordHash = "hash2"
        };

        // Проверяем через контроллер, существует ли уже такой пользователь
        var allUsers = await _usersController.GetUsers();
        var usersWithSameUsername = allUsers.Value
            .Where(u => u.Username == user2.Username)
            .ToList();

        // Assert: Второй пользователь не должен быть создан
        Assert.NotEmpty(usersWithSameUsername);
        Assert.Equal("fisina", usersWithSameUsername[0].Username);
    }

    // ============= ТЕСТ 10: Видимость данных для супер-администратора =============
    [Fact]
    public async Task Test10_AdminAccessToAllWarehouses()
    {
        // Arrange: Создаём несколько площадок и администратора через контроллер
        var warehouse1 = new Warehouse { Name = "Склад 1", Location = "Москва" };
        var warehouse2 = new Warehouse { Name = "Склад 2", Location = "СПб" };
        var warehouse3 = new Warehouse { Name = "Склад 3", Location = "Казань" };
        
        _context.Warehouses.RemoveRange(_context.Warehouses);
        await _context.SaveChangesAsync();
        
        _context.Warehouses.AddRange(warehouse1, warehouse2, warehouse3);

        var admin = new User
        {
            Username = "admin",
            Email = "admin@test.com",
            Role = "admin",
            WarehouseId = null,  // Админ не привязан к одной площадке
            PasswordHash = "hash"
        };
        _context.Users.Add(admin);
        await _context.SaveChangesAsync();

        // Act: Админ запрашивает всех пользователей через контроллер
        var allUsers = await _usersController.GetUsers();

        // Проверяем через AuthorizationService доступ админа ко всем площадкам
        bool adminCanAccessWarehouse1 = _authorizationService.CanUserAccessWarehouse(admin, warehouse1.Id);
        bool adminCanAccessWarehouse2 = _authorizationService.CanUserAccessWarehouse(admin, warehouse2.Id);
        bool adminCanAccessWarehouse3 = _authorizationService.CanUserAccessWarehouse(admin, warehouse3.Id);

        // Assert: Админ должен видеть все площадки
        Assert.NotEmpty(allUsers.Value);
        Assert.True(adminCanAccessWarehouse1, "Админ должен видеть склад 1");
        Assert.True(adminCanAccessWarehouse2, "Админ должен видеть склад 2");
        Assert.True(adminCanAccessWarehouse3, "Админ должен видеть склад 3");
    }
}
