'use client';

import React, { useEffect, Suspense, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Loader2 as FiLoader } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'employee';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Skip auth check for login page
  const isLoginPage = pathname === '/dashboard/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    checkAdminAuth();
  }, [isLoginPage]);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      if (response.ok) {
        const data = await response.json();
        setUser(data.employee);
        console.log(
          `[AdminLayout] Admin auth success: ${data.employee.name} (${data.employee.role})`
        );
      } else {
        console.log('[AdminLayout] No admin auth found. Redirecting to admin login.');
        router.replace('/dashboard/admin/login');
      }
    } catch (error) {
      console.error('[AdminLayout] Admin auth check failed:', error);
      router.replace('/dashboard/admin/login');
    } finally {
      setLoading(false);
    }
  };

  // If it's the login page, render it without auth check
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <FiLoader className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Header />
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <FiLoader className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          }
        >
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </Suspense>
      </div>
    </div>
  );
}
