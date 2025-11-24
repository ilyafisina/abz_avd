using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Models;

namespace WarehouseAPI.Data;

public class WarehouseContext : DbContext
{
    public WarehouseContext(DbContextOptions<WarehouseContext> options) : base(options)
    {
    }

    public DbSet<Warehouse> Warehouses { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Request> Requests { get; set; }
    public DbSet<Transfer> Transfers { get; set; }
    public DbSet<TransferProduct> TransferProducts { get; set; }
    public DbSet<TransferComment> TransferComments { get; set; }
    public DbSet<Log> Logs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Warehouse configuration
        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Location).HasMaxLength(500).IsRequired();
        });

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Username).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Warehouse).HasMaxLength(50);
            
            entity.HasOne(e => e.WarehouseNavigation)
                .WithMany(w => w.Users)
                .HasForeignKey(e => e.Warehouse)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            entity.HasMany(e => e.CreatedTransfers)
                .WithOne(t => t.CreatedByUser)
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Comments)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            
            entity.HasMany(e => e.Products)
                .WithOne(p => p.Category)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Product configuration
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Sku).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Price).HasPrecision(10, 2);
            entity.Property(e => e.Barcode).HasMaxLength(100);
            entity.Property(e => e.QrCode).HasMaxLength(500);
            entity.Property(e => e.Warehouse).HasMaxLength(50).IsRequired();

            entity.HasOne(e => e.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.WarehouseNavigation)
                .WithMany(w => w.Products)
                .HasForeignKey(e => e.Warehouse)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            entity.HasMany(e => e.TransferProducts)
                .WithOne(tp => tp.Product)
                .HasForeignKey(tp => tp.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Transfer configuration
        modelBuilder.Entity<Transfer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();

            entity.HasOne(e => e.CreatedByUser)
                .WithMany(u => u.CreatedTransfers)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.FromWarehouseNavigation)
                .WithMany(w => w.OutgoingTransfers)
                .HasForeignKey(e => e.FromWarehouse)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            entity.HasOne(e => e.ToWarehouseNavigation)
                .WithMany(w => w.IncomingTransfers)
                .HasForeignKey(e => e.ToWarehouse)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            entity.HasMany(e => e.Products)
                .WithOne(tp => tp.Transfer)
                .HasForeignKey(tp => tp.TransferId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Comments)
                .WithOne(c => c.Transfer)
                .HasForeignKey(c => c.TransferId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TransferProduct configuration
        modelBuilder.Entity<TransferProduct>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.HasOne(e => e.Transfer)
                .WithMany(t => t.Products)
                .HasForeignKey(e => e.TransferId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Product)
                .WithMany(p => p.TransferProducts)
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // TransferComment configuration
        modelBuilder.Entity<TransferComment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).HasMaxLength(2000).IsRequired();

            entity.HasOne(e => e.Transfer)
                .WithMany(t => t.Comments)
                .HasForeignKey(e => e.TransferId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Comments)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Log configuration
        modelBuilder.Entity<Log>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Details).HasMaxLength(1000);
            entity.Property(e => e.IpAddress).HasMaxLength(50).IsRequired();
        });

        // Request configuration
        modelBuilder.Entity<Request>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Warehouse).HasMaxLength(50).IsRequired();
            entity.Property(e => e.TransferWarehouse).HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasOne(e => e.WarehouseNavigation)
                .WithMany(w => w.Requests)
                .HasForeignKey(e => e.Warehouse)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            entity.HasOne(e => e.TransferWarehouseNavigation)
                .WithMany()
                .HasForeignKey(e => e.TransferWarehouse)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);
        });

        // Seed initial data
        SeedData(modelBuilder);
    }

    private void SeedData(ModelBuilder modelBuilder)
    {
        // Seed Warehouses
        modelBuilder.Entity<Warehouse>().HasData(
            new Warehouse { Id = "zone-a", Name = "Площадка А", Location = "ул. Логистическая, д. 1, Москва" },
            new Warehouse { Id = "zone-b", Name = "Площадка Б", Location = "ул. Промышленная, д. 42, СПб" },
            new Warehouse { Id = "zone-c", Name = "Площадка В", Location = "ул. Торговая, д. 15, Казань" }
        );

        // Seed Categories
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Материалы", Description = "Строительные материалы" },
            new Category { Id = 2, Name = "Инструменты", Description = "Инструменты и оборудование" },
            new Category { Id = 3, Name = "Прочее", Description = "Прочие товары" }
        );
    }
}
