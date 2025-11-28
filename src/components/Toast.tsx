import React from 'react';
import { useNotification } from '../contexts/useNotification';
import './Toast.css';

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface ToastProps {
  notification: {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  };
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '•';
    }
  };

  return (
    <div className={`toast toast-${notification.type}`} role="alert">
      <div className="toast-icon">{getIcon(notification.type)}</div>
      <div className="toast-content">
        <p className="toast-message">{notification.message}</p>
      </div>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Закрыть уведомление"
      >
        ✕
      </button>
    </div>
  );
};
