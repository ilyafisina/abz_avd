import { useState, useEffect, useCallback } from 'react';
import type { SystemLog } from '../types';
import { apiService } from '../services/apiService';
import './Pages.css';

export const LogsPage = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const data = await apiService.getLogs();
    setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  let filteredLogs = logs.filter(log => {
    const matchUser = filterUser === 'all' || log.userId === filterUser;
    const matchEntity = filterEntity === 'all' || log.entityType === filterEntity;
    const matchSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    return matchUser && matchEntity && matchSearch;
  });

  // Сортировка по времени (новые первыми)
  filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const users = Array.from(new Set(logs.map(l => l.userId)));
  const entities = Array.from(new Set(logs.map(l => l.entityType)));

  const getActionIcon = (action: string): string => {
    if (action.includes('Создание')) return '➕';
    if (action.includes('Удаление')) return '🗑️';
    if (action.includes('Редактирование')) return '✏️';
    if (action.includes('Просмотр')) return '👁️';
    if (action.includes('Одобрение')) return '✓';
    if (action.includes('Отклонение')) return '✗';
    return '📝';
  };

  if (loading) {
    return <div className="page-container"><div className="loading">Загрузка логов...</div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📋 Журнал логирования</h1>
        <p>История всех операций в системе</p>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Поиск по пользователю или действию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="filter-select">
            <option value="all">Все пользователи</option>
            {users.map(userId => {
              const userLog = logs.find(l => l.userId === userId);
              return userLog ? <option key={userId} value={userId}>{userLog.userName}</option> : null;
            })}
          </select>
        </div>
        <div className="filter-group">
          <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className="filter-select">
            <option value="all">Все сущности</option>
            {entities.map(entity => (
              <option key={entity} value={entity}>
                {entity === 'product' ? 'Товары' : entity === 'request' ? 'Заявки' : entity === 'user' ? 'Пользователи' : entity === 'warehouse' ? 'Склад' : 'Другое'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Всего операций:</span>
          <span className="stat-value">{filteredLogs.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Сегодня:</span>
          <span className="stat-value">
            {filteredLogs.filter(l => {
              const today = new Date().toDateString();
              return new Date(l.timestamp).toDateString() === today;
            }).length}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Уникальных пользователей:</span>
          <span className="stat-value">{Array.from(new Set(filteredLogs.map(l => l.userId))).length}</span>
        </div>
      </div>

      <div className="table-wrapper">
        {filteredLogs.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Пользователь</th>
                <th>Действие</th>
                <th>Сущность</th>
                <th>ID сущности</th>
                <th>IP адрес</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className="clickable-row">
                  <td>{new Date(log.timestamp).toLocaleString('ru-RU')}</td>
                  <td>{log.userName}</td>
                  <td>
                    <span>{getActionIcon(log.action)} {log.action}</span>
                  </td>
                  <td>
                      <span className={`entity-badge ${log.entityType || 'other'}`}>
                        {log.entityType === 'product' ? 'Товар' : 
                         log.entityType === 'request' ? 'Заявка' : 
                         log.entityType === 'user' ? 'Пользователь' : 
                         log.entityType === 'warehouse' ? 'Склад' : 'Другое'}
                      </span>
                  </td>
                  <td>
                    <code>{log.entityId}</code>
                  </td>
                  <td>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>📭 Логи не найдены</p>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Детали логирования</h2>
              <button onClick={() => setSelectedLog(null)} className="modal-close">✕</button>
            </div>
              <div className="modal-body">
              <div className="grid-2">
                <div>
                  <p><strong>ID:</strong> {selectedLog.id}</p>
                  <p><strong>Пользователь:</strong> {selectedLog.userName}</p>
                  <p><strong>ID пользователя:</strong> {selectedLog.userId}</p>
                  <p><strong>Действие:</strong> {selectedLog.action}</p>
                </div>
                <div>
                  <p><strong>Тип сущности:</strong> {selectedLog.entityType}</p>
                  <p><strong>ID сущности:</strong> {selectedLog.entityId}</p>
                  <p><strong>Время:</strong> {new Date(selectedLog.timestamp).toLocaleString('ru-RU')}</p>
                  <p><strong>IP адрес:</strong> {selectedLog.ipAddress || '—'}</p>
                </div>
              </div>
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div className="mt-16">
                  <p><strong>Изменения:</strong></p>
                  <pre className="pre-block">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
