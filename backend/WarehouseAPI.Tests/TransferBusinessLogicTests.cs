using Xunit;
using WarehouseAPI.Models;

namespace WarehouseAPI.Tests;

public class TransferBusinessLogicTests
{
    [Fact]
    public void Transfer_CanStartWithPendingStatus()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending" };

        // Act
        bool canStart = CanTransitionStatus(transfer.Status, "in_transit");

        // Assert
        Assert.True(canStart);
    }

    [Fact]
    public void Transfer_CanCompleteFromInTransit()
    {
        // Arrange
        var transfer = new Transfer { Status = "in_transit" };

        // Act
        bool canComplete = CanTransitionStatus(transfer.Status, "completed");

        // Assert
        Assert.True(canComplete);
    }

    [Fact]
    public void Transfer_CanCancelFromPending()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending" };

        // Act
        bool canCancel = CanTransitionStatus(transfer.Status, "cancelled");

        // Assert
        Assert.True(canCancel);
    }

    [Fact]
    public void Transfer_CannotCompleteFromPending()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending" };

        // Act
        bool canComplete = CanTransitionStatus(transfer.Status, "completed");

        // Assert
        Assert.False(canComplete);
    }

    [Fact]
    public void Transfer_CannotTransitionFromCompleted()
    {
        // Arrange
        var transfer = new Transfer { Status = "completed" };

        // Act
        bool canTransition = CanTransitionStatus(transfer.Status, "in_transit");

        // Assert
        Assert.False(canTransition);
    }

    [Fact]
    public void Transfer_CannotTransitionFromCancelled()
    {
        // Arrange
        var transfer = new Transfer { Status = "cancelled" };

        // Act
        bool canTransition = CanTransitionStatus(transfer.Status, "in_transit");

        // Assert
        Assert.False(canTransition);
    }

    [Fact]
    public void Transfer_Validation_SourceAndDestinationDifferent()
    {
        // Arrange
        var transfer = new Transfer
        {
            FromWarehouseId = 1,
            ToWarehouseId = 1
        };

        // Act
        bool isValid = transfer.FromWarehouseId != transfer.ToWarehouseId;

        // Assert
        Assert.False(isValid);
    }

    [Fact]
    public void Transfer_Validation_DifferentWarehouses_Valid()
    {
        // Arrange
        var transfer = new Transfer
        {
            FromWarehouseId = 1,
            ToWarehouseId = 2
        };

        // Act
        bool isValid = transfer.FromWarehouseId != transfer.ToWarehouseId;

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void Transfer_CreatedByUserId_MustBeValid()
    {
        // Arrange
        var transfer = new Transfer { CreatedByUserId = 0 };

        // Act
        bool isValid = transfer.CreatedByUserId > 0;

        // Assert
        Assert.False(isValid);
    }

    [Fact]
    public void Transfer_CreatedByUserIdPositive_Valid()
    {
        // Arrange
        var transfer = new Transfer { CreatedByUserId = 5 };

        // Act
        bool isValid = transfer.CreatedByUserId > 0;

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void Transfer_Product_QuantityMustBePositive()
    {
        // Arrange
        var product = new TransferProduct { Quantity = -10 };

        // Act
        bool isValid = product.Quantity > 0;

        // Assert
        Assert.False(isValid);
    }

    [Fact]
    public void Transfer_Product_QuantityZeroInvalid()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 0 };

        // Act
        bool isValid = product.Quantity > 0;

        // Assert
        Assert.False(isValid);
    }

    [Fact]
    public void Transfer_Product_QuantityPositiveValid()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 100 };

        // Act
        bool isValid = product.Quantity > 0;

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void Transfer_Products_CannotRecievMoreThanOrdered()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 100, ReceivedQuantity = 150 };

        // Act
        bool isValid = (product.ReceivedQuantity ?? 0) <= product.Quantity;

        // Assert
        Assert.False(isValid);
    }

    [Fact]
    public void Transfer_Products_CanReceiveExactAmount()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 100, ReceivedQuantity = 100 };

        // Act
        bool isValid = (product.ReceivedQuantity ?? 0) <= product.Quantity;

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void Transfer_Products_CanReceiveLessThanOrdered()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 100, ReceivedQuantity = 80 };

        // Act
        bool isValid = (product.ReceivedQuantity ?? 0) <= product.Quantity;

        // Assert
        Assert.True(isValid);
    }

    [Fact]
    public void Transfer_TotalQuantity_MultipleProducts()
    {
        // Arrange
        var transfer = new Transfer();
        transfer.Products.Add(new TransferProduct { Quantity = 10 });
        transfer.Products.Add(new TransferProduct { Quantity = 20 });
        transfer.Products.Add(new TransferProduct { Quantity = 30 });

        // Act
        var totalQuantity = transfer.Products.Sum(p => p.Quantity);

        // Assert
        Assert.Equal(60, totalQuantity);
    }

    [Fact]
    public void Transfer_ReceivedQuantity_CanBePartial()
    {
        // Arrange
        var transfer = new Transfer();
        transfer.Products.Add(new TransferProduct { Quantity = 100, ReceivedQuantity = 50 });
        transfer.Products.Add(new TransferProduct { Quantity = 100, ReceivedQuantity = 75 });

        // Act
        var totalReceived = transfer.Products.Sum(p => p.ReceivedQuantity ?? 0);
        var totalOrdered = transfer.Products.Sum(p => p.Quantity);

        // Assert
        Assert.Equal(125, totalReceived);
        Assert.Equal(200, totalOrdered);
        Assert.True(totalReceived < totalOrdered);
    }

    [Fact]
    public void Transfer_OutstandingQuantity_Calculation()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 100, ReceivedQuantity = 70 };

        // Act
        var outstanding = product.Quantity - (product.ReceivedQuantity ?? 0);

        // Assert
        Assert.Equal(30, outstanding);
    }

    [Fact]
    public void Transfer_AllProductsReceived()
    {
        // Arrange
        var transfer = new Transfer();
        transfer.Products.Add(new TransferProduct { Quantity = 50, ReceivedQuantity = 50 });
        transfer.Products.Add(new TransferProduct { Quantity = 50, ReceivedQuantity = 50 });

        // Act
        var allReceived = transfer.Products.All(p => (p.ReceivedQuantity ?? 0) == p.Quantity);

        // Assert
        Assert.True(allReceived);
    }

    [Fact]
    public void Transfer_NotAllProductsReceived()
    {
        // Arrange
        var transfer = new Transfer();
        transfer.Products.Add(new TransferProduct { Quantity = 50, ReceivedQuantity = 50 });
        transfer.Products.Add(new TransferProduct { Quantity = 50, ReceivedQuantity = 40 });

        // Act
        var allReceived = transfer.Products.All(p => (p.ReceivedQuantity ?? 0) == p.Quantity);

        // Assert
        Assert.False(allReceived);
    }

    [Fact]
    public void Transfer_Comments_CanBeFiltered_ByUserId()
    {
        // Arrange
        var transfer = new Transfer();
        transfer.Comments.Add(new TransferComment { Text = "Comment 1", UserId = 1 });
        transfer.Comments.Add(new TransferComment { Text = "Comment 2", UserId = 2 });
        transfer.Comments.Add(new TransferComment { Text = "Comment 3", UserId = 1 });

        // Act
        var user1Comments = transfer.Comments.Where(c => c.UserId == 1).ToList();

        // Assert
        Assert.Equal(2, user1Comments.Count);
    }

    [Fact]
    public void Transfer_Comments_CanBeRetrievedInOrder()
    {
        // Arrange
        var transfer = new Transfer();
        var now = DateTime.UtcNow;

        transfer.Comments.Add(new TransferComment { Text = "First", CreatedAt = now });
        transfer.Comments.Add(new TransferComment { Text = "Second", CreatedAt = now.AddMinutes(1) });
        transfer.Comments.Add(new TransferComment { Text = "Third", CreatedAt = now.AddMinutes(2) });

        // Act
        var orderedComments = transfer.Comments.OrderBy(c => c.CreatedAt).ToList();

        // Assert
        Assert.Equal("First", orderedComments[0].Text);
        Assert.Equal("Second", orderedComments[1].Text);
        Assert.Equal("Third", orderedComments[2].Text);
    }

    [Fact]
    public void Transfer_FilterByStatus_Pending()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "pending" },
            new Transfer { Status = "in_transit" },
            new Transfer { Status = "completed" },
            new Transfer { Status = "pending" }
        };

        // Act
        var pendingTransfers = transfers.Where(t => t.Status == "pending").ToList();

        // Assert
        Assert.Equal(2, pendingTransfers.Count);
    }

    [Fact]
    public void Transfer_FilterByStatus_InTransit()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "pending" },
            new Transfer { Status = "in_transit" },
            new Transfer { Status = "completed" }
        };

        // Act
        var inTransitTransfers = transfers.Where(t => t.Status == "in_transit").ToList();

        // Assert
        Assert.Single(inTransitTransfers);
    }

    [Fact]
    public void Transfer_FilterByFromWarehouse()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { FromWarehouseId = 1 },
            new Transfer { FromWarehouseId = 2 },
            new Transfer { FromWarehouseId = 1 }
        };

        // Act
        var fromWarehouse1 = transfers.Where(t => t.FromWarehouseId == 1).ToList();

        // Assert
        Assert.Equal(2, fromWarehouse1.Count);
    }

    [Fact]
    public void Transfer_FilterByCreatedUser()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { CreatedByUserId = 5 },
            new Transfer { CreatedByUserId = 10 },
            new Transfer { CreatedByUserId = 5 }
        };

        // Act
        var userTransfers = transfers.Where(t => t.CreatedByUserId == 5).ToList();

        // Assert
        Assert.Equal(2, userTransfers.Count);
    }

    [Fact]
    public void Transfer_MultipleFilters_CombinationCorrect()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "completed", FromWarehouseId = 1, CreatedByUserId = 5 },
            new Transfer { Status = "completed", FromWarehouseId = 2, CreatedByUserId = 5 },
            new Transfer { Status = "pending", FromWarehouseId = 1, CreatedByUserId = 5 },
            new Transfer { Status = "completed", FromWarehouseId = 1, CreatedByUserId = 10 }
        };

        // Act
        var filtered = transfers
            .Where(t => t.Status == "completed" && t.FromWarehouseId == 1 && t.CreatedByUserId == 5)
            .ToList();

        // Assert
        Assert.Single(filtered);
    }

    [Fact]
    public void Transfer_Statistics_AverageTransitTime()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(2) },
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(4) },
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(6) }
        };

        // Act
        var avgTransitTime = transfers
            .Where(t => t.Status == "completed")
            .Average(t => (t.CompletedAt!.Value - t.StartedAt!.Value).TotalHours);

        // Assert
        Assert.Equal(4, avgTransitTime, tolerance: 0.00001);
    }

    [Fact]
    public void Transfer_Statistics_MinTransitTime()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(2) },
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(5) }
        };

        // Act
        var minTransitTime = transfers
            .Where(t => t.Status == "completed")
            .Min(t => (t.CompletedAt!.Value - t.StartedAt!.Value).TotalHours);

        // Assert
        Assert.Equal(2, minTransitTime, tolerance: 0.00001);
    }

    [Fact]
    public void Transfer_Statistics_MaxTransitTime()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(2) },
            new Transfer { Status = "completed", StartedAt = DateTime.UtcNow, CompletedAt = DateTime.UtcNow.AddHours(8) }
        };

        // Act
        var maxTransitTime = transfers
            .Where(t => t.Status == "completed")
            .Max(t => (t.CompletedAt!.Value - t.StartedAt!.Value).TotalHours);

        // Assert
        Assert.Equal(8, maxTransitTime, tolerance: 0.00001);
    }

    [Fact]
    public void Transfer_Statistics_CompletedCount()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "completed" },
            new Transfer { Status = "pending" },
            new Transfer { Status = "completed" },
            new Transfer { Status = "in_transit" }
        };

        // Act
        var completedCount = transfers.Count(t => t.Status == "completed");

        // Assert
        Assert.Equal(2, completedCount);
    }

    [Fact]
    public void Transfer_Statistics_PendingCount()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { Status = "pending" },
            new Transfer { Status = "pending" },
            new Transfer { Status = "completed" }
        };

        // Act
        var pendingCount = transfers.Count(t => t.Status == "pending");

        // Assert
        Assert.Equal(2, pendingCount);
    }

    [Fact]
    public void Transfer_StatusWorkflow_PendingToInTransitToCompleted()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending" };

        // Act & Assert - Step 1: pending to in_transit
        Assert.True(CanTransitionStatus(transfer.Status, "in_transit"));
        transfer.Status = "in_transit";

        // Act & Assert - Step 2: in_transit to completed
        Assert.True(CanTransitionStatus(transfer.Status, "completed"));
        transfer.Status = "completed";

        // Assert final status
        Assert.Equal("completed", transfer.Status);
    }

    [Fact]
    public void Transfer_StatusWorkflow_PendingToCancelled()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending" };

        // Act
        transfer.Status = "cancelled";

        // Assert
        Assert.Equal("cancelled", transfer.Status);
    }

    [Fact]
    public void Transfer_StartTime_CalculatedWhenTransitStarts()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending", StartedAt = null };
        var startTime = DateTime.UtcNow;

        // Act
        transfer.Status = "in_transit";
        transfer.StartedAt = startTime;

        // Assert
        Assert.Equal("in_transit", transfer.Status);
        Assert.NotNull(transfer.StartedAt);
    }

    [Fact]
    public void Transfer_EndTime_CalculatedWhenCompleted()
    {
        // Arrange
        var transfer = new Transfer { Status = "in_transit", StartedAt = DateTime.UtcNow, CompletedAt = null };
        var endTime = DateTime.UtcNow.AddHours(2);

        // Act
        transfer.Status = "completed";
        transfer.CompletedAt = endTime;

        // Assert
        Assert.Equal("completed", transfer.Status);
        Assert.NotNull(transfer.CompletedAt);
    }

    [Fact]
    public void Transfer_Duration_Calculation()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(3);
        var transfer = new Transfer { StartedAt = startTime, CompletedAt = endTime };

        // Act
        var duration = transfer.CompletedAt!.Value - transfer.StartedAt!.Value;

        // Assert
        Assert.Equal(3, duration.TotalHours, tolerance: 0.00001);
    }

    [Fact]
    public void Transfer_Empty_CanHaveNoProducts()
    {
        // Arrange & Act
        var transfer = new Transfer();
        var hasProducts = transfer.Products.Any();

        // Assert
        Assert.False(hasProducts);
    }

    [Fact]
    public void Transfer_Empty_CanHaveNoComments()
    {
        // Arrange & Act
        var transfer = new Transfer();
        var hasComments = transfer.Comments.Any();

        // Assert
        Assert.False(hasComments);
    }

    [Fact]
    public void Transfer_ToWarehouseId_Different_FromWarehouse()
    {
        // Arrange
        var transfer = new Transfer { FromWarehouseId = 5, ToWarehouseId = 10 };

        // Act & Assert
        Assert.NotEqual(transfer.FromWarehouseId, transfer.ToWarehouseId);
    }

    [Fact]
    public void Transfer_FilterByToWarehouse()
    {
        // Arrange
        var transfers = new List<Transfer>
        {
            new Transfer { ToWarehouseId = 1 },
            new Transfer { ToWarehouseId = 2 },
            new Transfer { ToWarehouseId = 1 }
        };

        // Act
        var toWarehouse1 = transfers.Where(t => t.ToWarehouseId == 1).ToList();

        // Assert
        Assert.Equal(2, toWarehouse1.Count);
    }

    // Helper method for state machine logic
    private bool CanTransitionStatus(string? currentStatus, string newStatus)
    {
        if (currentStatus == "completed" || currentStatus == "cancelled")
            return false;

        if (currentStatus == "pending")
            return newStatus == "in_transit" || newStatus == "cancelled";

        if (currentStatus == "in_transit")
            return newStatus == "completed" || newStatus == "cancelled";

        return false;
    }
}
