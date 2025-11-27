using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WarehousesController : ControllerBase
{
    private readonly WarehouseContext _context;

    public WarehousesController(WarehouseContext context)
    {
        _context = context;
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
        return NoContent();
    }

    private bool WarehouseExists(int id)
    {
        return _context.Warehouses.Any(e => e.Id == id);
    }
}
