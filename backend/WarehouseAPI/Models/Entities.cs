namespace WarehouseAPI.Models;

public class Warehouse
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Location { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Transfer> OutgoingTransfers { get; set; } = new List<Transfer>();
    public ICollection<Transfer> IncomingTransfers { get; set; } = new List<Transfer>();
    public ICollection<Request> Requests { get; set; } = new List<Request>();
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string Role { get; set; } = null!; // admin, manager, warehouseman
    public string? Warehouse { get; set; } // FK to Warehouse.Id
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? WarehouseNavigation { get; set; }
    public ICollection<Transfer> CreatedTransfers { get; set; } = new List<Transfer>();
    public ICollection<TransferComment> Comments { get; set; } = new List<TransferComment>();
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Sku { get; set; } = null!;
    public int CategoryId { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public string Warehouse { get; set; } = null!; // FK to Warehouse.Id
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Category Category { get; set; } = null!;
    public Warehouse? WarehouseNavigation { get; set; }
    public ICollection<TransferProduct> TransferProducts { get; set; } = new List<TransferProduct>();
}

public class Transfer
{
    public int Id { get; set; }
    public int CreatedByUserId { get; set; }
    public string FromWarehouse { get; set; } = null!; // FK to Warehouse.Id
    public string ToWarehouse { get; set; } = null!; // FK to Warehouse.Id
    public string Status { get; set; } = "pending"; // pending, in_transit, completed, cancelled
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User CreatedByUser { get; set; } = null!;
    public Warehouse FromWarehouseNavigation { get; set; } = null!;
    public Warehouse ToWarehouseNavigation { get; set; } = null!;
    public ICollection<TransferProduct> Products { get; set; } = new List<TransferProduct>();
    public ICollection<TransferComment> Comments { get; set; } = new List<TransferComment>();
}

public class TransferProduct
{
    public int Id { get; set; }
    public int TransferId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public int? ReceivedQuantity { get; set; } // Фактически полученное кол-во
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Transfer Transfer { get; set; } = null!;
    public Product Product { get; set; } = null!;
}

public class TransferComment
{
    public int Id { get; set; }
    public int TransferId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public Transfer Transfer { get; set; } = null!;
    public User User { get; set; } = null!;
}

public class Log
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = null!;
    public string? Details { get; set; }
    public string IpAddress { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Request
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ProductId { get; set; }
    public string Warehouse { get; set; } = null!; // FK to Warehouse.Id
    public string? TransferWarehouse { get; set; } // FK to Warehouse.Id
    public int Quantity { get; set; }
    public string Status { get; set; } = "pending"; // pending, approved, rejected, completed
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? WarehouseNavigation { get; set; }
    public Warehouse? TransferWarehouseNavigation { get; set; }
}
