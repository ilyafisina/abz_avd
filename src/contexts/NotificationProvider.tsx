import React from 'react';
import { NotificationProvider } from './NotificationContext';

export const NotificationProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <NotificationProvider>{children}</NotificationProvider>;
};
