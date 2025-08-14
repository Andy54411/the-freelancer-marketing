// Admin Dashboard Layout
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Building2,
  Mail,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  Ticket,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';

interface AdminUser {
  email: string;
  name: string;
  role: string;
  id: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Übersicht', href: '/dashboard/admin', icon: BarChart3 },
  { name: 'Workspace', href: '/dashboard/admin/workspace', icon: Briefcase },
  { name: 'Tickets', href: '/dashboard/admin/tickets', icon: Ticket },
  { name: 'Enhanced Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
  { name: 'Unternehmen', href: '/dashboard/admin/companies', icon: Building2 },
  { name: 'Benutzer', href: '/dashboard/admin/users', icon: Users },
  { name: 'Admin-Benutzer', href: '/dashboard/admin/admin-users', icon: Shield },
  { name: 'E-Mail System', href: '/dashboard/admin/email', icon: Mail },
  { name: 'Einstellungen', href: '/dashboard/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/auth/verify');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarVisibilityProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Simple Admin Header - No User Auth */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex">
          {/* Mobile sidebar */}
          <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
              <div className="flex items-center justify-between h-16 px-4 border-b">
                <h1 className="text-xl font-bold text-gray-900">Taskilo Admin</h1>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-2">
                {navigation.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive ? 'bg-[#14ad9f] text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Desktop sidebar - Normal flow like company dashboard */}
          <div className="hidden lg:block w-64 bg-white border-r border-gray-200">
            <div className="flex flex-col h-screen sticky top-0">
              <div className="flex items-center h-16 px-4 border-b">
                <Shield className="h-8 w-8 text-[#14ad9f] mr-2" />
                <h1 className="text-xl font-bold text-gray-900">Taskilo Admin</h1>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-2">
                {navigation.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive ? 'bg-[#14ad9f] text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-[#14ad9f] font-medium">{user.role}</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Abmelden
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-h-screen">
            <main className="p-6">{children}</main>
          </div>
        </div>
      </div>
    </SidebarVisibilityProvider>
  );
}
