'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
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
  Bot as FiBot,
  TrendingUp as FiTrendingUp,
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

interface CompanySidebarProps {
  companyName?: string;
  uid: string;
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
        label: 'Banking',
        value: 'finance-banking',
        subItems: [
          {
            label: 'Dashboard',
            value: 'finance-banking-overview',
            href: 'finance/banking',
          },
          {
            label: 'Bank verbinden',
            value: 'finance-banking-connect',
            href: 'finance/banking/connect',
          },
          {
            label: 'Konten',
            value: 'finance-banking-accounts',
            href: 'finance/banking/accounts',
          },
          {
            label: 'Transaktionen',
            value: 'finance-banking-transactions',
            href: 'finance/banking/transactions',
          },
          {
            label: 'Import',
            value: 'finance-banking-import',
            href: 'finance/banking/import',
          },
          {
            label: 'Abgleich',
            value: 'finance-banking-reconciliation',
            href: 'finance/banking/reconciliation',
          },
        ],
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
    label: 'Google Ads',
    icon: FiTrendingUp,
    value: 'google-ads',
    href: 'google-ads',
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
      {
        label: 'Steuerberater',
        value: 'datev-steuerberater',
        href: 'datev/steuerberater',
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

export default function CompanySidebar({
  companyName,
  uid,
  expandedItems,
  onToggleExpanded,
  onNavigate,
  getCurrentView,
}: CompanySidebarProps) {
  const pathname = usePathname();

  const isExpanded = (itemValue: string) => expandedItems.includes(itemValue);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
      <div className="flex flex-col flex-1 pt-5 pb-4 overflow-y-auto">
        {/* Sidebar Header */}
        <div className="flex items-center flex-shrink-0 px-4">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          {companyName && <span className="ml-2 text-sm text-gray-500">{companyName}</span>}
        </div>

        {/* Navigation */}
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigationItems.map(item => {
            const currentView = getCurrentView();
            // Präzise Pfad-Erkennung für aktive Zustände
            const isMainActive = (() => {
              // Spezifische Pfad-Matches für jeden Bereich
              if (item.value === 'finance') {
                // Finance ist nur aktiv wenn genau die Finance-Hauptseite aktiv ist
                // NICHT die Unterseiten
                return pathname?.endsWith('/finance') || pathname?.endsWith('/finance/');
              }
              if (item.value === 'orders') {
                // Orders ist nur aktiv wenn genau die Orders-Hauptseite aktiv ist
                return pathname?.endsWith('/orders') || pathname?.endsWith('/orders/');
              }
              if (item.value === 'inbox') {
                // Inbox ist nur aktiv wenn genau die Inbox-Hauptseite aktiv ist
                return pathname?.endsWith('/inbox') || pathname?.endsWith('/inbox/');
              }
              if (item.value === 'profile') {
                return pathname?.endsWith('/profile') || pathname?.endsWith('/profile/');
              }
              if (item.value === 'settings') {
                return pathname?.endsWith('/settings') || pathname?.endsWith('/settings/');
              }
              if (item.value === 'ai-assistant') {
                return pathname?.endsWith('/ai-assistant') || pathname?.endsWith('/ai-assistant/');
              }
              if (item.value === 'calendar') {
                return pathname?.endsWith('/calendar') || pathname?.endsWith('/calendar/');
              }
              if (item.value === 'reviews') {
                return pathname?.endsWith('/reviews') || pathname?.endsWith('/reviews/');
              }
              if (item.value === 'google-ads') {
                return pathname?.endsWith('/google-ads') || pathname?.endsWith('/google-ads/');
              }
              if (item.value === 'datev-overview') {
                // DATEV ist ein spezieller Fall - hier soll das Hauptmenü aktiv sein wenn man in datev/ ist
                return pathname?.includes('/datev');
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
                  !pathname?.includes('/google-ads') &&
                  !pathname?.includes('/datev') &&
                  !pathname?.includes('/provider')
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
                      const isSubActive = (() => {
                        if (!subItem.href || !pathname) return false;

                        // Spezielle Behandlung für Rechnungen - auch Rechnungsdetailseiten markieren
                        if (subItem.href === 'finance/invoices') {
                          return pathname.includes('/finance/invoices');
                        }

                        // Standard-Check für andere Sub-Items
                        return pathname.includes(`/${subItem.href}`);
                      })();
                      const hasNestedSubItems = subItem.subItems && subItem.subItems.length > 0;
                      const isSubExpanded = isExpanded(subItem.value);

                      return (
                        <div key={subItem.value}>
                          <button
                            onClick={() => {
                              if (hasNestedSubItems) {
                                onToggleExpanded(subItem.value);
                              } else if (subItem.href) {
                                onNavigate(subItem.value, subItem.href);
                              }
                            }}
                            className={`${
                              isSubActive
                                ? 'bg-[#14ad9f] text-white'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            } group flex items-center justify-between px-2 py-1.5 text-sm rounded-md w-full transition-colors`}
                          >
                            <div className="flex items-center">
                              <FiChevronRight className="mr-2 h-4 w-4" />
                              {subItem.label}
                            </div>
                            {hasNestedSubItems && (
                              <FiChevronDown
                                className={`h-3 w-3 transition-transform ${
                                  isSubExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            )}
                          </button>

                          {/* Nested Sub-Items */}
                          {hasNestedSubItems && isSubExpanded && (
                            <div className="ml-6 mt-1 space-y-1">
                              {subItem.subItems?.map(nestedItem => {
                                const isNestedActive = nestedItem.href
                                  ? pathname?.includes(`/${nestedItem.href}`)
                                  : false;
                                return (
                                  <button
                                    key={nestedItem.value}
                                    onClick={() =>
                                      nestedItem.href &&
                                      onNavigate(nestedItem.value, nestedItem.href)
                                    }
                                    className={`${
                                      isNestedActive
                                        ? 'bg-[#14ad9f] text-white'
                                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                    } group flex items-center px-2 py-1 text-xs rounded-md w-full transition-colors`}
                                  >
                                    <span className="mr-2">•</span>
                                    {nestedItem.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
  );
}
