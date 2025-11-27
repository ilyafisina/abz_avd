using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransfersController : ControllerBase
{
    private readonly WarehouseContext _context;

    public TransfersController(WarehouseContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Transfer>>> GetTransfers(
        [FromQuery] string? status = null,
        [FromQuery] int? fromWarehouse = null,
        [FromQuery] int? toWarehouse = null)
    {
        var query = _context.Transfers
            .Include(t => t.CreatedByUser)
            .Include(t => t.FromWarehouse)
            .Include(t => t.ToWarehouse)
            .Include(t => t.Products)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(t => t.Status == status);
        if (fromWarehouse.HasValue)
            query = query.Where(t => t.FromWarehouseId == fromWarehouse.Value);
        if (toWarehouse.HasValue)
            query = query.Where(t => t.ToWarehouseId == toWarehouse.Value);

        return await query.ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Transfer>> GetTransfer(int id)
    {
        var transfer = await _context.Transfers
            .Include(t => t.CreatedByUser)
            .Include(t => t.FromWarehouse)
            .Include(t => t.ToWarehouse)
            .Include(t => t.Products)
            .ThenInclude(tp => tp.Product)
            .Include(t => t.Comments)
            .ThenInclude(c => c.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (transfer == null)
            return NotFound();

        return transfer;
    }

    [HttpPost]
    public async Task<ActionResult<Transfer>> CreateTransfer([FromBody] CreateTransferRequest request)
    {
        var transfer = new Transfer
        {
            CreatedByUserId = request.CreatedByUserId,
            FromWarehouseId = request.FromWarehouseId,
            ToWarehouseId = request.ToWarehouseId,
            Status = "pending"
        };

        _context.Transfers.Add(transfer);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTransfer), new { id = transfer.Id }, transfer);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTransfer(int id, Transfer transfer)
    {
        if (id != transfer.Id)
            return BadRequest();

        _context.Entry(transfer).State = EntityState.Modified;
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!TransferExists(id))
                return NotFound();
            throw;
        }
        return NoContent();
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateTransferStatus(int id, [FromBody] StatusUpdate statusUpdate)
    {
        var transfer = await _context.Transfers.FindAsync(id);
        if (transfer == null)
            return NotFound();

        transfer.Status = statusUpdate.Status;
        transfer.UpdatedAt = DateTime.UtcNow;

        if (statusUpdate.Status == "in_transit")
            transfer.StartedAt = DateTime.UtcNow;
        else if (statusUpdate.Status == "completed")
            transfer.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransfer(int id)
    {
        var transfer = await _context.Transfers.FindAsync(id);
        if (transfer == null)
            return NotFound();

        _context.Transfers.Remove(transfer);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private bool TransferExists(int id)
    {
        return _context.Transfers.Any(e => e.Id == id);
    }
}

public class StatusUpdate
{
    public string Status { get; set; } = null!;
}

public class CreateTransferRequest
{
    public int CreatedByUserId { get; set; }
    public int FromWarehouseId { get; set; }
    public int ToWarehouseId { get; set; }
}
