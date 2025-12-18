namespace WarehouseAPI.Services;

/// <summary>
/// Сервис для проверки валидности переходов между статусами заявок.
/// Содержит всю бизнес-логику конечного автомата статусов.
/// </summary>
public interface IRequestStatusService
{
    /// <summary>
    /// Проверить, является ли переход между статусами валидным.
    /// </summary>
    bool IsValidStatusTransition(string currentStatus, string nextStatus);

    /// <summary>
    /// Получить все допустимые статусы для переданного статуса.
    /// </summary>
    List<string> GetAllowedNextStatuses(string currentStatus);

    /// <summary>
    /// Получить описание статуса.
    /// </summary>
    string GetStatusDescription(string status);
}

/// <summary>
/// Реализация сервиса валидации статусов.
/// Определяет все возможные переходы между статусами заявок.
/// </summary>
public class RequestStatusService : IRequestStatusService
{
    /// <summary>
    /// Все допустимые переходы между статусами.
    /// Ключ - текущий статус, значение - список допустимых следующих статусов.
    /// </summary>
    private readonly Dictionary<string, List<string>> _validTransitions = new()
    {
        // Черновик: начальное состояние
        { "черновик", new List<string> { "на_согласовании", "отменено" } },

        // На согласовании: ожидание одобрения
        { "на_согласовании", new List<string> { "одобрено", "отменено", "черновик" } },

        // Одобрено: подготовка к отправке
        { "одобрено", new List<string> { "в_пути", "отменено" } },

        // В пути: товар в пути до получателя
        { "в_пути", new List<string> { "на_приемке", "отменено" } },

        // На приемке: товар получен, ожидает приёмки
        { "на_приемке", new List<string> { "завершено", "отменено" } },

        // Завершено: конечное состояние - успешно завершено
        { "завершено", new List<string>() },

        // Отменено: конечное состояние - отменено
        { "отменено", new List<string>() }
    };

    /// <summary>
    /// Словарь описаний статусов для пользователя.
    /// </summary>
    private readonly Dictionary<string, string> _statusDescriptions = new()
    {
        { "черновик", "Черновик - заявка находится в режиме редактирования" },
        { "на_согласовании", "На согласовании - заявка ожидает одобрения администратора" },
        { "одобрено", "Одобрено - заявка одобрена, товары зарезервированы" },
        { "в_пути", "В пути - товары отправлены и находятся в пути" },
        { "на_приемке", "На приемке - товары прибыли и ожидают приёмки" },
        { "завершено", "Завершено - перемещение успешно завершено" },
        { "отменено", "Отменено - заявка была отменена" }
    };

    /// <summary>
    /// Проверить, является ли переход между статусами валидным.
    /// </summary>
    public bool IsValidStatusTransition(string currentStatus, string nextStatus)
    {
        // Проверяем, существует ли текущий статус в словаре
        if (!_validTransitions.ContainsKey(currentStatus))
            return false;

        // Проверяем, есть ли требуемый следующий статус в списке допустимых
        return _validTransitions[currentStatus].Contains(nextStatus);
    }

    /// <summary>
    /// Получить все допустимые статусы для переданного статуса.
    /// </summary>
    public List<string> GetAllowedNextStatuses(string currentStatus)
    {
        if (!_validTransitions.ContainsKey(currentStatus))
            return new List<string>();

        return _validTransitions[currentStatus];
    }

    /// <summary>
    /// Получить описание статуса.
    /// </summary>
    public string GetStatusDescription(string status)
    {
        return _statusDescriptions.TryGetValue(status, out var description)
            ? description
            : "Неизвестный статус";
    }
}
