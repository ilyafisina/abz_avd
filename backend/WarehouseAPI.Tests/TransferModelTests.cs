using Xunit;
using WarehouseAPI.Models;

namespace WarehouseAPI.Tests;

public class TransferModelTests
{
    [Fact]
    public void Transfer_Initialize_WithEmptyCollections()
    {
        // Arrange & Act
        var transfer = new Transfer();

        // Assert
        Assert.NotNull(transfer.Products);
        Assert.NotNull(transfer.Comments);
        Assert.Empty(transfer.Products);
        Assert.Empty(transfer.Comments);
    }

    [Fact]
    public void Transfer_Status_DefaultValue()
    {
        // Arrange & Act
        var transfer = new Transfer();

        // Assert
        Assert.Equal("pending", transfer.Status);
    }

    [Fact]
    public void Transfer_Status_SetAndRetrieve()
    {
        // Arrange
        var transfer = new Transfer { Status = "pending" };

        // Assert
        Assert.Equal("pending", transfer.Status);
    }

    [Fact]
    public void Transfer_Timestamps_DefaultUtcNow()
    {
        // Arrange
        var beforeCreation = DateTime.UtcNow;

        // Act
        var transfer = new Transfer();

        var afterCreation = DateTime.UtcNow;

        // Assert
        Assert.True(transfer.CreatedAt >= beforeCreation);
        Assert.True(transfer.CreatedAt <= afterCreation);
    }

    [Fact]
    public void Transfer_Timestamps_StartedAndCompletedNull()
    {
        // Arrange & Act
        var transfer = new Transfer();

        // Assert
        Assert.Null(transfer.StartedAt);
        Assert.Null(transfer.CompletedAt);
    }

    [Fact]
    public void Transfer_Timestamps_SetValues()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(5);
        var transfer = new Transfer { StartedAt = startTime, CompletedAt = endTime };

        // Assert
        Assert.Equal(startTime, transfer.StartedAt);
        Assert.Equal(endTime, transfer.CompletedAt);
    }

    [Fact]
    public void Transfer_CreatedByUserId_SetAndRetrieve()
    {
        // Arrange
        var transfer = new Transfer { CreatedByUserId = 42 };

        // Assert
        Assert.Equal(42, transfer.CreatedByUserId);
    }

    [Fact]
    public void Transfer_FromWarehouseId_SetAndRetrieve()
    {
        // Arrange
        var transfer = new Transfer { FromWarehouseId = 1 };

        // Assert
        Assert.Equal(1, transfer.FromWarehouseId);
    }

    [Fact]
    public void Transfer_ToWarehouseId_SetAndRetrieve()
    {
        // Arrange
        var transfer = new Transfer { ToWarehouseId = 2 };

        // Assert
        Assert.Equal(2, transfer.ToWarehouseId);
    }

    [Fact]
    public void Transfer_AddProduct_ToCollection()
    {
        // Arrange
        var transfer = new Transfer();
        var product = new TransferProduct { ProductId = 1, Quantity = 10 };

        // Act
        transfer.Products.Add(product);

        // Assert
        Assert.Single(transfer.Products);
        Assert.Equal(1, transfer.Products.First().ProductId);
    }

    [Fact]
    public void Transfer_AddComment_ToCollection()
    {
        // Arrange
        var transfer = new Transfer();
        var comment = new TransferComment { Text = "Test comment", UserId = 1 };

        // Act
        transfer.Comments.Add(comment);

        // Assert
        Assert.Single(transfer.Comments);
        Assert.Equal("Test comment", transfer.Comments.First().Text);
    }

    [Fact]
    public void Transfer_MultipleProducts_AllAdded()
    {
        // Arrange
        var transfer = new Transfer();

        // Act
        transfer.Products.Add(new TransferProduct { ProductId = 1, Quantity = 5 });
        transfer.Products.Add(new TransferProduct { ProductId = 2, Quantity = 10 });
        transfer.Products.Add(new TransferProduct { ProductId = 3, Quantity = 15 });

        // Assert
        Assert.Equal(3, transfer.Products.Count);
    }

    [Fact]
    public void Transfer_MultipleComments_AllAdded()
    {
        // Arrange
        var transfer = new Transfer();

        // Act
        transfer.Comments.Add(new TransferComment { Text = "Comment 1", UserId = 1 });
        transfer.Comments.Add(new TransferComment { Text = "Comment 2", UserId = 2 });

        // Assert
        Assert.Equal(2, transfer.Comments.Count);
    }

    [Fact]
    public void TransferProduct_DefaultValues()
    {
        // Arrange & Act
        var product = new TransferProduct();

        // Assert
        Assert.Equal(0, product.Quantity);
        Assert.Null(product.ReceivedQuantity);
    }

    [Fact]
    public void TransferProduct_SetQuantity()
    {
        // Arrange & Act
        var product = new TransferProduct { Quantity = 50 };

        // Assert
        Assert.Equal(50, product.Quantity);
    }

    [Fact]
    public void TransferProduct_SetReceivedQuantity()
    {
        // Arrange & Act
        var product = new TransferProduct { ReceivedQuantity = 30 };

        // Assert
        Assert.Equal(30, product.ReceivedQuantity);
    }

    [Fact]
    public void TransferProduct_ReceivedQuantityNullable()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 50, ReceivedQuantity = null };

        // Act & Assert
        Assert.Null(product.ReceivedQuantity);
        Assert.Equal(50, product.Quantity);
    }

    [Fact]
    public void TransferProduct_ProductId_SetAndRetrieve()
    {
        // Arrange & Act
        var product = new TransferProduct { ProductId = 123 };

        // Assert
        Assert.Equal(123, product.ProductId);
    }

    [Fact]
    public void TransferProduct_TransferId_SetAndRetrieve()
    {
        // Arrange & Act
        var product = new TransferProduct { TransferId = 456 };

        // Assert
        Assert.Equal(456, product.TransferId);
    }

    [Fact]
    public void TransferComment_SetText()
    {
        // Arrange & Act
        var comment = new TransferComment { Text = "Test comment" };

        // Assert
        Assert.Equal("Test comment", comment.Text);
    }

    [Fact]
    public void TransferComment_SetUserId()
    {
        // Arrange & Act
        var comment = new TransferComment { UserId = 99 };

        // Assert
        Assert.Equal(99, comment.UserId);
    }

    [Fact]
    public void TransferComment_SetTransferId()
    {
        // Arrange & Act
        var comment = new TransferComment { TransferId = 777 };

        // Assert
        Assert.Equal(777, comment.TransferId);
    }

    [Fact]
    public void TransferComment_CreatedAt_DefaultUtcNow()
    {
        // Arrange
        var beforeCreation = DateTime.UtcNow;

        // Act
        var comment = new TransferComment();

        var afterCreation = DateTime.UtcNow;

        // Assert
        Assert.True(comment.CreatedAt >= beforeCreation);
        Assert.True(comment.CreatedAt <= afterCreation);
    }

    [Fact]
    public void TransferComment_SetCreatedAt()
    {
        // Arrange
        var customTime = DateTime.UtcNow.AddDays(-5);

        // Act
        var comment = new TransferComment { CreatedAt = customTime };

        // Assert
        Assert.Equal(customTime, comment.CreatedAt);
    }

    [Fact]
    public void Transfer_AllPropertiesSetCorrectly()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(2);

        // Act
        var transfer = new Transfer
        {
            Id = 1,
            Status = "completed",
            CreatedByUserId = 5,
            FromWarehouseId = 1,
            ToWarehouseId = 2,
            StartedAt = startTime,
            CompletedAt = endTime
        };

        // Assert
        Assert.Equal(1, transfer.Id);
        Assert.Equal("completed", transfer.Status);
        Assert.Equal(5, transfer.CreatedByUserId);
        Assert.Equal(1, transfer.FromWarehouseId);
        Assert.Equal(2, transfer.ToWarehouseId);
        Assert.Equal(startTime, transfer.StartedAt);
        Assert.Equal(endTime, transfer.CompletedAt);
    }

    [Theory]
    [InlineData("pending")]
    [InlineData("in_transit")]
    [InlineData("completed")]
    [InlineData("cancelled")]
    public void Transfer_ValidStatuses(string status)
    {
        // Arrange & Act
        var transfer = new Transfer { Status = status };

        // Assert
        Assert.Equal(status, transfer.Status);
    }

    [Fact]
    public void Transfer_Empty_HasNoProducts()
    {
        // Arrange & Act
        var transfer = new Transfer();

        // Assert
        Assert.Empty(transfer.Products);
    }

    [Fact]
    public void Transfer_Empty_HasNoComments()
    {
        // Arrange & Act
        var transfer = new Transfer();

        // Assert
        Assert.Empty(transfer.Comments);
    }

    [Fact]
    public void TransferProduct_QuantityZero()
    {
        // Arrange & Act
        var product = new TransferProduct { Quantity = 0 };

        // Assert
        Assert.Equal(0, product.Quantity);
    }

    [Fact]
    public void TransferProduct_ReceivePartial()
    {
        // Arrange
        var product = new TransferProduct { Quantity = 100 };

        // Act
        product.ReceivedQuantity = 75;

        // Assert
        Assert.Equal(100, product.Quantity);
        Assert.Equal(75, product.ReceivedQuantity);
    }

    [Fact]
    public void TransferComment_EmptyText()
    {
        // Arrange & Act
        var comment = new TransferComment { Text = "" };

        // Assert
        Assert.Empty(comment.Text);
    }

    [Fact]
    public void Transfer_WithAllFields_Complete()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var transfer = new Transfer
        {
            Id = 10,
            Status = "completed",
            CreatedByUserId = 7,
            FromWarehouseId = 3,
            ToWarehouseId = 4,
            StartedAt = now,
            CompletedAt = now.AddHours(3)
        };

        transfer.Products.Add(new TransferProduct { ProductId = 100, Quantity = 50, ReceivedQuantity = 50 });
        transfer.Comments.Add(new TransferComment { Text = "All received", UserId = 7 });

        // Assert
        Assert.Equal(10, transfer.Id);
        Assert.Equal("completed", transfer.Status);
        Assert.Equal(7, transfer.CreatedByUserId);
        Assert.Single(transfer.Products);
        Assert.Single(transfer.Comments);
    }

    [Fact]
    public void Transfer_DifferentWarehouses()
    {
        // Arrange
        var transfer = new Transfer { FromWarehouseId = 1, ToWarehouseId = 2 };

        // Assert
        Assert.NotEqual(transfer.FromWarehouseId, transfer.ToWarehouseId);
    }

    [Fact]
    public void Transfer_UpdatedAt_DefaultUtcNow()
    {
        // Arrange
        var beforeCreation = DateTime.UtcNow;

        // Act
        var transfer = new Transfer();

        var afterCreation = DateTime.UtcNow;

        // Assert
        Assert.True(transfer.UpdatedAt >= beforeCreation);
        Assert.True(transfer.UpdatedAt <= afterCreation);
    }

    [Fact]
    public void Transfer_CreatedAtAndUpdatedAtTogether()
    {
        // Arrange & Act
        var transfer = new Transfer();

        // Assert - DateTime is value type, just verify they exist and are close
        Assert.True(transfer.CreatedAt != DateTime.MinValue);
        Assert.True(transfer.UpdatedAt != DateTime.MinValue);
        Assert.True(Math.Abs((transfer.UpdatedAt - transfer.CreatedAt).TotalMilliseconds) < 1000);
    }
}
