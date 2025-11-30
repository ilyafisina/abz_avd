using log4net;
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
    private static readonly ILog _logger = LogManager.GetLogger(typeof(AuditService));

    public AuditService(WarehouseContext context)
    {
        _context = context;
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

            // Log to file as well
            LogToFile(action, entity, entityId, userId, warehouseId, description, logLevel);
        }
        catch (Exception ex)
        {
            _logger.Error($"Error logging audit: {ex.Message}", ex);
        }
    }

    public async Task<IEnumerable<AuditLog>> GetLogsForUserAsync(int userId, int? warehouseId = null, int? userId_filter = null)
    {
        try
        {
            var query = _context.AuditLogs.AsQueryable();

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
            _logger.Error($"Error retrieving user logs: {ex.Message}", ex);
            return new List<AuditLog>();
        }
    }

    public async Task<IEnumerable<AuditLog>> GetAllLogsAsync(int? warehouseId = null, int? userId = null)
    {
        try
        {
            var query = _context.AuditLogs.AsQueryable();

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
            _logger.Error($"Error retrieving all logs: {ex.Message}", ex);
            return new List<AuditLog>();
        }
    }

    private void LogToFile(string action, string entity, int? entityId, int? userId, int? warehouseId, string? description, string logLevel)
    {
        var message = $"[{action}] {entity}(ID:{entityId}) by User:{userId} in Warehouse:{warehouseId} - {description}";

        switch (logLevel.ToUpper())
        {
            case "ERROR":
                _logger.Error(message);
                break;
            case "WARNING":
                _logger.Warn(message);
                break;
            case "DEBUG":
                _logger.Debug(message);
                break;
            default:
                _logger.Info(message);
                break;
        }
    }
}
