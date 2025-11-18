import React, { useState, useEffect, type ReactNode } from 'react';
import type { User, AuthSession } from '../types';
import { authService } from '../services/mockService';
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
    const newSession = await authService.login(username, password);
    setSession(newSession);
    setUser(newSession.user);
    localStorage.setItem('authSession', JSON.stringify(newSession));
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setSession(null);
      localStorage.removeItem('authSession');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
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
    const newUser = await authService.register(
      username,
      email,
      password,
      role as Parameters<typeof authService.register>[3],
      firstName,
      lastName
    );
    // После регистрации можно автоматически залогинить пользователя
    // или перенаправить на страницу входа
    console.log('Пользователь зарегистрирован:', newUser);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
