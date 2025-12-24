'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WebmailThemeProvider } from '@/contexts/WebmailThemeContext';

export default function AdminCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth/verify');
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/admin/login');
        }
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <WebmailThemeProvider>
      <div className="h-screen bg-white overflow-hidden">
        {children}
      </div>
    </WebmailThemeProvider>
  );
}
