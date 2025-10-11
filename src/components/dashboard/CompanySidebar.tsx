'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  Shield as FiShield,
  Banknote as FiBanknote,
  Users as FiUsers,
  UserPlus as FiUserPlus,
  Clock as FiClock,
  Calculator as FiCalculator,
  BarChart3 as FiBarChart3,
  CalendarDays as FiCalendarDays,
  FileText as FiFileText,
  Folder as FiFolder,
  FolderTree as FiFolderTree,
  Boxes as FiBoxes,
  HelpCircle as FiHelpCircle,
} from 'lucide-react';
import { StorageCardSidebar } from './StorageCardSidebar';

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
      { label: 'Übersicht', value: 'orders-overview', href: 'orders/overview' },
      { label: 'Eingehend', value: 'orders-incoming', href: 'orders/incoming' },
      { label: 'Erstellt', value: 'orders-created', href: 'orders/created' },
      { label: 'Abgeschlossen', value: 'orders-completed', href: 'orders/completed' },
      { label: 'Storniert', value: 'orders-cancelled', href: 'orders/cancelled' },
    ],
  },
  {
    label: 'Projekt-Marktplatz',
    icon: FiFolder,
    value: 'marketplace',
    subItems: [
      { label: 'Verfügbare Projekte', value: 'marketplace-projects', href: 'marketplace/projects' },
      { label: 'Meine Bewerbungen', value: 'marketplace-proposals', href: 'marketplace/proposals' },
      { label: 'Direkte Anfragen', value: 'marketplace-quotes', href: 'marketplace/quotes' },
      {
        label: 'Kategorie-Anfragen',
        value: 'marketplace-project-quotes',
        href: 'marketplace/project-quotes',
      },
    ],
  },
  {
    label: 'Angebote',
    icon: FiFileText,
    value: 'quotes',
    subItems: [
      { label: 'Übersicht', value: 'quotes-overview', href: 'finance/quotes' },
      { label: 'Neues Angebot', value: 'quotes-create', href: 'finance/quotes/create' },
      { label: 'Entwürfe', value: 'quotes-drafts', href: 'finance/quotes/drafts' },
      { label: 'Versendet', value: 'quotes-sent', href: 'finance/quotes/sent' },
      { label: 'Angenommen', value: 'quotes-accepted', href: 'finance/quotes/accepted' },
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
    label: 'Rechnungen',
    icon: FiFileText,
    value: 'invoices',
    subItems: [
      { label: 'Alle Rechnungen', value: 'invoices-overview', href: 'finance/invoices' },
      { label: 'Kassenbuch', value: 'invoices-other-income', href: 'finance/cashbook' },
      { label: 'E-Rechnungen', value: 'invoices-einvoices', href: 'finance/einvoices' },
      { label: 'Lieferscheine', value: 'invoices-delivery-notes', href: 'finance/delivery-notes' },
      { label: 'Ausgaben', value: 'invoices-expenses', href: 'finance/expenses' },
      { label: 'Wiederkehrend', value: 'invoices-recurring', href: 'finance/invoices/recurring' },
      { label: 'Rechnung erstellen', value: 'invoices-create', href: 'finance/invoices/create' },
      { label: 'Mahnungen', value: 'invoices-reminders', href: 'finance/reminders' },
      { label: 'Gutschriften', value: 'invoices-credits', href: 'finance/credits' },
    ],
  },
  {
    label: 'Buchhaltungseinstellungen',
    icon: FiCalculator,
    value: 'accounting',
    href: 'finance/accounting',
  },
  {
    label: 'Geschäftspartner',
    icon: FiUsers,
    value: 'contacts',
    href: 'finance/contacts',
  },
  {
    label: 'Banking',
    icon: FiBanknote,
    value: 'banking',
    subItems: [
      { label: 'Dashboard', value: 'banking-overview', href: 'banking' },
      { label: 'Konten', value: 'banking-accounts', href: 'banking/accounts' },
      { label: 'Transaktionen', value: 'banking-transactions', href: 'banking/transactions' },
      { label: 'Zahlungen', value: 'banking-payments', href: 'finance/payments' },
      { label: 'Import & Sync', value: 'banking-import', href: 'banking/import' },
      { label: 'Abgleich', value: 'banking-reconciliation', href: 'banking/reconciliation' },
    ],
  },
  {
    label: 'Projekte',
    icon: FiFolderTree,
    value: 'projects',
    subItems: [
      { label: 'Zeiterfassung', value: 'projects-time-tracking', href: 'finance/time-tracking' },
    ],
  },
  {
    label: 'Lagerbestand',
    icon: FiBoxes,
    value: 'inventory',
    href: 'finance/inventory',
  },
  {
    label: 'Personal',
    icon: FiUsers,
    value: 'personal',
    subItems: [
      { label: 'Übersicht', value: 'personal-overview', href: 'personal' },
      { label: 'Mitarbeiter', value: 'personal-employees', href: 'personal/employees' },
      { label: 'Neuer Mitarbeiter', value: 'personal-add', href: 'personal/add' },
      { label: 'Dienstplan', value: 'personal-schedule', href: 'personal/schedule' },
      { label: 'Gehaltsabrechnung', value: 'personal-payroll', href: 'personal/payroll' },
      { label: 'Arbeitszeit', value: 'personal-timesheet', href: 'personal/timesheet' },
      { label: 'Kostenkalkulation', value: 'personal-costs', href: 'personal/costs' },
      { label: 'Personal-Analytics', value: 'personal-analytics', href: 'personal/analytics' },
      { label: 'Urlaub & Abwesenheit', value: 'personal-absence', href: 'personal/absence' },
      { label: 'Dokumente', value: 'personal-documents', href: 'personal/documents' },
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
    label: 'Steuerportal',
    icon: FiShield,
    value: 'steuerportal',
    subItems: [
      { label: 'Steuern', value: 'steuerportal-taxes', href: 'finance/taxes' },
      { label: 'Auswertung', value: 'steuerportal-reports', href: 'finance/reports' },
      { label: 'DATEV', value: 'steuerportal-datev', href: 'datev' },
    ],
  },
  {
    label: 'Bewertungen',
    icon: FiMessageSquare,
    value: 'reviews',
    href: 'reviews',
  },
  {
    label: 'Support',
    icon: FiHelpCircle,
    value: 'support',
    href: 'support',
  },
  {
    label: 'Einstellungen',
    icon: FiSettings,
    value: 'settings',
    subItems: [
      { label: 'Allgemein', value: 'settings-general' },
      { label: 'Buchhaltung & Steuer', value: 'settings-accounting' },
      { label: 'Zahlungskonditionen', value: 'settings-payment-terms' },
      { label: 'Bankverbindung', value: 'settings-bank' },
      { label: 'Logo & Dokumente', value: 'settings-logo' },
      { label: 'Portfolio', value: 'settings-portfolio' },
      { label: 'Dienstleistungen', value: 'settings-services' },
      { label: 'FAQs', value: 'settings-faqs' },
      { label: 'Auszahlungen', value: 'settings-payouts' },
      { label: 'Storno-Einstellungen', value: 'settings-storno', href: 'settings/storno' },
      { label: 'Textvorlagen', value: 'settings-textvorlagen', href: 'settings/textvorlagen' },
      { label: 'E-Mail Integration', value: 'settings-email', href: 'settings/email-integration' },
    ],
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
  const isItemActive = (item: NavigationItem) => {
    // Marketplace aktiv wenn Marketplace-Pfad
    if (item.value === 'marketplace') {
      return pathname?.includes('/marketplace');
    }

    // Invoices aktiv, wenn /finance/invoices oder passende Unterrouten
    if (item.value === 'invoices') {
      return (
        pathname?.includes('/finance/invoices') ||
        pathname?.includes('/finance/invoices/create') ||
        pathname?.includes('/finance/einvoices') ||
        pathname?.includes('/finance/delivery-notes') ||
        pathname?.includes('/finance/expenses') ||
        pathname?.includes('/finance/reminders') ||
        pathname?.includes('/finance/credits') ||
        pathname?.includes('/finance/cashbook')
      );
    }

    // Customers aktiv wenn Pfad /finance/customers
    if (item.value === 'customers') {
      return pathname?.includes('/finance/contacts');
    }
    // Suppliers aktiv wenn Pfad /finance/suppliers
    if (item.value === 'suppliers') {
      return pathname?.includes('/finance/suppliers');
    }

    // Finance aktiv nur wenn Finance ohne Banking und ohne Quotes und ohne Marketplace
    if (item.value === 'finance') {
      return (
        pathname?.includes('/finance') &&
        !pathname?.includes('/finance/invoices') &&
        !pathname?.includes('/finance/einvoices') &&
        !pathname?.includes('/finance/delivery-notes') &&
        !pathname?.includes('/finance/expenses') &&
        !pathname?.includes('/finance/reminders') &&
        !pathname?.includes('/finance/credits') &&
        !pathname?.includes('/finance/cashbook') &&
        !pathname?.includes('/finance/contacts') &&
        !pathname?.includes('/finance/suppliers') &&
        !pathname?.includes('/finance/payments') &&
        !pathname?.includes('/finance/time-tracking') &&
        !pathname?.includes('/finance/projects') &&
        !pathname?.includes('/finance/inventory') &&
        !pathname?.includes('/banking') &&
        !pathname?.includes('/marketplace') &&
        !pathname?.includes('/quotes')
      );
    }

    // Banking aktiv wenn Banking-Pfad
    if (item.value === 'banking') {
      return pathname?.includes('/banking') || pathname?.includes('/finance/payments');
    }

    // Quotes aktiv wenn Finance-Quotes-Pfad (aber nicht Marketplace-Quotes)
    if (item.value === 'quotes') {
      return pathname?.includes('/finance/quotes');
    }

    // Orders aktiv wenn Orders-Pfad
    if (item.value === 'orders') {
      return pathname?.includes('/orders');
    }

    // Personal aktiv wenn Personal-Pfad
    if (item.value === 'personal') {
      return pathname?.includes('/personal');
    }

    // Projekte aktiv wenn Projekte- oder Zeit-Erfassungs-Pfad
    if (item.value === 'projects') {
      return (
        pathname?.includes('/finance/projects') || pathname?.includes('/finance/time-tracking')
      );
    }

    // Lagerbestand aktiv wenn Pfad /finance/inventory
    if (item.value === 'inventory') {
      return pathname?.includes('/finance/inventory');
    }

    // Steuerportal aktiv bei /steuerportal/*, /datev/* oder finance Steuern/Auswertung
    if (item.value === 'steuerportal') {
      return (
        pathname?.includes('/steuerportal') ||
        pathname?.includes('/datev') ||
        pathname?.includes('/finance/taxes') ||
        pathname?.includes('/finance/reports')
      );
    }

    // Dashboard aktiv wenn Hauptseite oder keine anderen Pfade
    if (item.value === 'dashboard') {
      return (
        !pathname ||
        pathname === '/' ||
        pathname === `/dashboard/company/${pathname?.split('/')[3]}` ||
        (!pathname.includes('/finance') &&
          !pathname.includes('/orders') &&
          !pathname.includes('/inbox') &&
          !pathname.includes('/settings') &&
          !pathname.includes('/calendar') &&
          !pathname.includes('/reviews') &&
          !pathname.includes('/steuerportal') &&
          !pathname.includes('/marketplace') &&
          !pathname.includes('/datev') &&
          !pathname.includes('/personal') &&
          !pathname.includes('/workspace'))
      );
    }

    // Standard href Check
    if (item.href) {
      return pathname?.includes(`/${item.href}`);
    }

    return getCurrentView() === item.value;
  };

  const isSubItemActive = (subItem: NavigationSubItem) => {
    if (!subItem.href || !pathname) return false;

    // Spezielle Behandlung für Finance Dashboard - nur exakt /finance, nicht /finance/quotes
    if (subItem.href === 'finance') {
      const pathSegments = pathname.split('/');
      const financeIndex = pathSegments.indexOf('finance');
      if (financeIndex !== -1) {
        // Prüfen ob nach 'finance' noch weitere Segmente kommen
        return financeIndex === pathSegments.length - 1;
      }
      return false;
    }

    return pathname.includes(`/${subItem.href}`);
  };

  const sidebarRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState('100vh');
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const updateMaxHeight = () => {
      if (typeof window !== 'undefined') {
        const viewportHeight = window.innerHeight;
        const footerOffset = -50; // Abstand zum Footer
        setMaxHeight(`${viewportHeight - footerOffset}px`);
      }
    };

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, []);

  // Drag-to-Scroll Handler
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollTop(scrollRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const y = e.pageY - scrollRef.current.offsetTop;
    const walk = (y - startY) * 2; // Scroll-Geschwindigkeit
    scrollRef.current.scrollTop = scrollTop - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <>
      <style jsx>{`
        .sidebar-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div ref={sidebarRef} className="flex flex-col bg-white" style={{ maxHeight }}>
        <div
          ref={scrollRef}
          className="sidebar-scroll flex flex-col flex-1 pt-5 pb-4 overflow-y-auto select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            {companyName && <span className="ml-2 text-sm text-gray-500">{companyName}</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {navigationItems.map(item => {
              const isMainActive = isItemActive(item);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemExpanded = isExpanded(item.value);

              return (
                <div key={item.value}>
                  {/* Main Button */}
                  <button
                    onClick={() => {
                      if (hasSubItems) {
                        onToggleExpanded(item.value);
                      } else if (item.href) {
                        onNavigate(item.value, item.href);
                      } else {
                        onNavigate(item.value);
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

                  {/* Sub Items */}
                  {hasSubItems && isItemExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems?.map(subItem => {
                        const isSubActive = isSubItemActive(subItem);

                        return (
                          <button
                            key={subItem.value}
                            onClick={() => {
                              if (subItem.href) {
                                onNavigate(subItem.value, subItem.href);
                              } else {
                                onNavigate(subItem.value);
                              }
                            }}
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

                  {/* Storage Card direkt nach Einstellungen Button */}
                  {item.value === 'settings' && (
                    <div className="mt-2 px-2">
                      <StorageCardSidebar companyId={uid} />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
