// /Users/andystaudinger/Taskilo/src/app/dashboard/company/[uid]/layout.tsx
'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import UserHeader from '@/components/UserHeader';
import CompanySidebar from '@/components/dashboard/CompanySidebar';
import CompanyMobileSidebar from '@/components/dashboard/CompanyMobileSidebar';
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
  Mail as FiMail,
  ClipboardList as FiClipboardList,
  Banknote as FiBanknote,
  Users as FiUsers,
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
      !pathname?.includes('/banking') &&
      !expandedItems.includes('finance')
    ) {
      setExpandedItems(prev => [...prev, 'finance']);
    }
    if (pathname?.includes('/finance/banking') && !expandedItems.includes('banking')) {
      setExpandedItems(prev => [...prev, 'banking']);
    }
    if (pathname?.includes('/personal') && !expandedItems.includes('personal')) {
      setExpandedItems(prev => [...prev, 'personal']);
    }
    if (pathname?.includes('/google-ads') && !expandedItems.includes('google-ads')) {
      setExpandedItems(prev => [...prev, 'google-ads']);
    }
  }, [pathname, expandedItems]);

  // Den Hook verwenden, um Unternehmensdaten und -zustand abzurufen
  const { isChecking, isAuthorized, userData, view, setView } = useCompanyDashboard();

  // Bestimme den aktuellen Pfad für die Navigation
  const getCurrentView = useCallback(() => {
    if (pathname?.includes('/banking')) return 'banking';
    if (pathname?.includes('/finance')) return 'finance';
    if (pathname?.includes('/payouts')) return 'finance';
    if (pathname?.includes('/orders')) return 'orders';
    if (pathname?.includes('/inbox')) return 'inbox';
    if (pathname?.includes('/profile')) return 'profile';
    if (pathname?.includes('/calendar')) return 'calendar';
    if (pathname?.includes('/reviews')) return 'reviews';
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
      case 'finance':
        return FiDollarSign;
      case 'reviews':
        return FiMessageSquare;
      case 'profile':
        return FiUser;
      case 'settings':
        return FiSettings;
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
      case 'finance':
        return 'Finanzen';
      case 'reviews':
        return 'Bewertungen';
      case 'profile':
        return 'Profil';
      case 'settings':
        return 'Einstellungen';
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
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarVisibilityProvider>
  );
}
