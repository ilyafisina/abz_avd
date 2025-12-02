namespace WarehouseAPI.Models;

public class UpdateRequestStatusDto
{
    public required string NewStatus { get; set; }
    public string? Notes { get; set; }
}

public class AddProductToRequestDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}
