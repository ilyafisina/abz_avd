using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public WarehousesController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Warehouse>>> GetWarehouses()
    {
        return await _context.Warehouses.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Warehouse>> GetWarehouse(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
            return NotFound();
        return warehouse;
    }

    [HttpPost]
    public async Task<ActionResult<Warehouse>> CreateWarehouse([FromBody] Warehouse warehouse)
    {
        if (string.IsNullOrWhiteSpace(warehouse.Name) || string.IsNullOrWhiteSpace(warehouse.Location))
            return BadRequest("Name and Location are required");

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "CREATE",
            "Warehouse",
            warehouse.Id,
            null,
            warehouse.Id,
            description: $"Warehouse {warehouse.Name} at {warehouse.Location} created",
            logLevel: "INFO"
        );

        return CreatedAtAction(nameof(GetWarehouse), new { id = warehouse.Id }, warehouse);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWarehouse(int id, Warehouse warehouse)
    {
        if (id != warehouse.Id)
            return BadRequest();

        _context.Entry(warehouse).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!WarehouseExists(id))
                return NotFound();
            throw;
        }

        await _auditService.LogActionAsync(
            "UPDATE",
            "Warehouse",
            id,
            null,
            id,
            description: $"Warehouse {warehouse.Name} updated",
            logLevel: "INFO"
        );

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWarehouse(int id)
    {
        var warehouse = await _context.Warehouses.FindAsync(id);
        if (warehouse == null)
            return NotFound();

        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();

        await _auditService.LogActionAsync(
            "DELETE",
            "Warehouse",
            id,
            null,
            id,
            description: $"Warehouse {warehouse.Name} deleted",
            logLevel: "WARNING"
        );

        return NoContent();
    }

    private bool WarehouseExists(int id)
    {
        return _context.Warehouses.Any(e => e.Id == id);
    }
}
