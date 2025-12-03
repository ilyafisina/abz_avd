import { createContext } from 'react';
import type { User, AuthSession } from '../types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string, role: string, firstName?: string, lastName?: string) => Promise<void>;
  session: AuthSession | null;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
