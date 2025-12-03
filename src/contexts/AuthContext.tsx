import React, { useState, useEffect, type ReactNode } from 'react';
import type { User, AuthSession } from '../types';
import { apiService } from '../services/apiService';
import { AuthContext, type AuthContextType } from './AuthContextType';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверка сессии при загрузке приложения
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedSession = localStorage.getItem('authSession');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          const expiresAt = new Date(parsedSession.expiresAt);
          
          if (expiresAt > new Date()) {
            // Восстанавливаем сессию и token
            apiService.setToken(parsedSession.token);
            setSession(parsedSession);
            setUser(parsedSession.user);
          } else {
            // Сессия истекла
            localStorage.removeItem('authSession');
          }
        }
      } catch {
        // Ошибка при восстановлении сессии, пропускаем
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const newSession = await apiService.login(username, password);
    apiService.setToken(newSession.token);
    setSession(newSession);
    setUser(newSession.user);
    localStorage.setItem('authSession', JSON.stringify(newSession));
  };

  const logout = async () => {
    try {
      // Обновляем статус online перед выходом
      if (user?.id) {
        await apiService.logoutUser(user.id);
      }
      await apiService.logout();
      setUser(null);
      setSession(null);
      localStorage.removeItem('authSession');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      // Всё равно выходим, даже если ошибка
      setUser(null);
      setSession(null);
      localStorage.removeItem('authSession');
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    role: string,
    firstName?: string,
    lastName?: string
  ) => {
    // TODO: Добавить endpoint регистрации на backend
    console.log('Регистрация:', { username, email, password, role, firstName, lastName });
  };

  const refreshUser = async () => {
    if (user?.id) {
      try {
        const updatedUser = await apiService.getUser(user.id);
        if (updatedUser) {
          setUser(updatedUser);
          // Обновляем и в сессии
          if (session) {
            const updatedSession = { ...session, user: updatedUser };
            setSession(updatedSession);
            localStorage.setItem('authSession', JSON.stringify(updatedSession));
          }
        }
      } catch (error) {
        console.error('Ошибка при обновлении пользователя:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    session,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
