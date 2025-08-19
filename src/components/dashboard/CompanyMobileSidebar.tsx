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
  Bot as FiBot,
  TrendingUp as FiTrendingUp,
  Banknote as FiBanknote,
  Shield as FiShield,
  Building2 as FiBuilding2,
  Folder as FiFolder,
  FileText as FiFileText,
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
  href?: string;
  subItems?: NavigationSubItem[];
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
      { label: 'Übersicht', value: 'orders-overview', href: 'orders/overview' },
      { label: 'Eingehend', value: 'orders-incoming', href: 'orders/incoming' },
      { label: 'Erstellt', value: 'orders-created', href: 'orders/created' },
      { label: 'Abgeschlossen', value: 'orders-completed', href: 'orders/completed' },
      { label: 'Storniert', value: 'orders-cancelled', href: 'orders/cancelled' },
    ],
  },
  {
    label: 'Angebots-Anfragen',
    icon: FiFileText,
    value: 'quotes',
    subItems: [{ label: 'Eingehend', value: 'quotes-incoming', href: 'quotes/incoming' }],
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
    label: 'Banking',
    icon: FiBanknote,
    value: 'banking',
    subItems: [
      { label: 'Übersicht', value: 'banking-overview', href: 'banking' },
      { label: 'Bank verbinden', value: 'banking-connect', href: 'banking/connect' },
      { label: 'Konten', value: 'banking-accounts', href: 'banking/accounts' },
      { label: 'Transaktionen', value: 'banking-transactions', href: 'banking/transactions' },
      { label: 'Import & Sync', value: 'banking-import', href: 'banking/import' },
      { label: 'Abgleich', value: 'banking-reconciliation', href: 'banking/reconciliation' },
    ],
  },
  {
    label: 'Finanzen',
    icon: FiDollarSign,
    value: 'finance',
    subItems: [
      {
        label: 'Dashboard',
        value: 'finance-overview',
        href: 'finance',
      },
      {
        label: 'Rechnungen',
        value: 'finance-invoices',
        href: 'finance/invoices',
      },
      {
        label: 'E-Rechnungen',
        value: 'finance-einvoices',
        href: 'finance/einvoices',
      },
      {
        label: 'Lieferscheine',
        value: 'finance-delivery-notes',
        href: 'finance/delivery-notes',
      },
      {
        label: 'Angebote',
        value: 'finance-quotes',
        href: 'finance/quotes',
      },
      {
        label: 'Gutschriften',
        value: 'finance-credits',
        href: 'finance/credits',
      },
      {
        label: 'Mahnungen',
        value: 'finance-reminders',
        href: 'finance/reminders',
      },
      {
        label: 'Kunden & CRM',
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
        label: 'Zeiterfassung',
        value: 'finance-time-tracking',
        href: 'finance/time-tracking',
      },
      {
        label: 'Projekte',
        value: 'finance-projects',
        href: 'finance/projects',
      },
      {
        label: 'Steuern & Berichte',
        value: 'finance-taxes',
        href: 'finance/taxes',
      },
      {
        label: 'Lagerbestand',
        value: 'finance-inventory',
        href: 'finance/inventory',
      },
      {
        label: 'Kassenbuch',
        value: 'finance-cashbook',
        href: 'finance/cashbook',
      },
      {
        label: 'Auswertungen',
        value: 'finance-reports',
        href: 'finance/reports',
      },
    ],
  },
  {
    label: 'Banking',
    icon: FiBanknote,
    value: 'banking',
    subItems: [
      {
        label: 'Übersicht',
        value: 'banking-overview',
        href: 'banking',
      },
      {
        label: 'Bank verbinden',
        value: 'banking-connect',
        href: 'banking/connect',
      },
      {
        label: 'Konten',
        value: 'banking-accounts',
        href: 'banking/accounts',
      },
      {
        label: 'Transaktionen',
        value: 'banking-transactions',
        href: 'banking/transactions',
      },
      {
        label: 'Import & Sync',
        value: 'banking-import',
        href: 'banking/import',
      },
      {
        label: 'Abgleich',
        value: 'banking-reconciliation',
        href: 'banking/reconciliation',
      },
    ],
  },
  {
    label: 'Taskilo Advertising',
    icon: FiTrendingUp,
    value: 'taskilo-advertising',
    href: 'taskilo-advertising',
  },
  {
    label: 'Steuerportal',
    icon: FiShield,
    value: 'steuerportal',
    href: 'steuerportal',
  },
  {
    label: 'DATEV Integration',
    icon: FiDollarSign,
    value: 'datev-overview',
    subItems: [
      {
        label: 'Dashboard',
        value: 'datev-main',
        href: 'datev',
      },
      {
        label: 'Übersicht',
        value: 'datev-overview',
        href: 'datev/overview',
      },
      {
        label: 'Einrichtung',
        value: 'datev-setup',
        href: 'datev/setup',
      },
    ],
  },
  {
    label: 'Workspace',
    icon: FiFolder,
    value: 'workspace',
    subItems: [
      { label: 'Übersicht', value: 'workspace-overview', href: 'workspace' },
      { label: 'Projekte', value: 'workspace-projects', href: 'workspace?type=project' },
      { label: 'Aufgaben', value: 'workspace-tasks', href: 'workspace?type=task' },
      { label: 'Dokumente', value: 'workspace-documents', href: 'workspace?type=document' },
      { label: 'Prozesse', value: 'workspace-processes', href: 'workspace?type=process' },
      { label: 'Board-Ansicht', value: 'workspace-board', href: 'workspace?view=board' },
      { label: 'Listen-Ansicht', value: 'workspace-list', href: 'workspace?view=list' },
      { label: 'Kalender-Ansicht', value: 'workspace-calendar', href: 'workspace?view=calendar' },
    ],
  },
  {
    label: 'Bewertungen',
    icon: FiMessageSquare,
    value: 'reviews',
    href: 'reviews',
  },
  {
    label: 'KI-Assistent',
    icon: FiBot,
    value: 'ai-assistant',
    href: 'ai-assistant',
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
              // Präzise Pfad-Erkennung für aktive Zustände
              const isMainActive = (() => {
                // Spezifische Pfad-Matches für jeden Bereich
                if (item.value === 'finance') {
                  return pathname?.includes('/finance') || pathname?.includes('/payouts');
                }
                if (item.value === 'orders') {
                  return pathname?.includes('/orders');
                }
                if (item.value === 'inbox') {
                  return pathname?.includes('/inbox');
                }
                if (item.value === 'profile') {
                  return pathname?.includes('/profile');
                }
                if (item.value === 'settings') {
                  return pathname?.includes('/settings');
                }
                if (item.value === 'ai') {
                  return pathname?.includes('/ai-assistant');
                }
                if (item.value === 'calendar') {
                  return pathname?.includes('/calendar');
                }
                if (item.value === 'reviews') {
                  return pathname?.includes('/reviews');
                }
                if (item.value === 'steuerportal') {
                  return pathname?.includes('/steuerportal');
                }
                if (item.value === 'taskilo-advertising') {
                  return pathname?.includes('/taskilo-advertising');
                }
                if (item.value === 'dashboard') {
                  // Dashboard ist nur aktiv wenn KEIN anderer spezifischer Pfad aktiv ist
                  return (
                    !pathname?.includes('/finance') &&
                    !pathname?.includes('/orders') &&
                    !pathname?.includes('/payouts') &&
                    !pathname?.includes('/inbox') &&
                    !pathname?.includes('/profile') &&
                    !pathname?.includes('/settings') &&
                    !pathname?.includes('/ai-assistant') &&
                    !pathname?.includes('/calendar') &&
                    !pathname?.includes('/reviews') &&
                    !pathname?.includes('/steuerportal') &&
                    !pathname?.includes('/taskilo-advertising')
                  );
                }
                // Fallback für currentView
                return currentView === item.value;
              })();

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
