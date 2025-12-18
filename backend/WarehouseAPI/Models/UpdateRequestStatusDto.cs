using System.Text.Json.Serialization;

namespace WarehouseAPI.Models;

public class UpdateRequestStatusDto
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }
    
    // Backward compatibility: support old "newStatus" field name
    [JsonPropertyName("newStatus")]
    public string? NewStatus
    {
        get => Status;
        set
        {
            if (!string.IsNullOrEmpty(value))
                Status = value;
        }
    }
    
    [JsonPropertyName("reason")]
    public string? Reason { get; set; } // Причина отмены/отклонения
}

public class AddProductToRequestDto
{
    public int ProductId { get; set; }
    public int ReservedQuantity { get; set; } // Зарезервированное количество
}
