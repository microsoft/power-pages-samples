import { useState, useEffect, useCallback } from 'react';
import type { PowerPagesUser } from '../types/powerPages';
import {
  getCurrentUser,
  isAuthenticated as checkAuth,
  getUserDisplayName,
  getUserInitials,
  login as authLogin,
  logout as authLogout,
} from '../services/authService';

interface UseAuthReturn {
  user: PowerPagesUser | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  displayName: string;
  initials: string;
  login: (returnUrl?: string) => Promise<void>;
  logout: (returnUrl?: string) => void;
  refresh: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<PowerPagesUser | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    user,
    isAuthenticated: checkAuth(),
    isLoading,
    displayName: getUserDisplayName(),
    initials: getUserInitials(),
    login: authLogin,
    logout: authLogout,
    refresh,
  };
}
