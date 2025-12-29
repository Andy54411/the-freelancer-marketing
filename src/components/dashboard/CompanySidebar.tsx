'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Grid as FiGrid,
  Calendar as FiCalendar,
  User as FiUser,
  Settings as FiSettings,
  MessageSquare as FiMessageSquare,
  DollarSign as FiDollarSign,
  Mail as FiMail,
  Send as FiSend,
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
  Briefcase as FiBriefcase,
  HelpCircle as FiHelpCircle,
  MessageCircle as FiMessageCircle,
  PanelLeftClose as FiPanelLeftClose,
  PanelLeftOpen as FiPanelLeftOpen,
} from 'lucide-react';
import { StorageCardSidebar } from './StorageCardSidebar';
import { CurrentPlanCard } from './CurrentPlanCard';

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
  subItems?: NavigationSubSubItem[];
}

interface NavigationSubSubItem {
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
  isCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Übersicht',
    icon: FiGrid,
    value: 'dashboard',
  },
  {
    label: 'Tasker',
    icon: FiClipboardList,
    value: 'tasker',
    subItems: [
      {
        label: 'Aufträge',
        value: 'orders',
        href: 'orders/overview',
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
        value: 'marketplace',
        href: 'marketplace/projects',
        subItems: [
          {
            label: 'Verfügbare Projekte',
            value: 'marketplace-projects',
            href: 'marketplace/projects',
          },
          {
            label: 'Meine Bewerbungen',
            value: 'marketplace-proposals',
            href: 'marketplace/proposals',
          },
          { label: 'Direkte Anfragen', value: 'marketplace-quotes', href: 'marketplace/quotes' },
          {
            label: 'Kategorie-Anfragen',
            value: 'marketplace-project-quotes',
            href: 'marketplace/project-quotes',
          },
        ],
      },
      {
        label: 'Posteingang',
        value: 'inbox',
        href: 'inbox',
      },
      {
        label: 'Bewertungen',
        value: 'reviews',
        href: 'reviews',
      },
    ],
  },
  {
    label: 'Kalender',
    icon: FiCalendar,
    value: 'calendar',
    href: 'calendar',
  },
  {
    label: 'E-Mail',
    icon: FiSend,
    value: 'email',
    href: 'emails',
    subItems: [
      { label: 'Posteingang', value: 'email-inbox', href: 'emails' },
      { label: 'Gesendet', value: 'email-sent', href: 'emails/sent' },
      { label: 'Entwürfe', value: 'email-drafts', href: 'emails/drafts' },
      { label: 'Spam', value: 'email-spam', href: 'emails/spam' },
      { label: 'Papierkorb', value: 'email-trash', href: 'emails/trash' },
    ],
  },
  {
    label: 'Buchhaltung',
    icon: FiCalculator,
    value: 'finance',
    subItems: [
      {
        label: 'Angebote',
        value: 'quotes',
        href: 'finance/quotes',
        subItems: [
          { label: 'Angebot erstellen', value: 'quotes-create', href: 'finance/quotes/create' },
          {
            label: 'Auftragsbestätigungen',
            value: 'quotes-confirmations',
            href: 'finance/order-confirmations',
          },
          {
            label: 'Lieferscheine',
            value: 'quotes-delivery-notes',
            href: 'finance/delivery-notes',
          },
        ],
      },
      {
        label: 'Rechnungen',
        value: 'invoices',
        href: 'finance/invoices',
        subItems: [
          {
            label: 'Rechnung erstellen',
            value: 'invoices-create',
            href: 'finance/invoices/create',
          },
          {
            label: 'Wiederkehrend',
            value: 'invoices-recurring',
            href: 'finance/invoices/recurring',
          },
          { label: 'Mahnungen', value: 'invoices-reminders', href: 'finance/reminders' },
          { label: 'Gutschriften', value: 'invoices-credits', href: 'finance/credits' },
        ],
      },
      {
        label: 'Ausgaben',
        value: 'expenses',
        href: 'finance/expenses',
        subItems: [
          {
            label: 'Wiederkehrend',
            value: 'expenses-recurring',
            href: 'finance/expenses/recurring',
          },
          { label: 'Anlagen', value: 'expenses-assets', href: 'finance/expenses/assets' },
        ],
      },
      {
        label: 'Steuern',
        value: 'taxes',
        href: 'finance/taxes',
      },
      {
        label: 'Auswertung',
        value: 'reports',
        href: 'finance/reports',
      },
      {
        label: 'DATEV',
        value: 'datev',
        href: 'datev',
      },
      {
        label: 'Buchhaltungseinstellungen',
        value: 'accounting',
        href: 'finance/accounting',
        subItems: [
          { label: 'Übersicht', value: 'accounting-overview', href: 'finance/accounting' },
          { label: 'Kassenbuch', value: 'accounting-cashbook', href: 'finance/cashbook' },
          { label: 'E-Rechnungen', value: 'accounting-einvoices', href: 'finance/einvoices' },
          { label: 'Zahlungen', value: 'accounting-payments', href: 'finance/payments' },
        ],
      },
    ],
  },
  {
    label: 'Geschäftspartner',
    icon: FiUsers,
    value: 'contacts',
    href: 'finance/contacts',
  },
  {
    label: 'WhatsApp',
    icon: FiMessageCircle,
    value: 'whatsapp',
    href: 'whatsapp',
  },
  {
    label: 'Banking',
    icon: FiBanknote,
    value: 'banking',
    subItems: [
      { label: 'Konten', value: 'banking-accounts', href: 'banking/accounts' },
      { label: 'Kassenbuch', value: 'banking-cashbook', href: 'banking/cashbook' },
      {
        label: 'Unvollständige Zahlungen',
        value: 'banking-incomplete',
        href: 'banking/incomplete-transactions',
      },
    ],
  },
  {
    label: 'Lagerbestand',
    icon: FiBoxes,
    value: 'inventory',
    href: 'finance/inventory',
  },
  {
    label: 'Taskilo Advertising',
    icon: FiTrendingUp,
    value: 'advertising',
    href: 'taskilo-advertising',
    subItems: [
      { label: 'Dashboard', value: 'advertising-dashboard', href: 'taskilo-advertising' },
      {
        label: 'Google Ads',
        value: 'advertising-google',
        href: 'taskilo-advertising/google-ads',
        subItems: [
          {
            label: 'Kampagnen',
            value: 'google-ads-campaigns',
            href: 'taskilo-advertising/google-ads/campaigns',
          },
          {
            label: 'Neue Kampagne',
            value: 'google-ads-new-campaign',
            href: 'taskilo-advertising/google-ads/campaigns/new',
          },
          {
            label: 'Zielvorhaben',
            value: 'google-ads-goals',
            href: 'taskilo-advertising/google-ads/goals',
          },
          {
            label: 'Tools',
            value: 'google-ads-tools',
            href: 'taskilo-advertising/google-ads/tools',
          },
          {
            label: 'Abrechnung',
            value: 'google-ads-billing',
            href: 'taskilo-advertising/google-ads/billing',
          },
          {
            label: 'Verwaltung',
            value: 'google-ads-management',
            href: 'taskilo-advertising/google-ads/management',
          },
        ],
      },
      {
        label: 'LinkedIn Ads',
        value: 'advertising-linkedin',
        href: 'taskilo-advertising/linkedin',
      },
      { label: 'Meta Ads', value: 'advertising-meta', href: 'taskilo-advertising/meta' },
      { label: 'Analytics', value: 'advertising-analytics', href: 'taskilo-advertising/analytics' },
    ],
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
    label: 'Recruiting',
    icon: FiBriefcase,
    value: 'recruiting',
    href: 'recruiting',
    subItems: [
      { label: 'Unternehmensprofil', value: 'recruiting-profile', href: 'recruiting/profile' },
      { label: 'Stellenanzeigen', value: 'recruiting-jobs', href: 'recruiting' },
      { label: 'Neue Anzeige', value: 'recruiting-create', href: 'recruiting/create' },
      { label: 'Bewerbungen', value: 'recruiting-applications', href: 'recruiting/applications' },
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
      { label: 'Zeiterfassung', value: 'workspace-time-tracking', href: 'finance/time-tracking' },
      { label: 'Board-Ansicht', value: 'workspace-board', href: 'workspace?view=board' },
      { label: 'Listen-Ansicht', value: 'workspace-list', href: 'workspace?view=list' },
      { label: 'Kalender-Ansicht', value: 'workspace-calendar', href: 'workspace?view=calendar' },
    ],
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
      { label: 'E-Mail Integration', value: 'settings-email', href: 'email-integration' },
    ],
  },
];

// Eingeschränkte Navigation für Mitarbeiter (keine Admin-Bereiche)
const employeeNavigationItems: NavigationItem[] = [
  {
    label: 'Übersicht',
    icon: FiGrid,
    value: 'dashboard',
  },
  {
    label: 'Kalender',
    icon: FiCalendar,
    value: 'calendar',
    href: 'calendar',
  },
  {
    label: 'Mein Bereich',
    icon: FiUser,
    value: 'personal-self',
    subItems: [
      { label: 'Dienstplan', value: 'personal-schedule', href: 'personal/schedule' },
      { label: 'Arbeitszeit', value: 'personal-timesheet', href: 'personal/timesheet' },
      { label: 'Urlaub & Abwesenheit', value: 'personal-absence', href: 'personal/absence' },
      { label: 'Meine Dokumente', value: 'personal-documents', href: 'personal/documents' },
    ],
  },
  {
    label: 'Workspace',
    icon: FiFolder,
    value: 'workspace',
    subItems: [
      { label: 'Übersicht', value: 'workspace-overview', href: 'workspace' },
      { label: 'Meine Aufgaben', value: 'workspace-tasks', href: 'workspace?type=task' },
      { label: 'Zeiterfassung', value: 'workspace-time-tracking', href: 'finance/time-tracking' },
    ],
  },
  {
    label: 'Support',
    icon: FiHelpCircle,
    value: 'support',
    href: 'support',
  },
];

// Berechtigungen für Mitarbeiter-Dashboard-Zugang
export interface EmployeePermissions {
  overview: boolean;
  personal: boolean;
  employees: boolean;
  shiftPlanning: boolean;
  timeTracking: boolean;
  absences: boolean;
  evaluations: boolean;
  orders: boolean;
  quotes: boolean;
  invoices: boolean;
  customers: boolean;
  calendar: boolean;
  workspace: boolean;
  finance: boolean;
  expenses: boolean;
  inventory: boolean;
  settings: boolean;
}

interface CompanySidebarProps {
  companyName?: string;
  uid: string;
  expandedItems: string[];
  onToggleExpanded: (itemValue: string) => void;
  onNavigate: (value: string, href?: string) => void;
  getCurrentView: () => string;
  isCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
  isEmployee?: boolean; // Mitarbeiter-Modus
  employeePermissions?: EmployeePermissions; // Berechtigungen für Mitarbeiter
}

// Prüfe ob alle Permissions aktiviert sind (voller Zugang wie Inhaber)
function hasFullAccess(permissions: EmployeePermissions): boolean {
  return (
    permissions.overview &&
    permissions.personal &&
    permissions.employees &&
    permissions.shiftPlanning &&
    permissions.timeTracking &&
    permissions.absences &&
    permissions.evaluations &&
    permissions.orders &&
    permissions.quotes &&
    permissions.invoices &&
    permissions.customers &&
    permissions.calendar &&
    permissions.workspace &&
    permissions.finance &&
    permissions.expenses &&
    permissions.inventory &&
    permissions.settings
  );
}

// Funktion um Navigation basierend auf Berechtigungen zu filtern
function getEmployeeNavigation(permissions: EmployeePermissions, allNavItems: NavigationItem[]): NavigationItem[] {
  // Bei vollem Zugang: Komplette Navigation wie Inhaber
  if (hasFullAccess(permissions)) {
    console.log('[CompanySidebar] Full access detected - using complete navigation');
    return allNavItems;
  }
  const filteredItems: NavigationItem[] = [];

  // Übersicht
  if (permissions.overview) {
    filteredItems.push({
      label: 'Übersicht',
      icon: FiGrid,
      value: 'dashboard',
    });
  }

  // Kalender
  if (permissions.calendar) {
    filteredItems.push({
      label: 'Kalender',
      icon: FiCalendar,
      value: 'calendar',
      href: 'calendar',
    });
  }

  // Personal-Bereich (wenn mindestens eine Berechtigung)
  if (permissions.personal || permissions.shiftPlanning || permissions.timeTracking || permissions.absences) {
    const personalSubItems: NavigationSubItem[] = [];
    
    if (permissions.shiftPlanning) {
      personalSubItems.push({ label: 'Dienstplan', value: 'personal-schedule', href: 'personal/schedule' });
    }
    if (permissions.timeTracking) {
      personalSubItems.push({ label: 'Zeiterfassung', value: 'personal-timesheet', href: 'personal/timesheet' });
    }
    if (permissions.absences) {
      personalSubItems.push({ label: 'Urlaub & Abwesenheit', value: 'personal-absence', href: 'personal/absence' });
    }
    
    if (personalSubItems.length > 0) {
      filteredItems.push({
        label: 'Mein Bereich',
        icon: FiUser,
        value: 'personal-self',
        subItems: personalSubItems,
      });
    }
  }

  // Mitarbeiter-Verwaltung (für Schichtleiter etc.)
  if (permissions.employees) {
    filteredItems.push({
      label: 'Mitarbeiter',
      icon: FiUsers,
      value: 'personal-employees',
      href: 'personal/employees',
    });
  }

  // Auswertungen
  if (permissions.evaluations) {
    filteredItems.push({
      label: 'Auswertungen',
      icon: FiBarChart3,
      value: 'personal-evaluations',
      href: 'personal/evaluations',
    });
  }

  // Aufträge
  if (permissions.orders) {
    filteredItems.push({
      label: 'Aufträge',
      icon: FiClipboardList,
      value: 'orders',
      href: 'orders/overview',
    });
  }

  // Angebote
  if (permissions.quotes) {
    filteredItems.push({
      label: 'Angebote',
      icon: FiFileText,
      value: 'quotes',
      href: 'quotes',
    });
  }

  // Rechnungen
  if (permissions.invoices) {
    filteredItems.push({
      label: 'Rechnungen',
      icon: FiDollarSign,
      value: 'invoices',
      href: 'invoices',
    });
  }

  // Kunden
  if (permissions.customers) {
    filteredItems.push({
      label: 'Kunden',
      icon: FiUserPlus,
      value: 'customers',
      href: 'customers',
    });
  }

  // Workspace
  if (permissions.workspace) {
    filteredItems.push({
      label: 'Workspace',
      icon: FiFolder,
      value: 'workspace',
      subItems: [
        { label: 'Übersicht', value: 'workspace-overview', href: 'workspace' },
        { label: 'Meine Aufgaben', value: 'workspace-tasks', href: 'workspace?type=task' },
      ],
    });
  }

  // Finanzen
  if (permissions.finance) {
    const financeSubItems: NavigationSubItem[] = [
      { label: 'Übersicht', value: 'finance-overview', href: 'finance' },
    ];
    if (permissions.expenses) {
      financeSubItems.push({ label: 'Ausgaben', value: 'finance-expenses', href: 'finance/expenses' });
    }
    filteredItems.push({
      label: 'Finanzen',
      icon: FiDollarSign,
      value: 'finance',
      subItems: financeSubItems,
    });
  }

  // Lager
  if (permissions.inventory) {
    filteredItems.push({
      label: 'Lager',
      icon: FiBoxes,
      value: 'inventory',
      href: 'inventory',
    });
  }

  // Einstellungen (nur eigenes Profil)
  if (permissions.settings) {
    filteredItems.push({
      label: 'Einstellungen',
      icon: FiSettings,
      value: 'settings',
      href: 'settings?view=profile',
    });
  }

  // Support immer zeigen
  filteredItems.push({
    label: 'Support',
    icon: FiHelpCircle,
    value: 'support',
    href: 'support',
  });

  return filteredItems;
}

export default function CompanySidebar({
  companyName,
  uid,
  expandedItems,
  onToggleExpanded,
  onNavigate,
  getCurrentView,
  isCollapsed: isCollapsedProp,
  onToggleCollapsed,
  isEmployee = false,
  employeePermissions,
}: CompanySidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Die effektive User-ID für benutzer-spezifische E-Mails
  const effectiveUserId = user?.uid || uid;
  
  const [hasBankConnection, setHasBankConnection] = useState(false);
  const [unreadEmailCounts, setUnreadEmailCounts] = useState<Record<string, number>>({
    inbox: 0,
    sent: 0,
    drafts: 0,
    spam: 0,
    trash: 0,
  });
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [checkingBankConnection, setCheckingBankConnection] = useState(true);

  // Use prop if provided, otherwise use local state
  const isCollapsed = isCollapsedProp ?? false;

  const handleToggleCollapsed = () => {
    const newValue = !isCollapsed;
    if (onToggleCollapsed) {
      onToggleCollapsed(newValue);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', newValue.toString());
    }
  };

  // Prüfe ob Bankkonten über FinAPI verbunden sind
  useEffect(() => {
    let isMounted = true; // Cleanup-Flag

    const checkBankConnections = async () => {
      // Warte kurz bevor API-Call (für SSR-Kompatibilität)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if component is still mounted
      if (!isMounted) return;

      try {
        setCheckingBankConnection(true);

        // Prüfe ob wir im Browser sind
        if (typeof window === 'undefined') {
          if (isMounted) setHasBankConnection(false);
          return;
        }

        // Prüfe ob die API verfügbar ist
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(`/api/finapi/accounts-enhanced?userId=${uid}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        // Check if component is still mounted before updating state
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          // Wenn Accounts existieren und mindestens ein Account verbunden ist
          const hasConnections = data.success && data.accounts && data.accounts.length > 0;
          setHasBankConnection(hasConnections);
        } else {
          // API nicht verfügbar - setze Standard-Wert
          setHasBankConnection(false);
        }
      } catch (error) {
        // Check if component is still mounted before updating state
        if (!isMounted) return;

        // Fehler ignorieren und Standard-Wert setzen (keine Bank-Connection)
        setHasBankConnection(false);

        // Nur loggen wenn es nicht ein AbortError ist
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Bank-Verbindung konnte nicht geprüft werden:', error.message);
        }
      } finally {
        if (isMounted) {
          setCheckingBankConnection(false);
        }
      }
    };

    if (uid) {
      checkBankConnections();
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [uid]);

  // Load unread email counts for all folders
  useEffect(() => {
    let isMounted = true;

    const loadUnreadCounts = async () => {
      try {
        // Use single API call to get all counts - with userId for user-specific emails
        const response = await fetch(`/api/company/${uid}/emails/counts?userId=${effectiveUserId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.counts) {
            // Extract unread counts from the response
            const unreadCounts: Record<string, number> = {};
            Object.keys(data.counts).forEach(folder => {
              unreadCounts[folder] = data.counts[folder].unread || 0;
            });

            if (isMounted) {
              setUnreadEmailCounts(unreadCounts);
            }
          }
        }
      } catch (error) {
        console.error('Error loading email counts:', error);
      }
    };

    // Only load counts when on email pages
    const isEmailPage = pathname?.includes('/emails');

    if (uid && isEmailPage) {
      // Initial load nur auf E-Mail-Seiten
      loadUnreadCounts();
      
      // Kein Polling mehr - spart API-Kosten
      // E-Mails werden nur bei Seitenwechsel aktualisiert
    }

    return () => {
      isMounted = false;
    };
  }, [uid, pathname, effectiveUserId]);

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

    // Recruiting aktiv wenn Recruiting-Pfad
    if (item.value === 'recruiting') {
      return pathname?.includes('/recruiting');
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

    // Advertising aktiv wenn Pfad /taskilo-advertising
    if (item.value === 'advertising') {
      return pathname?.includes('/taskilo-advertising');
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

    // Standard URL-Pfad Matching für alle Untermenüs

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
      <div ref={sidebarRef} className="flex flex-col bg-white h-full w-full" style={{ maxHeight }}>
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
          <div className="flex items-center shrink-0 px-4 mb-5 justify-between">
            {!isCollapsed && (
              <div className="flex items-center flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">Dashboard</h2>
                {companyName && (
                  <span className="ml-2 text-sm text-gray-500 truncate">{companyName}</span>
                )}
              </div>
            )}
            <button
              onClick={handleToggleCollapsed}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors shrink-0"
              title={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
            >
              {isCollapsed ? (
                <FiPanelLeftOpen className="h-5 w-5" />
              ) : (
                <FiPanelLeftClose className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1">
            {/* Verwende dynamische Mitarbeiter-Navigation basierend auf Berechtigungen, oder vollständige Navigation */}
            {(() => {
              let navItems: NavigationItem[];
              if (isEmployee && employeePermissions) {
                // Dynamische Navigation basierend auf Admin-definierten Berechtigungen
                navItems = getEmployeeNavigation(employeePermissions, navigationItems);
              } else if (isEmployee) {
                // Fallback auf Standard-Mitarbeiter-Navigation
                navItems = employeeNavigationItems;
              } else {
                // Vollständige Navigation für Admin/Inhaber
                navItems = navigationItems;
              }
              return navItems;
            })().map(item => {
              const isMainActive = isItemActive(item);
              const isItemExpanded = isExpanded(item.value);

              // Filtere SubItems für Banking: Blende "Dashboard" aus wenn Bankkonto verbunden
              let filteredSubItems = item.subItems;
              if (item.value === 'banking' && hasBankConnection && item.subItems) {
                filteredSubItems = item.subItems.filter(
                  subItem => subItem.value !== 'banking-overview'
                );
              }

              const hasSubItems = filteredSubItems && filteredSubItems.length > 0;

              return (
                <div key={item.value}>
                  {/* Main Button */}
                  <button
                    onClick={async () => {
                      // ✅ Gmail-Verbindungsprüfung für E-Mail-Menü (mit userId)
                      if (item.value === 'email') {
                        console.log('🔍 E-Mail Icon geklickt, prüfe Email-Status für User:', effectiveUserId);
                        try {
                          // Prüfe zuerst Webmail-Status
                          const webmailUrl = `/api/company/${uid}/webmail-connect`;
                          console.log('📡 Webmail API-Aufruf:', webmailUrl);
                          
                          const webmailResponse = await fetch(webmailUrl);
                          if (webmailResponse.ok) {
                            const webmailData = await webmailResponse.json();
                            console.log('📋 Webmail status response:', webmailData);
                            
                            if (webmailData.connected) {
                              console.log('✅ Webmail verbunden, navigiere zum Posteingang');
                              onNavigate('email-inbox', 'emails');
                              onToggleExpanded(item.value);
                              return;
                            }
                          }
                          
                          // Fallback: Prüfe Gmail-Status
                          const apiUrl = `/api/company/${uid}/gmail-auth-status?userId=${effectiveUserId}`;
                          console.log('📡 Gmail API-Aufruf:', apiUrl);

                          const response = await fetch(apiUrl);
                          console.log('📨 Response Status:', response.status, response.statusText);

                          if (!response.ok) {
                            console.error(
                              '❌ API-Response nicht OK:',
                              response.status,
                              response.statusText
                            );
                            onNavigate('email-integration', 'email-integration');
                            return;
                          }

                          const data = await response.json();
                          console.log(
                            '📋 Gmail auth status response:',
                            JSON.stringify(data, null, 2)
                          );

                          // Prüfe auf gültige Verbindung
                          const hasValidConnection =
                            data.hasConfig &&
                            data.hasTokens &&
                            !data.tokenExpired &&
                            data.status !== 'authentication_required';

                          console.log('🔐 Verbindungs-Check:', {
                            hasConfig: data.hasConfig,
                            hasTokens: data.hasTokens,
                            tokenExpired: data.tokenExpired,
                            status: data.status,
                            hasValidConnection,
                          });

                          if (!hasValidConnection) {
                            console.log(
                              '❌ Keine gültige Verbindung, weiterleitung zur Integration'
                            );
                            onNavigate('email-integration', 'email-integration');
                            return;
                          } else {
                            console.log('✅ Gültige Gmail Verbindung, navigiere zum Posteingang');
                            onNavigate('email-inbox', 'emails');
                            onToggleExpanded(item.value);
                            return;
                          }
                        } catch (error) {
                          console.error('💥 Email connection check failed:', error);
                          console.error('💥 Error details:', {
                            name: (error as Error).name,
                            message: (error as Error).message,
                            stack: (error as Error).stack,
                          });
                          // Bei Fehler zur Integration weiterleiten
                          onNavigate('email-integration', 'email-integration');
                          return;
                        }
                      }

                      // ✅ Immer zuerst navigieren, auch bei Items mit SubItems
                      if (item.href) {
                        onNavigate(item.value, item.href);
                      } else if (item.value === 'dashboard') {
                        // Dashboard hat keine href, also explizit navigieren
                        onNavigate(item.value);
                      } else if (item.value === 'finance') {
                        // Finance zur Hauptseite navigieren
                        onNavigate(item.value, 'finance');
                      } else if (item.value === 'tasker') {
                        // Tasker zur Orders Overview navigieren
                        onNavigate(item.value, 'orders/overview');
                      } else if (item.value === 'contacts') {
                        // Contacts hat bereits href
                        onNavigate(item.value, item.href);
                      } else if (item.value === 'banking') {
                        // Banking zur Accounts-Seite navigieren
                        onNavigate(item.value, 'banking/accounts');
                      } else if (item.value === 'personal') {
                        // Personal zur Übersicht navigieren
                        onNavigate(item.value, 'personal');
                      } else if (item.value === 'workspace') {
                        // Workspace zur Übersicht navigieren
                        onNavigate(item.value, 'workspace');
                      } else if (item.value === 'settings') {
                        // Settings zur Allgemein-Seite navigieren
                        onNavigate('settings-general');
                      } else {
                        onNavigate(item.value);
                      }

                      // ✅ Zusätzlich SubItems expandieren falls vorhanden
                      if (hasSubItems) {
                        onToggleExpanded(item.value);
                      }
                    }}
                    className={`${
                      isMainActive
                        ? 'bg-[#14ad9f] text-white'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-2 py-2 text-sm font-medium rounded-md w-full transition-colors relative`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`${
                          isMainActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                        } ${isCollapsed ? '' : 'mr-3'} shrink-0 h-6 w-6`}
                      />
                      {!isCollapsed && item.label}
                    </div>
                    {hasSubItems && !isCollapsed && (
                      <FiChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isItemExpanded ? 'rotate-180' : ''
                        } ${isMainActive ? 'text-white' : 'text-gray-400'}`}
                      />
                    )}
                  </button>

                  {/* Sub Items */}
                  {hasSubItems && isItemExpanded && !isCollapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                      {/* E-Mail spezifische Elemente */}
                      {item.value === 'email' && (
                        <>
                          {/* Neue E-Mail Button */}
                          <button
                            onClick={() => onNavigate('email-compose', 'emails?compose=true')}
                            className="bg-teal-600 hover:bg-teal-700 text-white group flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md w-full transition-colors mb-3"
                          >
                            <FiUserPlus className="mr-2 h-4 w-4" />
                            Neue E-Mail
                          </button>

                          {/* E-Mail Suchfeld */}
                          <div className="relative mb-3">
                            <input
                              type="text"
                              placeholder="E-Mails durchsuchen..."
                              value={emailSearchQuery}
                              onChange={e => setEmailSearchQuery(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && emailSearchQuery.trim()) {
                                  // Navigate to inbox with search query
                                  onNavigate(
                                    'email-inbox',
                                    `emails?search=${encodeURIComponent(emailSearchQuery.trim())}`
                                  );
                                }
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        </>
                      )}

                      {filteredSubItems?.map(subItem => {
                        const isSubActive = isSubItemActive(subItem);
                        const hasSubSubItems = subItem.subItems && subItem.subItems.length > 0;

                        return (
                          <div key={subItem.value}>
                            <button
                              onClick={() => {
                                console.log('🔍 SubItem Click:', {
                                  label: subItem.label,
                                  value: subItem.value,
                                  href: subItem.href,
                                  fullURL: subItem.href
                                    ? `/dashboard/company/${uid}/${subItem.href}`
                                    : 'NO_HREF',
                                });
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
                              } group flex items-center justify-between px-2 py-1.5 text-sm rounded-md w-full transition-colors`}
                            >
                              <div className="flex items-center">
                                {hasSubSubItems ? (
                                  <span
                                    onClick={e => {
                                      e.stopPropagation();
                                      onToggleExpanded(subItem.value);
                                    }}
                                    className="mr-2 hover:bg-white/20 rounded p-0.5 cursor-pointer inline-flex"
                                  >
                                    {expandedItems.includes(subItem.value) ? (
                                      <FiChevronDown className="h-4 w-4" />
                                    ) : (
                                      <FiChevronRight className="h-4 w-4" />
                                    )}
                                  </span>
                                ) : (
                                  <FiChevronRight className="mr-2 h-4 w-4" />
                                )}
                                {subItem.label}
                              </div>
                              {/* E-Mail Zähler */}
                              {item.value === 'email' &&
                                (() => {
                                  // Map subItem value to folder name
                                  const folderMap: Record<string, string> = {
                                    'email-inbox': 'inbox',
                                    'email-sent': 'sent',
                                    'email-drafts': 'drafts',
                                    'email-spam': 'spam',
                                    'email-trash': 'trash',
                                  };
                                  const folder = folderMap[subItem.value];
                                  const count = folder ? unreadEmailCounts[folder] : 0;

                                  return count > 0 ? (
                                    <span className="bg-[#14ad9f] text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                      {count}
                                    </span>
                                  ) : null;
                                })()}
                            </button>

                            {/* 3. Ebene: Sub-Sub-Items */}
                            {hasSubSubItems && expandedItems.includes(subItem.value) && (
                              <div className="ml-6 mt-1 space-y-1">
                                {subItem.subItems?.map(subSubItem => {
                                  const isSubSubActive = pathname?.includes(subSubItem.href || '');

                                  return (
                                    <button
                                      key={subSubItem.value}
                                      onClick={() => {
                                        if (subSubItem.href) {
                                          onNavigate(subSubItem.value, subSubItem.href);
                                        }
                                      }}
                                      className={`${
                                        isSubSubActive
                                          ? 'bg-[#14ad9f] text-white'
                                          : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                      } group flex items-center px-2 py-1.5 text-xs rounded-md w-full transition-colors`}
                                    >
                                      <span className="mr-2">•</span>
                                      {subSubItem.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* E-Mail Quick Actions */}
                      {item.value === 'email' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => onNavigate('email-favorites', 'emails/starred')}
                            className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 group flex items-center px-2 py-1.5 text-sm rounded-md w-full transition-colors justify-between"
                          >
                            <div className="flex items-center">
                              <FiChevronRight className="mr-2 h-4 w-4" />
                              Favoriten
                            </div>
                            {unreadEmailCounts.starred > 0 && (
                              <span className="ml-auto bg-[#14ad9f] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                {unreadEmailCounts.starred}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => onNavigate('email-archive', 'emails/archived')}
                            className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 group flex items-center px-2 py-1.5 text-sm rounded-md w-full transition-colors justify-between"
                          >
                            <div className="flex items-center">
                              <FiChevronRight className="mr-2 h-4 w-4" />
                              Archiv
                            </div>
                            {unreadEmailCounts.archived > 0 && (
                              <span className="ml-auto bg-[#14ad9f] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                {unreadEmailCounts.archived}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => onNavigate('email-settings', 'email-integration')}
                            className="text-gray-500 hover:bg-gray-50 hover:text-gray-700 group flex items-center px-2 py-1.5 text-sm rounded-md w-full transition-colors"
                          >
                            <FiChevronRight className="mr-2 h-4 w-4" />
                            Einstellungen
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Storage Card direkt nach Einstellungen Button */}
                  {item.value === 'settings' && !isCollapsed && (
                    <div className="mt-2 px-2 space-y-2">
                      <StorageCardSidebar companyId={uid} />
                      <CurrentPlanCard companyId={uid} />
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
