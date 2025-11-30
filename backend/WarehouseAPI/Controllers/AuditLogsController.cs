using Microsoft.AspNetCore.Mvc;
using WarehouseAPI.Data;
using WarehouseAPI.Services;
using System.Text;
using System.Globalization;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditLogsController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public AuditLogsController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult> GetLogs([FromQuery] int loggedInUserId, [FromQuery] int? userId, [FromQuery] int? warehouseId)
    {
        try
        {
            var currentUser = await _context.Users.FindAsync(loggedInUserId);
            if (currentUser == null)
                return Unauthorized();

            IEnumerable<dynamic> logs;

            // Admin sees all logs
            if (currentUser.Role == "admin")
            {
                var allLogs = await _auditService.GetAllLogsAsync(warehouseId, userId);
                logs = allLogs.Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.Entity,
                    l.EntityId,
                    l.UserId,
                    userName = l.User?.Username,
                    l.WarehouseId,
                    warehouseName = l.Warehouse?.Name,
                    l.Details,
                    l.Level,
                    l.Timestamp,
                    l.IpAddress
                });
            }
            // Manager sees only logs from their warehouse
            else if (currentUser.Role == "manager")
            {
                var managerWarehouseId = currentUser.WarehouseId;
                var managerLogs = await _auditService.GetLogsForUserAsync(loggedInUserId, managerWarehouseId, userId);
                logs = managerLogs.Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.Entity,
                    l.EntityId,
                    l.UserId,
                    userName = l.User?.Username,
                    l.WarehouseId,
                    warehouseName = l.Warehouse?.Name,
                    l.Details,
                    l.Level,
                    l.Timestamp,
                    l.IpAddress
                });
            }
            // Warehouseman sees only their own logs
            else
            {
                var userLogs = await _auditService.GetLogsForUserAsync(loggedInUserId, currentUser.WarehouseId, loggedInUserId);
                logs = userLogs.Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.Entity,
                    l.EntityId,
                    l.UserId,
                    userName = l.User?.Username,
                    l.WarehouseId,
                    warehouseName = l.Warehouse?.Name,
                    l.Details,
                    l.Level,
                    l.Timestamp,
                    l.IpAddress
                });
            }

            return Ok(logs.ToList());
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("export")]
    public async Task<ActionResult> ExportLogsToCSV([FromQuery] int loggedInUserId, [FromQuery] int? userId, [FromQuery] int? warehouseId)
    {
        try
        {
            var currentUser = await _context.Users.FindAsync(loggedInUserId);
            if (currentUser == null)
                return Unauthorized();

            IEnumerable<dynamic> logs;

            // Admin sees all logs
            if (currentUser.Role == "admin")
            {
                var allLogs = await _auditService.GetAllLogsAsync(warehouseId, userId);
                logs = allLogs.Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.Entity,
                    l.EntityId,
                    UserName = l.User?.Username,
                    WarehouseName = l.Warehouse?.Name,
                    l.Details,
                    l.Level,
                    l.Timestamp,
                    l.IpAddress
                });
            }
            // Manager sees only logs from their warehouse
            else if (currentUser.Role == "manager")
            {
                var managerWarehouseId = currentUser.WarehouseId;
                var managerLogs = await _auditService.GetLogsForUserAsync(loggedInUserId, managerWarehouseId, userId);
                logs = managerLogs.Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.Entity,
                    l.EntityId,
                    UserName = l.User?.Username,
                    WarehouseName = l.Warehouse?.Name,
                    l.Details,
                    l.Level,
                    l.Timestamp,
                    l.IpAddress
                });
            }
            // Warehouseman sees only their own logs
            else
            {
                var userLogs = await _auditService.GetLogsForUserAsync(loggedInUserId, currentUser.WarehouseId, loggedInUserId);
                logs = userLogs.Select(l => new
                {
                    l.Id,
                    l.Action,
                    l.Entity,
                    l.EntityId,
                    UserName = l.User?.Username,
                    WarehouseName = l.Warehouse?.Name,
                    l.Details,
                    l.Level,
                    l.Timestamp,
                    l.IpAddress
                });
            }

            var csvContent = new StringBuilder();
            
            // Add BOM for UTF-8 with Cyrillic support
            csvContent.Append(Encoding.UTF8.GetString(Encoding.UTF8.GetPreamble()));
            
            // Add header with Cyrillic column names
            csvContent.AppendLine("ID,Действие,Сущность,ID Сущности,Пользователь,Склад,Детали,Уровень,Время,IP Адрес");

            foreach (var log in logs)
            {
                var id = log.Id.ToString();
                var action = EscapeCSV(log.Action);
                var entity = EscapeCSV(log.Entity);
                var entityId = EscapeCSV(log.EntityId);
                var userName = EscapeCSV(log.UserName ?? "Unknown");
                var warehouseName = EscapeCSV(log.WarehouseName ?? "Unknown");
                var details = EscapeCSV(log.Details);
                var level = log.Level;
                var timestamp = ((DateTime)log.Timestamp).ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
                var ipAddress = EscapeCSV(log.IpAddress ?? "");

                csvContent.AppendLine($"{id},{action},{entity},{entityId},{userName},{warehouseName},{details},{level},{timestamp},{ipAddress}");
            }

            byte[] buffer = Encoding.UTF8.GetBytes(csvContent.ToString());
            return File(buffer, "text/csv; charset=utf-8", "audit_logs.csv");
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private string EscapeCSV(string value)
    {
        if (string.IsNullOrEmpty(value))
            return "";

        if (value.Contains(",") || value.Contains("\"") || value.Contains("\n"))
        {
            return "\"" + value.Replace("\"", "\"\"") + "\"";
        }

        return value;
    }
}
