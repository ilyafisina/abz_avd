using System.Text.Json.Serialization;

namespace WarehouseAPI.Models;

public class UpdateRequestStatusDto
{
    [JsonPropertyName("newStatus")]
    public required string NewStatus { get; set; }
    
    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
    
    [JsonPropertyName("reason")]
    public string? Reason { get; set; } // Причина отмены/отклонения
}

public class AddProductToRequestDto
{
    public int ProductId { get; set; }
    public int ReservedQuantity { get; set; } // Зарезервированное количество
}
