using WarehouseAPI.Models;

namespace WarehouseAPI.Services;

/// <summary>
/// Сервис для проверки прав доступа пользователей.
/// Содержит всю бизнес-логику авторизации.
/// </summary>
public interface IAuthorizationService
{
    /// <summary>
    /// Проверить, может ли пользователь удалять товары (только админ).
    /// </summary>
    bool CanUserDeleteProduct(User user);

    /// <summary>
    /// Проверить, может ли пользователь получить доступ к определённой площадке.
    /// Админ может видеть все, обычный пользователь - только свою.
    /// </summary>
    bool CanUserAccessWarehouse(User user, int requestedWarehouseId);
}

/// <summary>
/// Реализация сервиса авторизации.
/// </summary>
public class AuthorizationService : IAuthorizationService
{
    /// <summary>
    /// Проверить, может ли пользователь удалять товары.
    /// Удалять товары может только администратор.
    /// </summary>
    public bool CanUserDeleteProduct(User user)
    {
        if (user == null)
            return false;

        return user.Role == "admin";
    }

    /// <summary>
    /// Проверить, может ли пользователь получить доступ к площадке.
    /// - Администратор может видеть все площадки (WarehouseId == null)
    /// - Обычный пользователь может видеть только свою площадку
    /// </summary>
    public bool CanUserAccessWarehouse(User user, int requestedWarehouseId)
    {
        if (user == null)
            return false;

        // Админ имеет доступ ко всем площадкам
        if (user.Role == "admin" && user.WarehouseId == null)
            return true;

        // Обычный пользователь может видеть только свою площадку
        if (user.WarehouseId.HasValue)
            return user.WarehouseId.Value == requestedWarehouseId;

        return false;
    }
}
