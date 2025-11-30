namespace WarehouseAPI.Models;

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public int? WarehouseId { get; set; }
    public string Action { get; set; } = null!; // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT
    public string Entity { get; set; } = null!; // User, Product, Request, Warehouse, etc.
    public string? EntityId { get; set; }
    public string? Details { get; set; } // JSON with changes
    public string Level { get; set; } = "Info"; // Info, Warning, Error, Debug
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }

    // Navigation properties
    public User? User { get; set; }
    public Warehouse? Warehouse { get; set; }
}
