using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RequestsController : ControllerBase
{
    private readonly WarehouseContext _context;

    public RequestsController(WarehouseContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Request>>> GetRequests([FromQuery] string? status = null, [FromQuery] string? warehouse = null)
    {
        var query = _context.Requests.AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);
        if (!string.IsNullOrEmpty(warehouse))
            query = query.Where(r => r.Warehouse == warehouse);
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
        return CreatedAtAction(nameof(GetRequest), new { id = request.Id }, request);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateRequest(int id, Request request)
    {
        if (id != request.Id)
            return BadRequest();

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
        return NoContent();
    }

    private bool RequestExists(int id)
    {
        return _context.Requests.Any(e => e.Id == id);
    }
}
