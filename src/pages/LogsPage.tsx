import React, { useState, useEffect } from 'react';
import type { AuditLog } from '../types';
import { useAuth } from '../contexts/useAuth';
import { useNotification } from '../contexts/useNotification';
import './Pages.css';

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    level: '',
    userId: '',
    warehouseId: ''
  });
  
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
      if (filters.userId) params.append('userId', filters.userId);
      
      // Send logged-in user ID to backend
      if (user?.id) {
        params.append('loggedInUserId', String(user.id));
      }

      const response = await fetch(
        `http://localhost:5000/api/auditlogs?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Ошибка загрузки логов: ${response.statusText}`);
      }

      let data: AuditLog[] = await response.json();

      // Filter by action and entity
      if (filters.action) {
        data = data.filter(log => log.action.includes(filters.action.toUpperCase()));
      }
      if (filters.entity) {
        data = data.filter(log => log.entity.includes(filters.entity));
      }
      if (filters.level) {
        data = data.filter(log => log.level === filters.level);
      }

      // Filter by date range
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        data = data.filter(log => new Date(log.timestamp) >= fromDate);
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        data = data.filter(log => new Date(log.timestamp) <= toDate);
      }

      // Sort by timestamp descending
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(data);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.warehouseId) params.append('warehouseId', filters.warehouseId);
      if (filters.userId) params.append('userId', filters.userId);
      
      // Send logged-in user ID to backend
      if (user?.id) {
        params.append('loggedInUserId', String(user.id));
      }

      const response = await fetch(
        `http://localhost:5000/api/auditlogs/export?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Ошибка при экспорте');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('Логи успешно экспортированы');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка экспорта';
      showError(errorMsg);
    }
  };

  const getLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      'ERROR': '#d32f2f',
      'WARNING': '#f57c00',
      'INFO': '#1976d2',
      'DEBUG': '#7b1fa2'
    };
    return colors[level] || '#666';
  };

  const getLevelBgColor = (level: string): string => {
    const bgColors: Record<string, string> = {
      'ERROR': '#ffebee',
      'WARNING': '#fff3e0',
      'INFO': '#e3f2fd',
      'DEBUG': '#f3e5f5'
    };
    return bgColors[level] || '#f5f5f5';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📋 Журнал аудита</h1>
        <p>История всех операций в системе</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-group">
            <label>Действие:</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              placeholder="CREATE, UPDATE, DELETE..."
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Сущность:</label>
            <input
              type="text"
              value={filters.entity}
              onChange={(e) => setFilters({...filters, entity: e.target.value})}
              placeholder="User, Product, Request..."
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Уровень:</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({...filters, level: e.target.value})}
              className="filter-select"
            >
              <option value="">Все</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>От:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>До:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              className="filter-input"
            />
          </div>

          {user?.role === 'admin' && (
            <div className="filter-group">
              <label>Пользователь ID:</label>
              <input
                type="number"
                value={filters.userId}
                onChange={(e) => setFilters({...filters, userId: e.target.value})}
                placeholder="ID пользователя"
                className="filter-input"
              />
            </div>
          )}

          {(user?.role === 'admin' || user?.role === 'manager') && (
            <div className="filter-group">
              <label>Площадка ID:</label>
              <input
                type="number"
                value={filters.warehouseId}
                onChange={(e) => setFilters({...filters, warehouseId: e.target.value})}
                placeholder="ID площадки"
                className="filter-input"
              />
            </div>
          )}
        </div>

        <div className="filter-actions">
          <button onClick={fetchLogs} className="btn btn-primary">
            Применить фильтры
          </button>
          <button onClick={handleExport} className="btn btn-secondary">
            ⬇️ Экспортировать CSV
          </button>
        </div>
      </div>

      <div className="page-stats">
        <div className="stat-item">
          <span className="stat-label">Всего логов:</span>
          <span className="stat-value">{logs.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">INFO:</span>
          <span className="stat-value">{logs.filter(l => l.level === 'INFO').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">WARNING:</span>
          <span className="stat-value">{logs.filter(l => l.level === 'WARNING').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">ERROR:</span>
          <span className="stat-value">{logs.filter(l => l.level === 'ERROR').length}</span>
        </div>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="loading">Загрузка логов...</div>
        ) : logs.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Действие</th>
                <th>Сущность</th>
                <th>ID Сущности</th>
                <th>Пользователь</th>
                <th>Площадка</th>
                <th>Уровень</th>
                <th>Детали</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} onClick={() => setSelectedLog(log)} className="clickable-row">
                  <td className="timestamp">
                    {new Date(log.timestamp).toLocaleString('ru-RU')}
                  </td>
                  <td className="action">
                    <strong>{log.action}</strong>
                  </td>
                  <td className="entity">
                    <span className="badge">{log.entity}</span>
                  </td>
                  <td className="entity-id">
                    <code>{log.entityId}</code>
                  </td>
                  <td className="user">
                    {log.userName ? `${log.userName}` : `ID: ${log.userId}`}
                  </td>
                  <td className="warehouse">
                    {log.warehouseName ? `${log.warehouseName}` : log.warehouseId ? `ID: ${log.warehouseId}` : '—'}
                  </td>
                  <td className="level">
                    <span
                      style={{
                        color: getLevelColor(log.level),
                        backgroundColor: getLevelBgColor(log.level),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="details" title={log.details}>
                    {log.details?.substring(0, 50)}...
                  </td>
                  <td className="ip-address">{log.ipAddress || '—'}</td>
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
              <h2>📋 Детали записи в журнале аудита</h2>
              <button onClick={() => setSelectedLog(null)} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              {/* Top stats with action and level */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Действие</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLog.action}</p>
                </div>
                <div>
                  <span
                    style={{
                      color: getLevelColor(selectedLog.level),
                      backgroundColor: getLevelBgColor(selectedLog.level),
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'inline-block'
                    }}
                  >
                    {selectedLog.level}
                  </span>
                </div>
              </div>

              {/* Grid layout for main info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-primary)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>ID Записи</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontFamily: '"Monaco", "Courier New", monospace' }}>{selectedLog.id}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Время</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{new Date(selectedLog.timestamp).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Сущность</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>
                    <span style={{ backgroundColor: 'var(--primary-blue-light)', color: 'var(--primary-blue)', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 500 }}>{selectedLog.entity}</span>
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>ID Сущности</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontFamily: '"Monaco", "Courier New", monospace' }}>{selectedLog.entityId || '—'}</p>
                </div>
              </div>

              {/* User and warehouse info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-primary)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Пользователь</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {selectedLog.userName ? (
                      <>
                        <span style={{ display: 'block', marginBottom: '4px' }}>{selectedLog.userName}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: '"Monaco", "Courier New", monospace' }}>ID: {selectedLog.userId}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: '"Monaco", "Courier New", monospace' }}>ID: {selectedLog.userId || '—'}</span>
                    )}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>Площадка</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {selectedLog.warehouseName ? (
                      <>
                        <span style={{ display: 'block', marginBottom: '4px' }}>{selectedLog.warehouseName}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: '"Monaco", "Courier New", monospace' }}>ID: {selectedLog.warehouseId}</span>
                      </>
                    ) : (
                      <span style={{ fontFamily: '"Monaco", "Courier New", monospace' }}>ID: {selectedLog.warehouseId || '—'}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* IP and additional info */}
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>IP Адрес</p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontFamily: '"Monaco", "Courier New", monospace' }}>{selectedLog.ipAddress || '—'}</p>
              </div>

              {/* Details section */}
              {selectedLog.details && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-primary)' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>Детали операции</p>
                  <div style={{
                    backgroundColor: 'var(--surface-secondary)',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    fontFamily: '"Monaco", "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {selectedLog.details}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
