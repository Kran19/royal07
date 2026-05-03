'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiService } from '@/lib/api/api-service';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
    if (pathname.startsWith('/admin')) {
      router.push('/admin/login'); 
    }
  }, [pathname, router]);

  const refreshProfile = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUserRaw) {
      try {
        const cachedUser = JSON.parse(storedUserRaw) as User;
        setToken(storedToken);
        setUser(cachedUser);
      } catch (parseError) {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    try {
      const res = await apiService.getProfile();
      if (res.success && res.data) {
        setToken(storedToken);
        setUser(res.data);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data));
      } else {
        const code = res.error?.code || '';
        if (code.startsWith('AUTH')) {
          logout();
        }
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      // Keep the cached session when profile fetch fails transiently
      // (common on unstable tunnels/devices).
      if (!storedUserRaw) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
    if (!isLoading && isAdminRoute) {
      if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
        router.push('/admin/login');
      }
    }
  }, [isLoading, user, pathname, router]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoggedIn: !!user, 
      isLoading, 
      login, 
      logout,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
