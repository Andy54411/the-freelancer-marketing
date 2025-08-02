'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Grid as FiGrid,
  Calendar as FiCalendar,
  User as FiUser,
  Settings as FiSettings,
  MessageSquare as FiMessageSquare,
  DollarSign as FiDollarSign,
  Mail as FiMail,
  ClipboardList as FiClipboardList,
  ChevronDown as FiChevronDown,
  ChevronRight as FiChevronRight,
  Menu as FiMenu,
} from 'lucide-react';

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

interface CompanyMobileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expandedItems: string[];
  onToggleExpanded: (itemValue: string) => void;
  onNavigate: (value: string, href?: string) => void;
  getCurrentView: () => string;
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
      {
        label: 'Eingegangene Aufträge',
        value: 'orders-incoming',
        href: 'orders/incoming',
      },
      {
        label: 'Erstellte Aufträge',
        value: 'orders-created',
        href: 'orders/created',
      },
      {
        label: 'Abgeschlossene Aufträge',
        value: 'orders-completed',
        href: 'orders/completed',
      },
      {
        label: 'Stornierte Aufträge',
        value: 'orders-cancelled',
        href: 'orders/cancelled',
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
      {
        label: 'Lagerbestand',
        value: 'finance-inventory',
        href: 'finance/inventory',
      },
    ],
  },
  {
    label: 'Bewertungen',
    icon: FiMessageSquare,
    value: 'reviews',
    href: 'reviews',
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

export default function CompanyMobileSidebar({
  isOpen,
  onOpenChange,
  expandedItems,
  onToggleExpanded,
  onNavigate,
  getCurrentView,
}: CompanyMobileSidebarProps) {
  const pathname = usePathname();

  const isExpanded = (itemValue: string) => expandedItems.includes(itemValue);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          </div>

          {/* Mobile Navigation */}
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
                  {/* Main Navigation Button */}
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        onToggleExpanded(item.value);
                      } else {
                        onNavigate(item.value, item.href);
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
                          isMainActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
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
                            onClick={() => onNavigate(subItem.value, subItem.href)}
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
  );
}
