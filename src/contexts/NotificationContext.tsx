import React, { createContext, useCallback, useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: NotificationType, message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((
    type: NotificationType,
    message: string,
    duration: number = 4000
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, type, message, duration };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => removeNotification(id), duration);
    }
  }, [removeNotification]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    addNotification('success', message, duration);
  }, [addNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    addNotification('error', message, duration);
  }, [addNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    addNotification('info', message, duration);
  }, [addNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    addNotification('warning', message, duration);
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        showSuccess,
        showError,
        showInfo,
        showWarning,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
