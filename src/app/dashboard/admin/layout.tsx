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
  XCircle,
  MessageSquare,
  Bell,
  CreditCard,
  Calendar,
  Sun,
  Moon,
  HardDrive,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Newspaper,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { WebmailThemeProvider, useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { MailHeader } from '@/components/webmail/MailHeader';

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
  { name: 'Kalender', href: '/admin-calendar', icon: Calendar },
  { name: 'Workspace', href: '/dashboard/admin/workspace', icon: Briefcase },
  { name: 'Tickets', href: '/dashboard/admin/tickets', icon: Ticket },
  { name: 'Chat-Monitoring', href: '/dashboard/admin/chat-monitoring', icon: MessageSquare },
  { name: 'Content-Überwachung', href: '/dashboard/admin/content-monitoring', icon: AlertTriangle },
  { name: 'Storno-Verwaltung', href: '/dashboard/admin/storno-management', icon: XCircle },
  { name: 'Enhanced Analytics', href: '/dashboard/admin/analytics', icon: BarChart3 },
  { name: 'Taskilo KI Analytics', href: '/dashboard/admin/ai-analytics', icon: Sparkles },
  { name: 'Updates & Changelog', href: '/dashboard/admin/updates', icon: Bell },
  { name: 'Bewertungen', href: '/dashboard/admin/reviews', icon: Star },
  { name: 'Newsletter', href: '/dashboard/admin/newsletter', icon: Newspaper },
  { name: 'Unternehmen', href: '/dashboard/admin/companies', icon: Building2 },
  { name: 'Benutzer', href: '/dashboard/admin/users', icon: Users },
  { name: 'Admin-Benutzer', href: '/dashboard/admin/admin-users', icon: Shield },
  { name: 'E-Mail System', href: '/dashboard/admin/email', icon: Mail },
  { name: 'Webmail-Abrechnung', href: '/dashboard/admin/webmail-billing', icon: CreditCard },
  { name: 'Modul-Abonnements', href: '/dashboard/admin/modules', icon: Package },
  { name: 'Taskilo Drive', href: '/dashboard/admin/drive', icon: HardDrive },
  { name: 'Einstellungen', href: '/dashboard/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 1536;
    }
    return true;
  });
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
    } catch (_error) {
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
    } catch (_error) {}
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
    <WebmailThemeProvider>
      <AdminLayoutContent 
        user={user} 
        handleLogout={handleLogout} 
        pathname={pathname} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      >
        {children}
      </AdminLayoutContent>
    </WebmailThemeProvider>
  );
}

function AdminLayoutContent({ 
  user, 
  handleLogout, 
  pathname, 
  sidebarOpen, 
  setSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  children 
}: { 
  user: AdminUser; 
  handleLogout: () => void; 
  pathname: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  children: React.ReactNode;
}) {
  const { isDark, toggleTheme } = useWebmailTheme();

  const handleMenuToggle = () => {
    // Mobile: Öffne Mobile Sidebar
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(!sidebarOpen);
    } else {
      // Desktop: Toggle Sidebar Collapsed State
      const newState = !isSidebarCollapsed;
      setIsSidebarCollapsed(newState);
      localStorage.setItem('admin-sidebar-collapsed', newState.toString());
    }
  };

  return (
    <SidebarVisibilityProvider>
      <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Admin MailHeader */}
        <MailHeader
          userEmail={user.email}
          userInitial={user.name?.charAt(0) || 'A'}
          onMenuToggle={handleMenuToggle}
          onLogout={handleLogout}
          appName="Admin"
          hideSearch={true}
          isDashboard={true}
        />

        <div className="flex">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-60 lg:hidden">
              <div
                className={`fixed inset-0 ${isDark ? 'bg-black' : 'bg-gray-600'} bg-opacity-75`}
                onClick={() => setSidebarOpen(false)}
              />
              <div className={`fixed inset-y-0 left-0 flex w-64 flex-col z-70 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`flex items-center justify-between h-16 px-4 border-b ${isDark ? 'border-gray-700' : ''}`}>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Taskilo Admin</h1>
                <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                  <X className={`h-5 w-5 ${isDark ? 'text-white' : ''}`} />
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
                        isActive 
                          ? 'bg-[#14ad9f] text-white' 
                          : isDark 
                            ? 'text-gray-300 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-100'
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
          )}

          {/* Desktop sidebar - Dynamic width based on collapsed state */}
          <div className={`hidden lg:block transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'} ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}>
            <div className="flex flex-col h-screen sticky top-0">
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b ${isDark ? 'border-gray-700' : ''}`}>
                {isSidebarCollapsed ? (
                  <Shield className="h-8 w-8 text-[#14ad9f]" />
                ) : (
                  <>
                    <div className="flex items-center">
                      <Shield className="h-8 w-8 text-[#14ad9f] mr-2" />
                      <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Taskilo Admin</h1>
                    </div>
                    <Button variant="ghost" size="sm" onClick={toggleTheme} className="ml-2">
                      {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5" />}
                    </Button>
                  </>
                )}
              </div>
              <nav className={`flex-1 ${isSidebarCollapsed ? 'px-2' : 'px-4'} py-4 space-y-2`}>
                {navigation.map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={isSidebarCollapsed ? item.name : undefined}
                      className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-[#14ad9f] text-white' 
                          : isDark 
                            ? 'text-gray-300 hover:bg-gray-700' 
                            : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                      {!isSidebarCollapsed && item.name}
                    </Link>
                  );
                })}
              </nav>
              {/* Collapse Button */}
              <div className={`px-2 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newState = !isSidebarCollapsed;
                    setIsSidebarCollapsed(newState);
                    localStorage.setItem('admin-sidebar-collapsed', newState.toString());
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {isSidebarCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <>
                      <ChevronLeft className="h-5 w-5 mr-2" />
                      <span>Einklappen</span>
                    </>
                  )}
                </Button>
              </div>
              {!isSidebarCollapsed && (
                <div className={`p-4 border-t ${isDark ? 'border-gray-700' : ''}`}>
                  <Card className={isDark ? 'bg-gray-700 border-gray-600' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user.email}</p>
                          <p className="text-xs text-[#14ad9f] font-medium">{user.role}</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                        className={`w-full mt-3 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-600' : ''}`}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Abmelden
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
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