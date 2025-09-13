// /Users/andystaudinger/Taskilo/src/app/dashboard/company/[uid]/layout.tsx
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import UserHeader from '@/components/UserHeader';
import CompanySidebar from '@/components/dashboard/CompanySidebar';
import CompanyMobileSidebar from '@/components/dashboard/CompanyMobileSidebar';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { useAuth } from '@/contexts/AuthContext';
import AdminApprovalStatus from '@/components/AdminApprovalStatus';
import { Loader2 as FiLoader } from 'lucide-react';
import {
  Grid as FiGrid,
  Calendar as FiCalendar,
  User as FiUser,
  Settings as FiSettings,
  MessageSquare as FiMessageSquare,
  DollarSign as FiDollarSign,
  Mail as FiMail,
  ClipboardList as FiClipboardList,
  Banknote as FiBanknote,
  Users as FiUsers,
  HelpCircle as FiHelpCircle,
  FileText as FiFileText,
  Folder as FiFolder,
  Shield as FiShield,
} from 'lucide-react';

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim() !== '';

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const uid = typeof params?.uid === 'string' ? params.uid : '';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // AuthContext für zusätzliche Fallback-Daten
  const { user } = useAuth();

  const toggleExpanded = (itemValue: string) => {
    setExpandedItems(prev =>
      prev.includes(itemValue) ? prev.filter(v => v !== itemValue) : [...prev, itemValue]
    );
  };

  const isExpanded = (itemValue: string) => expandedItems.includes(itemValue);

  // Auto-expand Finance section when on finance pages
  useEffect(() => {
    if (
      pathname?.includes('/finance') &&
      !pathname?.includes('/finance/einvoices') &&
      !pathname?.includes('/finance/invoices') &&
      !pathname?.includes('/finance/delivery-notes') &&
      !pathname?.includes('/finance/expenses') &&
      !pathname?.includes('/finance/payments') &&
      !pathname?.includes('/banking') &&
      !expandedItems.includes('finance')
    ) {
      setExpandedItems(prev => [...prev, 'finance']);
    }
    if (
      (pathname?.includes('/finance/invoices') ||
        pathname?.includes('/finance/einvoices') ||
        pathname?.includes('/finance/delivery-notes') ||
        pathname?.includes('/finance/expenses') ||
        pathname?.includes('/finance/invoices/create') ||
        pathname?.includes('/finance/reminders') ||
        pathname?.includes('/finance/credits') ||
        pathname?.includes('/finance/cashbook')) &&
      !expandedItems.includes('invoices')
    ) {
      setExpandedItems(prev => [...prev, 'invoices']);
    }
    if (
      (pathname?.includes('/banking') || pathname?.includes('/finance/payments')) &&
      !expandedItems.includes('banking')
    ) {
      setExpandedItems(prev => [...prev, 'banking']);
    }
    if (
      (pathname?.includes('/finance/projects') || pathname?.includes('/finance/time-tracking')) &&
      !expandedItems.includes('projects')
    ) {
      setExpandedItems(prev => [...prev, 'projects']);
    }
    if (pathname?.includes('/personal') && !expandedItems.includes('personal')) {
      setExpandedItems(prev => [...prev, 'personal']);
    }
    if (
      pathname?.includes('/taskilo-advertising') &&
      !expandedItems.includes('taskilo-advertising')
    ) {
      setExpandedItems(prev => [...prev, 'taskilo-advertising']);
    }
    // Steuerportal automatisch ausklappen bei /steuerportal/*, /datev/* oder finance Steuern/Auswertung
    if (
      (pathname?.includes('/steuerportal') ||
        pathname?.includes('/datev') ||
        pathname?.includes('/finance/taxes') ||
        pathname?.includes('/finance/reports')) &&
      !expandedItems.includes('steuerportal')
    ) {
      setExpandedItems(prev => [...prev, 'steuerportal']);
    }
  }, [pathname, expandedItems]);

  // Den Hook verwenden, um Unternehmensdaten und -zustand abzurufen
  const { isChecking, isAuthorized, userData, view, setView } = useCompanyDashboard();

  // Zentrale Weiterleitung: Ist die Prüfung abgeschlossen und der Nutzer nicht autorisiert,
  // leite auf die Login-Seite weiter und bewahre den Rückkehrpfad.
  useEffect(() => {
    if (!isChecking && !isAuthorized) {
      const currentPath =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : pathname || '';
      router.replace(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  }, [isChecking, isAuthorized, router, pathname]);

  // Bestimme den aktuellen Pfad für die Navigation
  const getCurrentView = useCallback(() => {
    if (pathname?.includes('/banking')) return 'banking';
    if (
      pathname?.includes('/finance/invoices') ||
      pathname?.includes('/finance/einvoices') ||
      pathname?.includes('/finance/delivery-notes') ||
      pathname?.includes('/finance/expenses') ||
      pathname?.includes('/finance/invoices/create') ||
      pathname?.includes('/finance/reminders') ||
      pathname?.includes('/finance/credits') ||
      pathname?.includes('/finance/cashbook')
    )
      return 'invoices';
    if (pathname?.includes('/finance/projects') || pathname?.includes('/finance/time-tracking'))
      return 'projects';
    if (pathname?.includes('/finance')) return 'finance';
    if (pathname?.includes('/payouts')) return 'finance';
    if (
      pathname?.includes('/steuerportal') ||
      pathname?.includes('/datev') ||
      pathname?.includes('/finance/taxes') ||
      pathname?.includes('/finance/reports')
    )
      return 'steuerportal';
    if (pathname?.includes('/orders')) return 'orders';
    if (pathname?.includes('/inbox')) return 'inbox';
    if (pathname?.includes('/profile')) return 'profile';
    if (pathname?.includes('/calendar')) return 'calendar';
    if (pathname?.includes('/reviews')) return 'reviews';
    if (pathname?.includes('/support')) return 'support';
    if (pathname?.includes('/taskilo-advertising')) return 'taskilo-advertising';
    return view;
  }, [pathname, view]);

  // Unternehmensdaten für die Header-Komponente vorbereiten - VERBESSERTE FALLBACK-LOGIK
  const companyDataForHeader = useMemo(() => {
    if (!uid) return null;

    // Verschiedene Datenquellen für den Firmennamen prüfen
    let companyName = 'Unbekannte Firma'; // Standard-Fallback

    // 1. Priorität: step2.companyName (aus Onboarding)
    if (isNonEmptyString(userData?.step2?.companyName)) {
      companyName = userData.step2.companyName;
    }
    // 2. Priorität: direktes companyName Feld
    else if (isNonEmptyString(userData?.companyName)) {
      companyName = userData.companyName;
    }
    // 3. Priorität: AuthContext User-Daten (Name als Firmenname)
    else if (user && isNonEmptyString(user.firstName) && isNonEmptyString(user.lastName)) {
      companyName = `${user.firstName} ${user.lastName}`;
    } else if (user && isNonEmptyString(user.firstName)) {
      companyName = user.firstName;
    }
    // 5. Priorität: E-Mail als letzter Fallback (vor "Unbekannte Firma")
    else if (user && isNonEmptyString(user.email)) {
      companyName = user.email.split('@')[0]; // Nutze Teil vor @
    }

    // Debug-Log entfernt: Company Name Resolution

    return {
      uid: uid,
      companyName: companyName,
      logoUrl: undefined,
    };
  }, [uid, userData, user]);

  // Navigation handler
  const handleNavigation = useCallback(
    (value: string, href?: string) => {
      setIsSidebarOpen(false);

      // Wenn href definiert ist, verwende echte Navigation
      if (href) {
        router.push(`/dashboard/company/${uid}/${href}`);
        return;
      }

      // Settings-Unterseiten behandeln
      if (value.startsWith('settings-')) {
        const settingsView = value.replace('settings-', '');
        router.push(`/dashboard/company/${uid}/settings?view=${settingsView}`);
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

  // Nicht autorisiert: zeige kurzen Redirect-Hinweis (die useEffect oben führt die Weiterleitung aus)
  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Weiterleitung zum Login...
      </div>
    );
  }

  // Navigation Items für den aktuellen Header
  const getHeaderIcon = () => {
    const currentView = getCurrentView();
    switch (currentView) {
      case 'orders':
        return FiClipboardList;
      case 'inbox':
        return FiMail;
      case 'calendar':
        return FiCalendar;
      case 'banking':
        return FiBanknote;
      case 'invoices':
        return FiFileText;
      case 'finance':
        return FiDollarSign;
      case 'projects':
        return FiFolder;
      case 'reviews':
        return FiMessageSquare;
      case 'support':
        return FiHelpCircle;
      case 'profile':
        return FiUser;
      case 'settings':
        return FiSettings;
      case 'taskilo-advertising':
        return FiUsers;
      case 'steuerportal':
        return FiShield;
      default:
        return FiGrid;
    }
  };

  const getHeaderLabel = () => {
    const currentView = getCurrentView();
    switch (currentView) {
      case 'orders':
        return 'Aufträge';
      case 'inbox':
        return 'Posteingang';
      case 'calendar':
        return 'Kalender';
      case 'banking':
        return 'Banking';
      case 'invoices':
        return 'Rechnungen';
      case 'finance':
        return 'Finanzen';
      case 'projects':
        return 'Projekte';
      case 'reviews':
        return 'Bewertungen';
      case 'support':
        return 'Support Center';
      case 'profile':
        return 'Profil';
      case 'settings':
        return 'Einstellungen';
      case 'taskilo-advertising':
        return 'Taskilo Advertising';
      case 'steuerportal':
        return 'Steuerportal';
      default:
        return 'Übersicht';
    }
  };

  const HeaderIcon = getHeaderIcon();

  return (
    <SidebarVisibilityProvider>
      <div className="flex flex-col min-h-screen">
        <UserHeader currentUid={uid} />

        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex md:w-64 md:flex-col md:bg-white md:border-r md:border-gray-200">
            <CompanySidebar
              companyName={companyDataForHeader?.companyName}
              uid={uid}
              expandedItems={expandedItems}
              onToggleExpanded={toggleExpanded}
              onNavigate={handleNavigation}
              getCurrentView={getCurrentView}
            />
          </aside>

          {/* Mobile Sidebar */}
          <CompanyMobileSidebar
            isOpen={isSidebarOpen}
            onOpenChange={setIsSidebarOpen}
            expandedItems={expandedItems}
            onToggleExpanded={toggleExpanded}
            onNavigate={handleNavigation}
            getCurrentView={getCurrentView}
          />

          {/* Main Content */}
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="mb-8">
                  <div className="flex items-center space-x-2">
                    <HeaderIcon className="h-6 w-6 text-gray-600" />
                    <h1 className="text-2xl font-bold text-gray-900">{getHeaderLabel()}</h1>
                    <span className="text-sm text-gray-500">
                      {companyDataForHeader?.companyName}
                    </span>
                  </div>
                </div>

                {/* Admin Approval Status Banner */}
                <AdminApprovalStatus companyId={uid} className="mb-6" />

                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarVisibilityProvider>
  );
}
