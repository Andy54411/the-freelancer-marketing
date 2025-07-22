'use client';

import { useState, useEffect, createContext, useContext } from 'react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'support' | 'manager' | 'readonly';
  department: string;
  permissions: string[];
}

interface StaffAuthContextType {
  user: StaffUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/staff');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'logout',
        }),
      });

      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin' || false;
  };

  const isManager = (): boolean => {
    return user?.role === 'admin' || user?.role === 'manager' || false;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin,
    isManager,
  };

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
}

// Hilfsfunktionen
export const staffPermissions = {
  EMAIL_READ: 'email_read',
  EMAIL_WRITE: 'email_write',
  EMAIL_ASSIGN: 'email_assign',
  STAFF_VIEW: 'staff_view',
  STAFF_MANAGE: 'staff_manage',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export const staffRoles = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPPORT: 'support',
  READONLY: 'readonly',
} as const;
