'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/firebase/clients';
import UserHeader from '@/components/UserHeader';
import { MailHeader } from '@/components/webmail/MailHeader';
import AppHeaderNavigation from '@/components/AppHeaderNavigation';
import CompanySidebar, { type EmployeePermissions } from '@/components/dashboard/CompanySidebar';
import CompanyMobileSidebar from '@/components/dashboard/CompanyMobileSidebar';
import { SidebarVisibilityProvider } from '@/contexts/SidebarVisibilityContext';
import { useCompanyDashboard } from '@/hooks/useCompanyDashboard';
import { useAuth } from '@/contexts/AuthContext';
import AdminApprovalStatus from '@/components/AdminApprovalStatus';
import { useUpdateNotifications } from '@/hooks/useUpdateNotifications';
import UpdateNotificationModal from '@/components/ui/UpdateNotificationModal';
import { HelpChatbot } from '@/components/dashboard/HelpChatbot';
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
  
  // Header-Ref für dynamische Höhenmessung
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(124); // Fallback-Höhe

  // Sidebar Collapsed State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 1536;
    }
    return true;
  });

  // Resize Listener für automatisches Einklappen
  useEffect(() => {
    const handleResize = () => {
      const shouldCollapse = window.innerWidth < 1536;
      setIsSidebarCollapsed(shouldCollapse);
      localStorage.setItem('sidebar-collapsed', shouldCollapse.toString());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // AuthContext für zusätzliche Fallback-Daten
  const { user, firebaseUser } = useAuth();

  // Webmail-Verbindungsstatus
  const [isWebmailConnected, setIsWebmailConnected] = useState(false);
  const [webmailEmail, setWebmailEmail] = useState<string | null>(null);

  // Dynamische Header-Höhe messen
  useEffect(() => {
    const measureHeader = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        if (height > 0) {
          setHeaderHeight(height);
        }
      }
    };

    // Initial messen
    measureHeader();

    // Bei Resize neu messen
    window.addEventListener('resize', measureHeader);
    
    // ResizeObserver für präzisere Messung
    const resizeObserver = new ResizeObserver(measureHeader);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('resize', measureHeader);
      resizeObserver.disconnect();
    };
  }, [isWebmailConnected]);

  // Prüfe ob Webmail verbunden ist
  useEffect(() => {
    const checkWebmailConnection = async () => {
      if (!uid) return;
      try {
        const companyDoc = await getDoc(doc(db, 'companies', uid));
        if (companyDoc.exists()) {
          const webmailConfig = companyDoc.data()?.webmailConfig;
          if (webmailConfig?.status === 'connected' && webmailConfig?.email?.endsWith('@taskilo.de')) {
            setIsWebmailConnected(true);
            setWebmailEmail(webmailConfig.email);
          }
        }
      } catch (error) {
        console.error('[Layout] Error checking webmail connection:', error);
      }
    };
    checkWebmailConnection();
  }, [uid]);

  // Ermittle ob User der Owner dieser Company ist
  const isOwner = user?.user_type === 'firma' && user?.uid === uid;

  // Mitarbeiter-Daten aus Custom Claims (companyId, employeeId)
  const [employeeData, setEmployeeData] = useState<{
    companyId: string;
    employeeId: string;
    permissions?: Record<string, boolean>;
  } | null>(null);

  // Lade Mitarbeiter-Daten aus Custom Claims und Employee-Subcollection
  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!firebaseUser || isOwner) return;

      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const claims = tokenResult.claims as { role?: string; companyId?: string; employeeId?: string };

        if (claims.role === 'mitarbeiter' && claims.companyId && claims.employeeId) {
          const employeeRef = doc(db, 'companies', claims.companyId, 'employees', claims.employeeId);
          const employeeSnap = await getDoc(employeeRef);

          if (employeeSnap.exists()) {
            const empData = employeeSnap.data();
            setEmployeeData({
              companyId: claims.companyId,
              employeeId: claims.employeeId,
              permissions: empData.dashboardAccess?.permissions,
            });
          }
        }
      } catch (error) {
        console.error('[Layout] Error loading employee data:', error);
      }
    };

    loadEmployeeData();
  }, [firebaseUser, isOwner]);

  // Ermittle ob User ein Mitarbeiter ist
  const isEmployee = !!employeeData && employeeData.companyId === uid;

  // Redirect Mitarbeiter zur richtigen Company wenn auf falscher URL
  useEffect(() => {
    if (employeeData && employeeData.companyId !== uid) {
      router.replace(`/dashboard/company/${employeeData.companyId}`);
    }
  }, [employeeData, uid, router]);

  // Berechtigungen aus Employee-Subcollection
  const employeePermissions: EmployeePermissions | undefined = employeeData?.permissions
    ? (employeeData.permissions as unknown as EmployeePermissions)
    : isEmployee
      ? {
          overview: true,
          personal: true,
          employees: true,
          shiftPlanning: true,
          timeTracking: true,
          absences: true,
          evaluations: true,
          orders: true,
          quotes: true,
          invoices: true,
          customers: true,
          calendar: true,
          workspace: true,
          finance: true,
          expenses: true,
          inventory: true,
          settings: true,
        }
      : undefined;

  // Update Notifications
  const {
    unseenUpdates,
    unseenCount: _unseenCount,
    showNotificationModal,
    setShowNotificationModal,
    markUpdateAsSeen,
    markAllAsSeen,
    dismissUpdate,
  } = useUpdateNotifications();

  const toggleExpanded = (itemValue: string) => {
    setExpandedItems(prev =>
      prev.includes(itemValue) ? prev.filter(v => v !== itemValue) : [...prev, itemValue]
    );
  };

  const _isExpanded = (itemValue: string) => expandedItems.includes(itemValue);

  // Auto-expand sections when on specific pages
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
    if (pathname?.includes('/taskilo-advertising') && !expandedItems.includes('taskilo-advertising')) {
      setExpandedItems(prev => [...prev, 'taskilo-advertising']);
    }
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

  // Hook für Unternehmensdaten und -zustand
  const { isChecking, isAuthorized, userData, view, setView } = useCompanyDashboard();

  // Zentrale Weiterleitung wenn nicht autorisiert
  useEffect(() => {
    if (!isChecking && !isAuthorized) {
      const currentPath =
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}`
          : pathname || '';
      router.replace(`/?redirectTo=${encodeURIComponent(currentPath)}`);
    }
  }, [isChecking, isAuthorized, router, pathname]);

  // Bestimme den aktuellen View für die Navigation
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
    if (pathname?.includes('/taskilo-advertising')) return 'advertising';
    return view;
  }, [pathname, view]);

  // Unternehmensdaten für die Header-Komponente
  const companyDataForHeader = useMemo(() => {
    if (!uid) return null;

    let companyName = 'Unbekannte Firma';

    if (isNonEmptyString(userData?.step2?.companyName)) {
      companyName = userData.step2.companyName;
    } else if (isNonEmptyString(userData?.companyName)) {
      companyName = userData.companyName;
    } else if (user && isNonEmptyString(user.firstName) && isNonEmptyString(user.lastName)) {
      companyName = `${user.firstName} ${user.lastName}`;
    } else if (user && isNonEmptyString(user.firstName)) {
      companyName = user.firstName;
    } else if (user && isNonEmptyString(user.email)) {
      companyName = user.email.split('@')[0];
    }

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

      if (href) {
        const fullURL = `/dashboard/company/${uid}/${href}`;
        router.push(fullURL);
        return;
      }

      if (value.startsWith('settings-')) {
        const settingsView = value.replace('settings-', '');
        router.push(`/dashboard/company/${uid}/settings?view=${settingsView}`);
        return;
      }

      if (value === 'settings' || value === 'reviews') {
        router.push(`/dashboard/company/${uid}?view=${value}`);
        setView(value);
        return;
      }

      if (value === 'dashboard') {
        router.push(`/dashboard/company/${uid}`);
        setView('dashboard');
        return;
      }
    },
    [router, uid, setView]
  );

  // Loading State
  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Lade Dashboard...
      </div>
    );
  }

  // Nicht autorisiert
  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <FiLoader className="animate-spin text-4xl text-[#14ad9f] mr-3" />
        Weiterleitung zum Login...
      </div>
    );
  }

  // Header Icon basierend auf aktuellem View
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
      case 'advertising':
        return FiUsers;
      case 'steuerportal':
        return FiShield;
      default:
        return FiGrid;
    }
  };

  // Header Label basierend auf aktuellem View
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
      case 'advertising':
        return 'Taskilo Advertising';
      case 'steuerportal':
        return 'Steuerportal';
      default:
        return 'Übersicht';
    }
  };

  const HeaderIcon = getHeaderIcon();

  // Prüfe ob spezielle Seiten die volle Höhe brauchen
  // Hinweis: email-integration ist eine normale scrollbare Einstellungsseite
  const isFullHeightPage =
    (pathname?.includes('/emails') && !pathname?.includes('/email-integration')) ||
    pathname?.includes('/whatsapp');

  // Dynamische Header-Höhe in Pixeln für CSS
  const headerHeightPx = `${headerHeight}px`;

  return (
    <SidebarVisibilityProvider>
      {/* Fixed Header */}
      <header 
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 print:hidden"
      >
        {isWebmailConnected && webmailEmail ? (
          <>
            <MailHeader
              userEmail={webmailEmail}
              userInitial={webmailEmail.charAt(0).toUpperCase()}
              searchPlaceholder="Dienstleistung auswählen..."
              hideSearch={false}
              companyId={uid}
              isDashboard={true}
              onMenuToggle={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(!isSidebarOpen);
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                  localStorage.setItem('sidebar-collapsed', (!isSidebarCollapsed).toString());
                }
              }}
              onSearch={query => {
                router.push(`/services?search=${encodeURIComponent(query)}`);
              }}
              onLogout={async () => {
                try {
                  await signOut(auth);
                  router.push('/');
                } catch {
                  window.location.href = '/';
                }
              }}
            />
            <AppHeaderNavigation />
          </>
        ) : (
          <UserHeader currentUid={uid} />
        )}
      </header>

      {/* Container unter dem Header */}
      <div className="flex" style={{ paddingTop: headerHeightPx, minHeight: '100vh' }}>
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:flex md:flex-col md:shrink-0 bg-white border-r border-gray-200 print:hidden transition-all duration-300 ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          }`}
          style={{ 
            position: 'sticky',
            top: headerHeightPx,
            height: `calc(100vh - ${headerHeightPx})`,
            overflowY: 'auto'
          }}
        >
          <CompanySidebar
            companyName={companyDataForHeader?.companyName}
            uid={uid}
            expandedItems={expandedItems}
            onToggleExpanded={toggleExpanded}
            onNavigate={handleNavigation}
            getCurrentView={getCurrentView}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapsed={setIsSidebarCollapsed}
            isEmployee={isEmployee}
            employeePermissions={employeePermissions}
            hideEmailMenu={isWebmailConnected}
            hideCollapseButton={isWebmailConnected}
          />
        </aside>

        {/* Mobile Sidebar */}
        <div className="print:hidden">
          <CompanyMobileSidebar
            isOpen={isSidebarOpen}
            onOpenChange={setIsSidebarOpen}
            expandedItems={expandedItems}
            onToggleExpanded={toggleExpanded}
            onNavigate={handleNavigation}
            getCurrentView={getCurrentView}
            isEmployee={isEmployee}
            employeePermissions={employeePermissions}
            hideEmailMenu={isWebmailConnected}
          />
        </div>

        {/* Main Content - nimmt den restlichen Platz */}
        <main className="flex-1 min-w-0 bg-white">
          {isFullHeightPage ? (
            <div style={{ height: `calc(100vh - ${headerHeightPx})` }} className="overflow-hidden">
              {children}
            </div>
          ) : (
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="mb-8 print:hidden">
                  <div className="flex items-center space-x-2">
                    <HeaderIcon className="h-6 w-6 text-gray-600" />
                    <h1 className="text-2xl font-bold text-gray-900">{getHeaderLabel()}</h1>
                    <span className="text-sm text-gray-500">{companyDataForHeader?.companyName}</span>
                  </div>
                </div>

                {/* Admin Approval Status Banner - nur für Firmeninhaber */}
                {!isEmployee && <AdminApprovalStatus companyId={uid} className="mb-6 print:hidden" />}

                {children}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Update Notification Modal */}
      <UpdateNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        updates={unseenUpdates}
        onMarkAsSeen={markUpdateAsSeen}
        onMarkAllAsSeen={markAllAsSeen}
        onDismissUpdate={dismissUpdate}
      />

      {/* Hilfe-Chatbot */}
      <HelpChatbot companyId={uid} />
    </SidebarVisibilityProvider>
  );
}
