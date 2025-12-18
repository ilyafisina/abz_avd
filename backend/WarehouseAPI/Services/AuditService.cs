using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using System.Text.Json;

namespace WarehouseAPI.Services;

public interface IAuditService
{
    Task LogActionAsync(string action, string entity, int? entityId, int? userId, int? warehouseId, 
        string? oldValues = null, string? newValues = null, string? description = null, 
        string logLevel = "INFO", string? ipAddress = null);
    Task<IEnumerable<AuditLog>> GetLogsForUserAsync(int userId, int? warehouseId = null, int? userId_filter = null);
    Task<IEnumerable<AuditLog>> GetAllLogsAsync(int? warehouseId = null, int? userId = null);
}

public class AuditService : IAuditService
{
    private readonly WarehouseContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(WarehouseContext context, ILogger<AuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogActionAsync(
        string action, 
        string entity, 
        int? entityId, 
        int? userId, 
        int? warehouseId,
        string? oldValues = null, 
        string? newValues = null, 
        string? description = null,
        string logLevel = "INFO",
        string? ipAddress = null)
    {
        try
        {
            var auditLog = new AuditLog
            {
                Action = action,
                Entity = entity,
                EntityId = entityId?.ToString(),
                UserId = userId,
                WarehouseId = warehouseId,
                Details = description ?? (newValues != null ? JsonSerializer.Serialize(new { old = oldValues, @new = newValues }) : null),
                Level = logLevel,
                Timestamp = DateTime.UtcNow,
                IpAddress = ipAddress
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            // Log to file as well - fetch username from database
            if (userId.HasValue)
            {
                var user = await _context.Users.FindAsync(userId.Value);
                LogToFile(action, entity, entityId, userId, user?.Username ?? "Unknown", warehouseId, description, logLevel);
            }
            else
            {
                LogToFile(action, entity, entityId, userId, "System", warehouseId, description, logLevel);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging audit: {Message}", ex.Message);
        }
    }

    public async Task<IEnumerable<AuditLog>> GetLogsForUserAsync(int userId, int? warehouseId = null, int? userId_filter = null)
    {
        try
        {
            var query = _context.AuditLogs
                .Include(l => l.User)
                .Include(l => l.Warehouse)
                .AsQueryable();

            // User can see their own logs
            if (userId_filter.HasValue)
            {
                query = query.Where(l => l.UserId == userId_filter);
            }
            else
            {
                query = query.Where(l => l.UserId == userId);
            }

            // If warehouse ID specified, filter by warehouse
            if (warehouseId.HasValue)
            {
                query = query.Where(l => l.WarehouseId == warehouseId || l.WarehouseId == null);
            }

            return await Task.FromResult(query.OrderByDescending(l => l.Timestamp).Take(1000).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user logs: {Message}", ex.Message);
            return new List<AuditLog>();
        }
    }

    public async Task<IEnumerable<AuditLog>> GetAllLogsAsync(int? warehouseId = null, int? userId = null)
    {
        try
        {
            var query = _context.AuditLogs
                .Include(l => l.User)
                .Include(l => l.Warehouse)
                .AsQueryable();

            if (warehouseId.HasValue)
            {
                query = query.Where(l => l.WarehouseId == warehouseId || l.WarehouseId == null);
            }

            if (userId.HasValue)
            {
                query = query.Where(l => l.UserId == userId);
            }

            return await Task.FromResult(query.OrderByDescending(l => l.Timestamp).Take(5000).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all logs: {Message}", ex.Message);
            return new List<AuditLog>();
        }
    }

    private void LogToFile(string action, string entity, int? entityId, int? userId, string? username, int? warehouseId, string? description, string logLevel)
    {
        var message = $"[{action}] {entity}(ID:{entityId}) by User:{username ?? "Unknown"} in Warehouse:{warehouseId} - {description}";

        switch (logLevel.ToUpper())
        {
            case "ERROR":
                _logger.LogError(message);
                break;
            case "WARNING":
                _logger.LogWarning(message);
                break;
            case "DEBUG":
                _logger.LogDebug(message);
                break;
            default:
                _logger.LogInformation(message);
                break;
        }
    }
}

