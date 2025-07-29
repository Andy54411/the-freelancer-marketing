// /Users/andystaudinger/Taskilo/src/app/dashboard/company/[uid]/layout.tsx
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import UserHeader from '@/components/UserHeader';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { Loader2 as FiLoader } from 'lucide-react';
import {
  Grid as FiGrid,
  Calendar as FiCalendar,
  User as FiUser,
  Settings as FiSettings,
  MessageSquare as FiMessageSquare,
  DollarSign as FiDollarSign,
  Menu as FiMenu,
  X as FiX,
  ChevronDown as FiChevronDown,
  ChevronRight as FiChevronRight,
  Mail as FiMail,
  ClipboardList as FiClipboardList,
  CreditCard as FiCreditCard,
  FileText as FiFileText,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim() !== '';

interface NavigationItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  href?: string;
  subItems?: NavigationSubItem[];
}

interface NavigationSubItem {
  label: string;
  value: string;
  href: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Übersicht',
    icon: FiGrid,
    value: 'dashboard',
  },
  {
    label: 'Aufträge',
    icon: FiClipboardList,
    value: 'orders',
    subItems: [
      {
        label: 'Übersicht',
        value: 'orders-overview',
        href: 'orders/overview',
      },
    ],
  },
  {
    label: 'Posteingang',
    icon: FiMail,
    value: 'inbox',
    href: 'inbox',
  },
  {
    label: 'Kalender',
    icon: FiCalendar,
    value: 'calendar',
    href: 'calendar',
  },
  {
    label: 'Finanzen',
    icon: FiDollarSign,
    value: 'finance',
    subItems: [
      {
        label: 'Übersicht',
        value: 'finance-overview',
        href: 'finance',
      },
      {
        label: 'Rechnungen',
        value: 'finance-invoices',
        href: 'finance/invoices',
      },
      {
        label: 'Kunden',
        value: 'finance-customers',
        href: 'finance/customers',
      },
      {
        label: 'Ausgaben',
        value: 'finance-expenses',
        href: 'finance/expenses',
      },
      {
        label: 'Zahlungen',
        value: 'finance-payments',
        href: 'finance/payments',
      },
      {
        label: 'Banking',
        value: 'finance-banking',
        href: 'finance/banking',
      },
      {
        label: 'Steuern',
        value: 'finance-taxes',
        href: 'finance/taxes',
      },
    ],
  },
  {
    label: 'Bewertungen',
    icon: FiMessageSquare,
    value: 'reviews',
  },
  {
    label: 'Profil',
    icon: FiUser,
    value: 'profile',
    href: 'profile',
  },
  {
    label: 'Einstellungen',
    icon: FiSettings,
    value: 'settings',
  },
];

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemValue: string) => {
    setExpandedItems(prev =>
      prev.includes(itemValue) ? prev.filter(v => v !== itemValue) : [...prev, itemValue]
    );
  };

  const isExpanded = (itemValue: string) => expandedItems.includes(itemValue);

  // Den Hook verwenden, um Unternehmensdaten und -zustand abzurufen
  const { isChecking, isAuthorized, userData, view, setView } = useCompanyDashboard();

  // Bestimme den aktuellen Pfad für die Navigation
  const getCurrentView = useCallback(() => {
    if (pathname?.includes('/finance')) return 'finance';
    if (pathname?.includes('/payouts')) return 'finance';
    if (pathname?.includes('/orders')) return 'orders';
    if (pathname?.includes('/inbox')) return 'inbox';
    if (pathname?.includes('/profile')) return 'profile';
    if (pathname?.includes('/calendar')) return 'calendar';
    return view;
  }, [pathname, view]);

  // Unternehmensdaten für die Header-Komponente vorbereiten
  const companyDataForHeader = useMemo(() => {
    if (!uid) return null;
    return {
      uid: uid,
      companyName: isNonEmptyString(userData?.step2?.companyName)
        ? userData.step2.companyName
        : isNonEmptyString(userData?.companyName)
          ? userData.companyName
          : 'Unbekannte Firma',
      logoUrl: undefined,
    };
  }, [uid, userData]);

  // Navigation handler
  const handleNavigation = useCallback(
    (value: string, href?: string) => {
      setIsSidebarOpen(false);

      // Wenn href definiert ist, verwende echte Navigation
      if (href) {
        router.push(`/dashboard/company/${uid}/${href}`);
        return;
      }

      // Für View-basierte Navigation
      if (value === 'settings' || value === 'reviews') {
        router.push(`/dashboard/company/${uid}?view=${value}`);
        setView(value);
        return;
      }

      // Standard Dashboard
      if (value === 'dashboard') {
        router.push(`/dashboard/company/${uid}`);
        setView('dashboard');
        return;
      }
    },
    [router, uid, setView]
  );

  // Lade- und Autorisierungszustand auf Layout-Ebene behandeln
  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Dashboard...
      </div>
    );
  }

  const currentNavItem =
    navigationItems.find(item => item.value === getCurrentView()) || navigationItems[0];

  return (
    <SidebarVisibilityProvider>
      <div
        className="flex flex-col min-h-screen"
        style={{ '--global-header-height': '64px' } as React.CSSProperties}
      >
        <UserHeader currentUid={uid} />

        <div className="flex flex-1 pt-[var(--global-header-height)]">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-[var(--global-header-height)]">
            <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
              <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4">
                  <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                  <span className="ml-2 text-sm text-gray-500">
                    {companyDataForHeader?.companyName}
                  </span>
                </div>
                <nav className="mt-5 flex-1 px-2 space-y-1">
                  {navigationItems.map(item => {
                    const currentView = getCurrentView();
                    const isMainActive =
                      currentView === item.value ||
                      (currentView === 'dashboard' && item.value === 'dashboard') ||
                      (pathname?.includes('/finance') && item.value === 'finance') ||
                      (pathname?.includes('/orders') && item.value === 'orders') ||
                      (pathname?.includes('/payouts') && item.value === 'finance');

                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isItemExpanded = isExpanded(item.value);

                    return (
                      <div key={item.value}>
                        <button
                          onClick={() => {
                            if (hasSubItems) {
                              toggleExpanded(item.value);
                            } else {
                              handleNavigation(item.value, item.href);
                            }
                          }}
                          className={`${
                            isMainActive
                              ? 'bg-[#14ad9f] text-white'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md w-full transition-colors`}
                        >
                          <div className="flex items-center">
                            <item.icon
                              className={`${
                                isMainActive
                                  ? 'text-white'
                                  : 'text-gray-400 group-hover:text-gray-500'
                              } mr-3 flex-shrink-0 h-6 w-6`}
                            />
                            {item.label}
                          </div>
                          {hasSubItems && (
                            <FiChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isItemExpanded ? 'rotate-180' : ''
                              } ${isMainActive ? 'text-white' : 'text-gray-400'}`}
                            />
                          )}
                        </button>

                        {/* Sub-Items */}
                        {hasSubItems && isItemExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.subItems?.map(subItem => {
                              const isSubActive = pathname?.includes(`/${subItem.href}`);
                              return (
                                <button
                                  key={subItem.value}
                                  onClick={() => handleNavigation(subItem.value, subItem.href)}
                                  className={`${
                                    isSubActive
                                      ? 'bg-[#14ad9f] text-white'
                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                  } group flex items-center px-2 py-1.5 text-sm rounded-md w-full transition-colors`}
                                >
                                  <FiChevronRight className="mr-2 h-4 w-4" />
                                  {subItem.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Mobile Sidebar */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden fixed top-[calc(var(--global-header-height)+1rem)] left-4 z-40"
              >
                <FiMenu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex flex-col h-full bg-white">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {navigationItems.map(item => {
                    const currentView = getCurrentView();
                    const isMainActive =
                      currentView === item.value ||
                      (currentView === 'dashboard' && item.value === 'dashboard') ||
                      (pathname?.includes('/finance') && item.value === 'finance') ||
                      (pathname?.includes('/orders') && item.value === 'orders') ||
                      (pathname?.includes('/payouts') && item.value === 'finance');

                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isItemExpanded = isExpanded(item.value);

                    return (
                      <div key={item.value}>
                        <button
                          onClick={() => {
                            if (hasSubItems) {
                              toggleExpanded(item.value);
                            } else {
                              handleNavigation(item.value, item.href);
                            }
                          }}
                          className={`${
                            isMainActive
                              ? 'bg-[#14ad9f] text-white'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md w-full transition-colors`}
                        >
                          <div className="flex items-center">
                            <item.icon
                              className={`${
                                isMainActive
                                  ? 'text-white'
                                  : 'text-gray-400 group-hover:text-gray-500'
                              } mr-3 flex-shrink-0 h-6 w-6`}
                            />
                            {item.label}
                          </div>
                          {hasSubItems && (
                            <FiChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isItemExpanded ? 'rotate-180' : ''
                              } ${isMainActive ? 'text-white' : 'text-gray-400'}`}
                            />
                          )}
                        </button>

                        {/* Sub-Items */}
                        {hasSubItems && isItemExpanded && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.subItems?.map(subItem => {
                              const isSubActive = pathname?.includes(`/${subItem.href}`);
                              return (
                                <button
                                  key={subItem.value}
                                  onClick={() => handleNavigation(subItem.value, subItem.href)}
                                  className={`${
                                    isSubActive
                                      ? 'bg-[#14ad9f] text-white'
                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                  } group flex items-center px-2 py-1.5 text-sm rounded-md w-full transition-colors`}
                                >
                                  <FiChevronRight className="mr-2 h-4 w-4" />
                                  {subItem.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Main Content */}
          <main className="flex-1 md:pl-64">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="mb-8">
                  <div className="flex items-center space-x-2">
                    <currentNavItem.icon className="h-6 w-6 text-gray-600" />
                    <h1 className="text-2xl font-bold text-gray-900">{currentNavItem.label}</h1>
                    <span className="text-sm text-gray-500">
                      {companyDataForHeader?.companyName}
                    </span>
                  </div>
                </div>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarVisibilityProvider>
  );
}
