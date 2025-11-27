import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Вход в систему</h1>
        <p className="auth-subtitle">Складской учёт АБЗ ВАД</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              disabled={isLoading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>

        <div className="auth-links">
          <p>Нет учётной записи? <a href="/register">Зарегистрироваться</a></p>
        </div>

        <div className="test-users">
          <p className="test-title">Тестовые учётные данные:</p>
          <ul>
            <li><strong>warehouseman1</strong> - password (Складовщик)</li>
            <li><strong>manager1</strong> - password (Менеджер)</li>
            <li><strong>admin</strong> - password (Администратор)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
