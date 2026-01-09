/**
 * ModuleGuard
 * 
 * Komponente zum Sperren von Premium-Features wenn das Modul nicht gebucht ist.
 * Zeigt einen Upgrade-Hinweis mit Link zur Pricing-Seite.
 */

'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PREMIUM_MODULES, type PremiumModuleId } from '@/lib/moduleConfig';
import { getAuth } from 'firebase/auth';

interface ModuleGuardProps {
  /** ID des Premium-Moduls das geprüft werden soll */
  moduleId: PremiumModuleId;
  /** Company ID - wenn nicht angegeben wird die aktive Company verwendet */
  companyId?: string;
  /** Inhalt der angezeigt wird wenn das Modul aktiv ist */
  children: ReactNode;
  /** Alternativer Fallback-Content */
  fallback?: ReactNode;
  /** Ob der gesperrte Inhalt verschwommen angezeigt werden soll */
  showBlurred?: boolean;
}

interface ModuleSummary {
  activeModules: string[];
  trialingModules: string[];
  bundleActive: boolean;
}

/**
 * Hook zum Prüfen ob ein Modul aktiv ist
 */
export function useModuleAccess(moduleId: PremiumModuleId, companyId?: string) {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isTrialing, setIsTrialing] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeCompanyId = companyId || user?.uid;

  useEffect(() => {
    const checkAccess = async () => {
      if (!activeCompanyId) {
        setLoading(false);
        setHasAccess(false);
        return;
      }

      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const idToken = await currentUser.getIdToken();
        
        const res = await fetch(`/api/company/${activeCompanyId}/modules`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        if (!res.ok) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success) {
          const summary: ModuleSummary = data.data.summary;
          const isActive = summary.activeModules.includes(moduleId) || summary.bundleActive;
          const isTrial = summary.trialingModules.includes(moduleId);
          
          setHasAccess(isActive || isTrial);
          setIsTrialing(isTrial);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [activeCompanyId, moduleId]);

  return { hasAccess, isTrialing, loading };
}

/**
 * Standard-Fallback wenn Modul nicht gebucht ist
 */
function DefaultFallback({ 
  moduleId, 
  showBlurred,
  children 
}: { 
  moduleId: PremiumModuleId; 
  showBlurred?: boolean;
  children?: ReactNode;
}) {
  const moduleConfig = PREMIUM_MODULES[moduleId];
  
  if (!moduleConfig) return null;

  return (
    <div className="relative">
      {showBlurred && children && (
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
      )}
      
      <div className={`${showBlurred ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#14ad9f] to-teal-700 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {moduleConfig.name} freischalten
          </h2>
          
          <p className="text-gray-600 mb-6">
            Dieses Feature ist Teil des Premium-Moduls &quot;{moduleConfig.name}&quot;. 
            Testen Sie es 7 Tage kostenlos.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold text-gray-900">
                {moduleConfig.price.monthly.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-gray-500">/Monat</span>
            </div>
          </div>
          
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold bg-[#14ad9f] text-white hover:bg-teal-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Jetzt freischalten
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <p className="text-sm text-gray-500 mt-4">
            Keine Kreditkarte für die Testphase erforderlich
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * ModuleGuard Komponente
 * 
 * @example
 * ```tsx
 * <ModuleGuard moduleId="whatsapp">
 *   <WhatsAppInbox />
 * </ModuleGuard>
 * ```
 */
export function ModuleGuard({ 
  moduleId, 
  companyId,
  children, 
  fallback,
  showBlurred = false,
}: ModuleGuardProps) {
  const { hasAccess, loading } = useModuleAccess(moduleId, companyId);

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Zugang gewährt
  if (hasAccess) {
    return <>{children}</>;
  }

  // Kein Zugang - Fallback anzeigen
  if (fallback) {
    return <>{fallback}</>;
  }

  // Standard-Fallback
  return (
    <DefaultFallback moduleId={moduleId} showBlurred={showBlurred}>
      {showBlurred ? children : null}
    </DefaultFallback>
  );
}

/**
 * HOC Version für Klassen-Komponenten oder Server Components
 */
export function withModuleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  moduleId: PremiumModuleId
) {
  return function WithModuleGuardComponent(props: P) {
    return (
      <ModuleGuard moduleId={moduleId}>
        <WrappedComponent {...props} />
      </ModuleGuard>
    );
  };
}

// useModuleAccess Hook - Siehe Export oben für Inline-Check Verwendung:
// const { hasAccess } = useModuleAccess('whatsapp');
// <button disabled={!hasAccess}>WhatsApp öffnen</button>
