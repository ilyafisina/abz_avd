using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var query = _context.Requests.AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);
        if (warehouse.HasValue)
            query = query.Where(r => r.WarehouseId == warehouse.Value);
        return await query.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Request>> GetRequest(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();
        return request;
    }

    [HttpPost]
    public async Task<ActionResult<Request>> CreateRequest(Request request)
    {
        _context.Requests.Add(request);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "CREATE",
            "Request",
            request.Id,
            null,
            request.WarehouseId,
            description: $"Request {request.Id} created with status {request.Status}",
            logLevel: "INFO"
        );

        return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
    }

    [HttpPut("{id}")]
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

        await _auditService.LogActionAsync(
            "UPDATE",
            "Request",
            id,
            null,
            request.WarehouseId,
            description: description,
            logLevel: "INFO"
        );

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteRequest(int id)
    {
        var request = await _context.Requests.FindAsync(id);
        if (request == null)
            return NotFound();

        _context.Requests.Remove(request);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "DELETE",
            "Request",
            id,
            null,
            request.WarehouseId,
            description: $"Request {id} with status {request.Status} deleted",
            logLevel: "WARNING"
        );

        return NoContent();
    }

    private bool RequestExists(int id)
    {
        return _context.Requests.Any(e => e.Id == id);
    }
}
