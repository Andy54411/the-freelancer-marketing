/**
 * Module & Seats Settings Page
 * 
 * Verwaltung von Premium-Modulen und Nutzer-Seats
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { 
  Check, 
  Sparkles, 
  Users, 
  Package,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { 
  PREMIUM_MODULES, 
  MODULE_BUNDLE, 
  SEAT_CONFIG,
  BASE_MODULES,
} from '@/lib/moduleConfig';

interface ModuleSubscription {
  id: string;
  moduleId: string;
  moduleName: string;
  status: 'trial' | 'active' | 'cancelled' | 'pending';
  priceGross: number;
  billingInterval: 'monthly' | 'yearly';
  trialEndDate?: Date;
  currentPeriodEnd?: Date;
  cancelledAt?: Date;
}

interface SeatInfo {
  included: number;
  additional: number;
  total: number;
  used: number;
  available: number;
  pricePerSeat: number;
  monthlyTotal: number;
}

export default function ModulesSettingsPage() {
  const params = useParams();
  const uid = params.uid as string;
  
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<ModuleSubscription[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [trialingModules, setTrialingModules] = useState<string[]>([]);
  const [bundleActive, setBundleActive] = useState(false);
  const [seatInfo, setSeatInfo] = useState<SeatInfo | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!uid) return;

      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setLoading(false);
          return;
        }
        
        const idToken = await currentUser.getIdToken();

        // Module laden
        const modulesRes = await fetch(`/api/company/${uid}/modules`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          if (modulesData.success) {
            setActiveModules(modulesData.data.summary.activeModules || []);
            setTrialingModules(modulesData.data.summary.trialingModules || []);
            setBundleActive(modulesData.data.summary.bundleActive || false);
            
            // Subscriptions aus premiumModules extrahieren
            const subs: ModuleSubscription[] = modulesData.data.premiumModules
              .filter((m: { subscription: unknown }) => m.subscription)
              .map((m: { 
                subscription: ModuleSubscription; 
                id: string; 
                name: string;
              }) => ({
                ...m.subscription,
                moduleId: m.id,
                moduleName: m.name,
              }));
            setSubscriptions(subs);
          }
        }

        // Seats laden
        const seatsRes = await fetch(`/api/company/${uid}/seats`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        
        if (seatsRes.ok) {
          const seatsData = await seatsRes.json();
          if (seatsData.success) {
            setSeatInfo(seatsData.data.seats);
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uid]);

  const handleCancelModule = async (moduleId: string, reason: string) => {
    setActionLoading(moduleId);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/api/company/${uid}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'cancel',
          moduleId,
          reason,
        }),
      });

      if (res.ok) {
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Fehler beim Kündigen:', error);
    } finally {
      setActionLoading(null);
      setCancelModalOpen(null);
    }
  };

  const getStatusBadge = (status: string, trialEndDate?: Date) => {
    switch (status) {
      case 'trial':
        const daysLeft = trialEndDate 
          ? Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0;
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <Clock className="w-3 h-3" />
            Testphase ({daysLeft} Tage)
          </span>
        );
      case 'active':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <Check className="w-3 h-3" />
            Aktiv
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
            <X className="w-3 h-3" />
            Gekündigt
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#14ad9f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Module & Nutzer-Plätze</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie Ihre Premium-Module und Team-Zugänge
        </p>
      </div>

      {/* Basis-Module */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#14ad9f]/10 flex items-center justify-center text-[#14ad9f]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Basis-Module</h2>
            <p className="text-sm text-gray-500">Im Taskilo Business enthalten</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {Object.values(BASE_MODULES).map((module) => (
            <div key={module.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Check className="w-5 h-5 text-[#14ad9f]" />
              <div>
                <p className="font-medium text-gray-900">{module.name}</p>
                <p className="text-sm text-gray-500">{module.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Premium-Module */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Premium-Module</h2>
              <p className="text-sm text-gray-500">Erweiterte Funktionen</p>
            </div>
          </div>
          
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14ad9f] text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Module hinzufügen
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bundle-Status */}
        {bundleActive && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#14ad9f] to-teal-700 text-white">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <div>
                <p className="font-bold">Komplett-Bundle aktiv</p>
                <p className="text-sm text-white/80">Alle Premium-Module sind freigeschaltet</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-2xl font-bold">{MODULE_BUNDLE.price.monthly.toFixed(2).replace('.', ',')} €</p>
                <p className="text-sm text-white/80">pro Monat</p>
              </div>
            </div>
          </div>
        )}

        {/* Einzelne Module */}
        <div className="space-y-4">
          {Object.values(PREMIUM_MODULES).map((module) => {
            const isActive = activeModules.includes(module.id) || bundleActive;
            const isTrialing = trialingModules.includes(module.id);
            const subscription = subscriptions.find(s => s.moduleId === module.id);

            return (
              <div 
                key={module.id} 
                className={`p-4 rounded-xl border-2 ${
                  isActive || isTrialing ? 'border-[#14ad9f] bg-[#14ad9f]/5' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900">{module.name}</h3>
                      {isActive && !bundleActive && getStatusBadge('active')}
                      {isTrialing && subscription && getStatusBadge('trial', subscription.trialEndDate)}
                      {subscription?.status === 'cancelled' && getStatusBadge('cancelled')}
                    </div>
                    <p className="text-sm text-gray-600">{module.description}</p>
                    
                    {/* Features */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {module.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-900">
                      {module.price.monthly.toFixed(2).replace('.', ',')} €
                    </p>
                    <p className="text-sm text-gray-500">/Monat</p>
                    
                    {(isActive || isTrialing) && !bundleActive && subscription?.status !== 'cancelled' && (
                      <button
                        onClick={() => setCancelModalOpen(module.id)}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Kündigen
                      </button>
                    )}
                    
                    {!isActive && !isTrialing && (
                      <Link
                        href="/pricing"
                        className="mt-2 inline-block text-sm text-[#14ad9f] hover:text-teal-700"
                      >
                        Jetzt testen
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Nutzer-Plätze */}
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nutzer-Plätze (Seats)</h2>
              <p className="text-sm text-gray-500">Dashboard-Zugänge für Ihr Team</p>
            </div>
          </div>
          
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Seats verwalten
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {seatInfo && (
          <>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{seatInfo.included}</p>
                <p className="text-sm text-gray-500">Inklusive</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{seatInfo.additional}</p>
                <p className="text-sm text-gray-500">Zusätzlich</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-[#14ad9f]">{seatInfo.used}</p>
                <p className="text-sm text-gray-500">In Verwendung</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-400">{seatInfo.available}</p>
                <p className="text-sm text-gray-500">Verfügbar</p>
              </div>
            </div>

            {seatInfo.additional > 0 && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Monatliche Kosten</p>
                    <p className="text-sm text-gray-600">
                      {seatInfo.additional} zusätzliche Seats × {SEAT_CONFIG.pricePerSeat.monthly.toFixed(2).replace('.', ',')} €
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {seatInfo.monthlyTotal.toFixed(2).replace('.', ',')} €
                </p>
              </div>
            )}

            {seatInfo.available === 0 && seatInfo.used >= seatInfo.total && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Seat-Limit erreicht</p>
                  <p className="text-sm text-amber-700">
                    Sie haben alle verfügbaren Seats verwendet. Fügen Sie weitere Seats hinzu, 
                    um mehr Mitarbeitern Dashboard-Zugang zu gewähren.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Kündigungsmodal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Modul kündigen</h3>
            <p className="text-gray-600 mb-4">
              Möchten Sie dieses Modul wirklich kündigen? Die Kündigung wird zum Ende 
              der aktuellen Abrechnungsperiode wirksam.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModalOpen(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleCancelModule(cancelModalOpen, 'Vom Nutzer gekündigt')}
                disabled={!!actionLoading}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Wird gekündigt...' : 'Kündigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
