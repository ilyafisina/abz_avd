using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WarehouseAPI.Data;
using WarehouseAPI.Models;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/transfers/{transferId}/comments")]
public class TransferCommentsController : ControllerBase
{
    private readonly WarehouseContext _context;
    private readonly IAuditService _auditService;

    public TransferCommentsController(WarehouseContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransferComment>>> GetTransferComments(int transferId)
    {
        var comments = await _context.TransferComments
            .Where(c => c.TransferId == transferId)
            .Include(c => c.User)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return Ok(comments);
    }

    [HttpGet("{commentId}")]
    public async Task<ActionResult<TransferComment>> GetTransferComment(int transferId, int commentId)
    {
        var comment = await _context.TransferComments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == commentId && c.TransferId == transferId);

        if (comment == null)
            return NotFound();

        return comment;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<TransferComment>> AddCommentToTransfer(
        int transferId,
        [FromBody] AddCommentRequest request)
    {
        var transfer = await _context.Transfers.FindAsync(transferId);
        if (transfer == null)
            return NotFound("Transfer not found");

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null)
            return NotFound("User not found");

        var comment = new TransferComment
        {
            TransferId = transferId,
            UserId = request.UserId,
            Text = request.Text
        };

        _context.TransferComments.Add(comment);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "CREATE",
            "TransferComment",
            comment.Id,
            userId,
            transfer.FromWarehouseId,
            description: $"Comment added to transfer {transferId}",
            logLevel: "INFO"
        );

        // Reload with user data
        await _context.Entry(comment).Reference(c => c.User).LoadAsync();

        return CreatedAtAction(nameof(GetTransferComment),
            new { transferId, commentId = comment.Id }, comment);
    }

    [HttpPut("{commentId}")]
    [Authorize]
    public async Task<IActionResult> UpdateComment(
        int transferId,
        int commentId,
        [FromBody] UpdateCommentRequest request)
    {
        var comment = await _context.TransferComments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.TransferId == transferId);

        if (comment == null)
            return NotFound();

        var transfer = await _context.Transfers.FindAsync(transferId);

        comment.Text = request.Text;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "UPDATE",
            "TransferComment",
            commentId,
            userId,
            transfer?.FromWarehouseId,
            description: $"Comment {commentId} in transfer {transferId} updated",
            logLevel: "INFO"
        );

        return NoContent();
    }

    [HttpDelete("{commentId}")]
    [Authorize]
    public async Task<IActionResult> DeleteComment(int transferId, int commentId)
    {
        var comment = await _context.TransferComments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.TransferId == transferId);

        if (comment == null)
            return NotFound();

        var transfer = await _context.Transfers.FindAsync(transferId);

        _context.TransferComments.Remove(comment);
        await _context.SaveChangesAsync();

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : (int?)null;

        await _auditService.LogActionAsync(
            "DELETE",
            "TransferComment",
            commentId,
            userId,
            transfer?.FromWarehouseId,
            description: $"Comment {commentId} deleted from transfer {transferId}",
            logLevel: "INFO"
        );

        return NoContent();
    }
}

public class AddCommentRequest
{
    public int UserId { get; set; }
    public string Text { get; set; } = null!;
}

public class UpdateCommentRequest
{
    public string Text { get; set; } = null!;
}
