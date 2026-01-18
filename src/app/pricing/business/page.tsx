/**
 * Business Pricing Page
 * 
 * Zeigt verfügbare Premium-Module und Seat-Optionen
 * für Taskilo Business Kunden
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Check, 
  Sparkles, 
  Users, 
  Package,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { 
  PREMIUM_MODULES, 
  MODULE_BUNDLE, 
  SEAT_CONFIG,
  getModulePriceRange,
} from '@/lib/moduleConfig';
import { HeroHeader } from '@/components/hero8-header';
import { getAuth } from 'firebase/auth';
import Image from 'next/image';

// Type für PremiumModule aus den exportierten Werten ableiten
type PremiumModuleType = typeof PREMIUM_MODULES[keyof typeof PREMIUM_MODULES];

// Pricing Cards - Synthesia Style
function PricingCards({ 
  onPlanChange,
  user,
  onBundleSubscribe,
  bundleLoading,
}: { 
  onPlanChange: (plan: 'single' | 'few' | 'bundle') => void;
  user: { uid: string } | null;
  onBundleSubscribe: () => void;
  bundleLoading: boolean;
}) {
  // Preise aus der Config berechnen
  const singleRange = getModulePriceRange(1, 'monthly');
  const duoRange = getModulePriceRange(2, 'monthly');
  const tripleRange = getModulePriceRange(3, 'monthly');
  
  // Originalpreise für 2 und 3 Module (günstigste Kombination ohne Rabatt)
  const sortedPrices = Object.values(PREMIUM_MODULES)
    .map(m => m.price.monthly)
    .sort((a, b) => a - b);
  const duoOriginal = sortedPrices[0] + sortedPrices[1];
  const tripleOriginal = sortedPrices[0] + sortedPrices[1] + sortedPrices[2];
  
  const formatPrice = (price: number) => price.toFixed(2).replace('.', ',');
  
  const plans = [
    {
      id: 'single',
      name: 'Einzelmodul',
      price: `ab ${formatPrice(singleRange.minPrice)}`,
      priceNote: '/Monat',
      description: 'Perfekt zum Einstieg',
      cta: 'Modul wählen',
      features: [
        '1 Premium-Modul nach Wahl',
        '7 Tage kostenlos testen',
        'Jederzeit kündbar',
        'Deutscher Support',
      ],
      badge: null,
      variant: 'default' as const,
    },
    {
      id: 'duo',
      name: '2 Module',
      price: `ab ${formatPrice(duoRange.minPrice)}`,
      priceNote: '/Monat',
      oldPrice: formatPrice(duoOriginal),
      description: `Spare ${duoRange.discountPercent}%`,
      cta: 'Module wählen',
      features: [
        '2 Premium-Module nach Wahl',
        '7 Tage kostenlos testen',
        'Jederzeit kündbar',
        'Prioritäts-Support',
      ],
      badge: null,
      variant: 'default' as const,
    },
    {
      id: 'triple',
      name: '3 Module',
      price: `ab ${formatPrice(tripleRange.minPrice)}`,
      priceNote: '/Monat',
      oldPrice: formatPrice(tripleOriginal),
      description: `Spare ${tripleRange.discountPercent}%`,
      cta: 'Jetzt starten',
      features: [
        '3 Premium-Module nach Wahl',
        '7 Tage kostenlos testen',
        'Prioritäts-Support',
        'Erweiterte Integrationen',
      ],
      badge: 'AM BELIEBTESTEN',
      variant: 'popular' as const,
    },
    {
      id: 'bundle',
      name: 'Komplett-Bundle',
      price: formatPrice(MODULE_BUNDLE.price.monthly),
      priceNote: '/Monat',
      oldPrice: formatPrice(Object.values(PREMIUM_MODULES).reduce((sum, m) => sum + m.price.monthly, 0)),
      description: 'Spare 28%',
      cta: 'Bundle starten',
      features: [
        'Alle 4 Premium-Module',
        '7 Tage kostenlos testen',
        'Premium-Support',
        'Alle zukünftigen Features',
        'Unbegrenzte Integrationen',
      ],
      badge: 'BESTE WAHL',
      variant: 'enterprise' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {plans.map((plan) => {
        const isPopular = plan.variant === 'popular';
        const isEnterprise = plan.variant === 'enterprise';
        
        return (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl transition-all duration-300 hover:-translate-y-2 ${
              isEnterprise 
                ? 'bg-linear-to-br from-[#14ad9f] to-teal-700 text-white shadow-2xl' 
                : isPopular 
                  ? 'bg-linear-to-br from-teal-50 to-[#14ad9f]/10 border-2 border-[#14ad9f] shadow-xl' 
                  : 'bg-white border border-gray-200 shadow-lg hover:shadow-xl'
            }`}
          >
            {/* Badge */}
            {plan.badge && (
              <div className={`absolute -top-4 left-0 right-0 flex justify-center`}>
                <span className={`px-4 py-1.5 text-xs font-bold tracking-wider rounded-full ${
                  isEnterprise 
                    ? 'bg-white text-[#14ad9f]' 
                    : 'bg-[#14ad9f] text-white'
                }`}>
                  {plan.badge}
                </span>
              </div>
            )}
            
            {/* Content */}
            <div className={`flex-1 p-4 sm:p-6 ${plan.badge ? 'pt-6 sm:pt-8' : ''}`}>
              {/* Plan Name */}
              <h3 className={`text-lg sm:text-xl font-bold mb-1 ${
                isEnterprise ? 'text-white' : 'text-gray-900'
              }`}>
                {plan.name}
              </h3>
              
              {/* Old Price - Fixed height for alignment */}
              <div className="h-5">
                {plan.oldPrice && (
                  <p className={`text-sm line-through ${
                    isEnterprise ? 'text-white/60' : 'text-gray-400'
                  }`}>
                    {plan.oldPrice} €/Monat
                  </p>
                )}
              </div>
              
              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-2xl sm:text-3xl font-bold ${
                  isEnterprise ? 'text-white' : isPopular ? 'text-[#14ad9f]' : 'text-gray-900'
                }`}>
                  {plan.price} €
                </span>
                <span className={`text-sm ${
                  isEnterprise ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {plan.priceNote}
                </span>
              </div>
              
              {/* CTA Button */}
              <button
                onClick={() => {
                  // Plan-State setzen für visuelle Hervorhebung
                  if (plan.id === 'single') onPlanChange('single');
                  else if (plan.id === 'duo') onPlanChange('few');
                  else onPlanChange('bundle');
                  
                  // Navigation/Aktion basierend auf Login-Status
                  if (!user) {
                    // Nicht eingeloggt -> Zur Unternehmens-Registrierung mit Redirect
                    window.location.href = `/register/company?redirect=/pricing/business&plan=${plan.id}`;
                  } else if (plan.id === 'bundle') {
                    // Bundle direkt buchen
                    onBundleSubscribe();
                  } else {
                    // Zur Modul-Auswahl scrollen
                    const moduleSection = document.getElementById('premium-modules');
                    if (moduleSection) {
                      moduleSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
                disabled={bundleLoading && plan.id === 'bundle'}
                className={`w-full py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 mb-4 sm:mb-6 text-sm sm:text-base ${
                  isEnterprise 
                    ? 'bg-white text-[#14ad9f] hover:bg-gray-100' 
                    : isPopular 
                      ? 'bg-[#14ad9f] text-white hover:bg-teal-700' 
                      : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                }`}
              >
                {bundleLoading && plan.id === 'bundle' ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Wird gebucht...</span>
                  </div>
                ) : (
                  plan.cta
                )}
              </button>
              
              {/* Description */}
              <p className={`text-sm mb-4 ${
                isEnterprise ? 'text-white/80' : 'text-gray-500'
              }`}>
                {plan.description}
              </p>
              
              {/* Divider */}
              <div className={`border-t mb-4 ${
                isEnterprise ? 'border-white/20' : 'border-gray-200'
              }`} />
              
              {/* Features Header */}
              <p className={`text-xs font-bold tracking-wider mb-3 ${
                isEnterprise ? 'text-white/70' : 'text-gray-400'
              }`}>
                DAS BEKOMMST DU
              </p>
              
              {/* Features List */}
              <ul className="space-y-2 sm:space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 sm:gap-2">
                    <Check className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 ${
                      isEnterprise ? 'text-amber-300' : 'text-[#14ad9f]'
                    }`} />
                    <span className={`text-xs sm:text-sm ${
                      isEnterprise ? 'text-white/90' : 'text-gray-600'
                    }`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Social Proof Section - Synthesia Style mit echten Avataren
function SocialProofSection() {
  // Unsplash Avatar URLs
  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  ];

  return (
    <div className="inline-flex flex-col items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-2xl sm:rounded-full px-4 sm:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        {/* Überlappende Avatare - Synthesia Style */}
        <div className="flex">
          {avatars.map((url, i) => (
            <div
              key={i}
              className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 sm:border-[3px] border-white shadow-md"
              style={{ marginLeft: i === 0 ? 0 : '-10px', zIndex: avatars.length - i }}
            >
              <Image
                src={url}
                alt={`Kunde ${i + 1}`}
                width={44}
                height={44}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
        
        {/* Sterne und Bewertung */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <svg 
                key={i}
                className="w-4 h-4 sm:w-5 sm:h-5"
                viewBox="0 0 24 24"
                fill={i <= 4 ? '#fbbf24' : '#fbbf24'}
                style={{ opacity: i <= 4 ? 1 : 0.4 }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <span className="font-bold text-white text-base sm:text-lg">4,7 Punkte</span>
        </div>
      </div>
      <p className="text-xs sm:text-sm text-white/90">aus über 2.000 Bewertungen auf G2</p>
    </div>
  );
}

interface ModuleCardProps {
  module: PremiumModuleType;
  isActive: boolean;
  isTrialing: boolean;
  onSubscribe: () => void;
  loading: boolean;
}

function ModuleCard({ module, isActive, isTrialing, onSubscribe, loading }: ModuleCardProps) {
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      'message-circle': <Sparkles className="w-6 h-6" />,
      'megaphone': <Zap className="w-6 h-6" />,
      'briefcase': <Shield className="w-6 h-6" />,
      'layout-dashboard': <Package className="w-6 h-6" />,
    };
    return icons[iconName] || <Package className="w-6 h-6" />;
  };

  return (
    <div className={`bg-white rounded-xl sm:rounded-2xl border-2 p-4 sm:p-6 transition-all hover:shadow-lg flex flex-col h-full ${
      isActive ? 'border-[#14ad9f]' : isTrialing ? 'border-amber-400' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#14ad9f]/10 flex items-center justify-center text-[#14ad9f]">
          {getIcon(module.icon)}
        </div>
        {isActive && (
          <span className="px-2 sm:px-3 py-1 rounded-full bg-[#14ad9f]/10 text-[#14ad9f] text-xs sm:text-sm font-medium">
            Aktiv
          </span>
        )}
        {isTrialing && (
          <span className="px-2 sm:px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs sm:text-sm font-medium">
            Testphase
          </span>
        )}
      </div>

      {module.id === 'whatsapp' ? (
        <Link href="/features/whatsapp" className="block group">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2 group-hover:text-[#14ad9f] transition-colors">
            {module.name}
          </h3>
        </Link>
      ) : (
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{module.name}</h3>
      )}
      <p className="text-gray-600 text-sm mb-3 sm:mb-4 min-h-10 sm:min-h-12">{module.description}</p>

      <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 grow">
        {module.features.slice(0, 4).map((feature, idx) => (
          <li key={idx} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#14ad9f] mt-0.5 shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="border-t pt-3 sm:pt-4 mt-auto">
        <div className="flex items-baseline gap-1 mb-3 sm:mb-4">
          <span className="text-2xl sm:text-3xl font-bold text-gray-900">
            {module.price.monthly.toFixed(2).replace('.', ',')} €
          </span>
          <span className="text-gray-500 text-sm">/Monat</span>
        </div>

        {!isActive && (
          <button
            onClick={onSubscribe}
            disabled={loading}
            className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-[#14ad9f] text-white hover:bg-teal-700 disabled:opacity-50 text-sm sm:text-base"
          >
            {loading ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isTrialing ? 'Jetzt buchen' : '7 Tage kostenlos testen'}
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </>
            )}
          </button>
        )}

        {isActive && !isTrialing && (
          <div className="text-center text-gray-500 text-xs sm:text-sm py-2.5 sm:py-3">
            Modul ist aktiv
          </div>
        )}
      </div>
    </div>
  );
}

// Feature Comparison Table - Synthesia Style
function ComparisonTable({ 
  user,
  onBundleSubscribe,
  bundleLoading,
}: {
  user: { uid: string } | null;
  onBundleSubscribe: () => void;
  bundleLoading: boolean;
}) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basis-included', 'premium-modules']);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(2); // Default: 3 Module (beliebteste Option)
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handlePlanClick = (planId: string) => {
    if (!user) {
      window.location.href = `/register/company?redirect=/pricing/business&plan=${planId}`;
    } else if (planId === 'bundle') {
      onBundleSubscribe();
    } else {
      const moduleSection = document.getElementById('premium-modules');
      if (moduleSection) {
        moduleSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const plans = [
    { id: 'single', name: 'Einzelmodul', price: 'ab 9,99', priceNote: '/Monat' },
    { id: 'duo', name: '2 Module', price: 'ab 17,99', priceNote: '/Monat' },
    { id: 'triple', name: '3 Module', price: '39,99', priceNote: '/Monat', highlight: true },
    { id: 'bundle', name: 'Komplett-Bundle', price: '49,99', priceNote: '/Monat', enterprise: true },
  ];

  const featureSections = [
    {
      id: 'basis-included',
      title: 'Im Taskilo Business Basis (29,99 €/Monat) enthalten',
      features: [
        { name: 'Tasker (Aufträge & Posteingang)', tooltip: 'Erhalte Aufträge über den Taskilo-Marktplatz und verwalte eingehende Anfragen in deinem Posteingang.', values: [true, true, true, true] },
        { name: 'Kalender & Terminverwaltung', tooltip: 'Plane Termine, synchronisiere mit Google Calendar und verwalte deine Verfügbarkeit.', values: [true, true, true, true] },
        { name: 'E-Mail-Client', tooltip: 'Professioneller E-Mail-Client mit @taskilo.de Adresse, integriert in dein Dashboard.', values: [true, true, true, true] },
        { name: 'GoBD-konforme Buchhaltung', tooltip: 'Rechtssichere Buchhaltung nach deutschen Standards mit automatischer Archivierung.', values: [true, true, true, true] },
        { name: 'Rechnungen & Angebote', tooltip: 'Erstelle professionelle Rechnungen und Angebote mit deinem Firmenlogo und automatischer Nummerierung.', values: [true, true, true, true] },
        { name: 'E-Rechnung (XRechnung/ZUGFeRD)', tooltip: 'Erstelle und empfange elektronische Rechnungen im XRechnung- und ZUGFeRD-Format für Behörden und Unternehmen.', values: [true, true, true, true] },
        { name: 'Geschäftspartner/CRM', tooltip: 'Verwalte Kunden, Lieferanten und Kontakte mit Kontakthistorie und Notizen.', values: [true, true, true, true] },
        { name: 'Banking & Kassenbuch', tooltip: 'Verbinde dein Bankkonto, verwalte Zahlungen und führe ein digitales Kassenbuch.', values: [true, true, true, true] },
        { name: 'Lagerbestand', tooltip: 'Verwalte Produkte, Lagerbestände und Artikelnummern mit automatischer Bestandsführung.', values: [true, true, true, true] },
        { name: 'Personal & Dienstplanung', tooltip: 'Verwalte Mitarbeiter, erstelle Dienstpläne und behalte die Übersicht über dein Team.', values: [true, true, true, true] },
        { name: 'Zeiterfassung', tooltip: 'Erfasse Arbeitszeiten für dich und dein Team mit Projektzuordnung und Auswertungen.', values: [true, true, true, true] },
        { name: 'DATEV-Export', tooltip: 'Exportiere deine Buchhaltungsdaten im DATEV-Format für deinen Steuerberater.', values: [true, true, true, true] },
      ],
    },
    {
      id: 'premium-modules',
      title: 'Premium-Module (Zusatzoptionen)',
      features: [
        { name: 'Premium-Module inklusive', tooltip: 'Wähle aus 4 Premium-Modulen: WhatsApp Business, Recruiting, Advertising und Workspace Pro.', values: ['1 Modul', '2 Module', '3 Module', 'Alle 4 Module'] },
        { name: 'WhatsApp Business', tooltip: 'Professionelle WhatsApp Business Integration mit Team-Posteingang und automatischen Antworten.', values: ['wählbar', 'wählbar', 'wählbar', true] },
        { name: 'Recruiting & Bewerbermanagement', tooltip: 'Erstelle Stellenanzeigen, verwalte Bewerbungen und führe strukturierte Bewerbungsprozesse durch.', values: ['wählbar', 'wählbar', 'wählbar', true] },
        { name: 'Taskilo Advertising', tooltip: 'Erstelle und verwalte Werbekampagnen auf Google, Meta und LinkedIn direkt aus Taskilo.', values: ['wählbar', 'wählbar', 'wählbar', true] },
        { name: 'Workspace Pro', tooltip: 'Erweiterte Projektmanagement-Funktionen mit Kanban-Boards, Gantt-Charts und Team-Kollaboration.', values: ['wählbar', 'wählbar', 'wählbar', true] },
      ],
    },
    {
      id: 'support',
      title: 'Support & Service',
      features: [
        { name: 'Support-Level', tooltip: 'Standard: E-Mail-Support. Priorität: Schnellere Reaktionszeiten. Premium: Telefonischer VIP-Support.', values: ['Standard', 'Standard', 'Priorität', 'Premium'] },
        { name: 'Onboarding-Beratung', tooltip: 'Persönliche Einführung in Taskilo mit einem unserer Experten per Videocall.', values: [false, false, true, true] },
        { name: 'Dedizierter Ansprechpartner', tooltip: 'Ein fester Ansprechpartner für alle deine Fragen und Anliegen.', values: [false, false, false, true] },
      ],
    },
    {
      id: 'integrations',
      title: 'Integrationen',
      features: [
        { name: 'API-Zugang', tooltip: 'Verbinde Taskilo mit deinen eigenen Systemen über unsere REST-API.', values: [false, 'Basis', 'Erweitert', 'Vollständig'] },
        { name: 'Webhooks', tooltip: 'Erhalte automatische Benachrichtigungen bei Ereignissen in Taskilo an deine Systeme.', values: [false, false, true, true] },
      ],
    },
    {
      id: 'team',
      title: 'Team & Zusammenarbeit',
      features: [
        { name: 'Inkludierte Seats', tooltip: 'Anzahl der Teammitglieder, die ohne Aufpreis Taskilo nutzen können.', values: ['1 Seat', '1 Seat', '2 Seats', '5 Seats'] },
        { name: 'Gastnutzer', tooltip: 'Lade externe Partner oder Kunden ein, um gemeinsam an Projekten zu arbeiten.', values: [false, '3 Gäste', '5 Gäste', 'Unbegrenzt'] },
        { name: 'Team-Workspaces', tooltip: 'Erstelle separate Arbeitsbereiche für verschiedene Teams oder Projekte.', values: [false, false, true, true] },
      ],
    },
  ];

  const renderValue = (value: boolean | string) => {
    if (value === true) {
      return (
        <svg className="w-5 h-5 text-[#14ad9f]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    if (value === false) {
      return (
        <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }
    return <span className="text-sm text-gray-700">{value}</span>;
  };

  // Mobile: Render value with label
  const renderMobileValue = (value: boolean | string, featureName: string) => {
    if (value === true) {
      return (
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600">{featureName}</span>
          <svg className="w-5 h-5 text-[#14ad9f]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    if (value === false) {
      return (
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-400">{featureName}</span>
          <svg className="w-5 h-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-600">{featureName}</span>
        <span className="text-sm font-medium text-[#14ad9f]">{value}</span>
      </div>
    );
  };

  return (
    <>
      {/* Mobile View - Card-based */}
      <div className="lg:hidden">
        {/* Plan Selector Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-4 -mx-4 px-4 scrollbar-hide">
          {plans.map((plan, idx) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanIndex(idx)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                selectedPlanIndex === idx
                  ? plan.enterprise
                    ? 'bg-linear-to-r from-[#14ad9f] to-teal-700 text-white shadow-lg'
                    : 'bg-[#14ad9f] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {plan.name}
              {plan.highlight && selectedPlanIndex !== idx && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-[#14ad9f] text-white text-[10px] rounded-full">TOP</span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Plan Card */}
        <div className={`rounded-2xl border-2 overflow-hidden ${
          plans[selectedPlanIndex].enterprise 
            ? 'border-[#14ad9f] bg-linear-to-br from-[#14ad9f] to-teal-700' 
            : plans[selectedPlanIndex].highlight
              ? 'border-[#14ad9f] bg-white'
              : 'border-gray-200 bg-white'
        }`}>
          {/* Plan Header */}
          <div className={`p-5 text-center ${
            plans[selectedPlanIndex].enterprise ? 'text-white' : ''
          }`}>
            <h3 className={`text-xl font-bold ${
              plans[selectedPlanIndex].enterprise ? 'text-white' : 'text-gray-900'
            }`}>
              {plans[selectedPlanIndex].name}
            </h3>
            <div className="flex items-baseline justify-center gap-1 mt-2">
              <span className={`text-3xl font-bold ${
                plans[selectedPlanIndex].enterprise ? 'text-white' : 'text-gray-900'
              }`}>
                {plans[selectedPlanIndex].price} €
              </span>
              <span className={plans[selectedPlanIndex].enterprise ? 'text-white/80' : 'text-gray-500'}>
                {plans[selectedPlanIndex].priceNote}
              </span>
            </div>
            <button 
              onClick={() => handlePlanClick(plans[selectedPlanIndex].id)}
              disabled={bundleLoading && plans[selectedPlanIndex].enterprise}
              className={`mt-4 w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
              plans[selectedPlanIndex].enterprise
                ? 'bg-white text-[#14ad9f] hover:bg-gray-100'
                : 'bg-[#14ad9f] text-white hover:bg-teal-700'
            }`}>
              {bundleLoading && plans[selectedPlanIndex].enterprise ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Wird gebucht...
                </span>
              ) : (
                plans[selectedPlanIndex].enterprise ? 'Bundle starten' : 'Auswählen'
              )}
            </button>
          </div>

          {/* Features for selected plan */}
          <div className={`${plans[selectedPlanIndex].enterprise ? 'bg-white' : ''}`}>
            {featureSections.map((section) => (
              <div key={section.id} className="border-t border-gray-100">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-[#14ad9f] text-sm">{section.title}</span>
                  <svg 
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedSections.includes(section.id) ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Section Content */}
                {expandedSections.includes(section.id) && (
                  <div className="px-4 pb-4 space-y-1">
                    {section.features.map((feature) => (
                      <div key={feature.name} className="border-b border-gray-50 last:border-b-0">
                        {renderMobileValue(feature.values[selectedPlanIndex], feature.name)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className={`p-4 text-center text-sm ${
            plans[selectedPlanIndex].enterprise ? 'bg-gray-50 text-gray-600' : 'bg-gray-50 text-gray-600'
          }`}>
            7 Tage kostenlos testen
          </div>
        </div>

        {/* Swipe Hint */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Tippe auf einen anderen Plan, um zu vergleichen
        </p>
      </div>

      {/* Desktop View - Table */}
      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-lg relative">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 rounded-t-2xl shadow-md">
        <div className="grid grid-cols-5">
          {/* Empty corner cell */}
          <div className="p-4 border-r border-gray-100 bg-white" />
          
          {/* Plan Headers */}
          {plans.map((plan, idx) => (
            <div 
              key={plan.id}
              className={`p-4 text-center ${
                plan.enterprise 
                  ? 'bg-linear-to-br from-[#14ad9f] to-teal-700 text-white' 
                  : plan.highlight 
                    ? 'bg-teal-50' 
                    : 'bg-white'
              } ${idx < plans.length - 1 ? 'border-r border-gray-100' : ''}`}
            >
              <div className={`text-sm font-bold ${
                plan.enterprise ? 'text-white/70' : 'text-gray-500'
              }`}>
                {plan.name}
              </div>
              <div className={`text-xl font-bold mt-1 ${
                plan.enterprise ? 'text-white' : 'text-gray-900'
              }`}>
                {plan.price}<span className="text-sm font-normal">{plan.priceNote}</span>
              </div>
              <button 
                onClick={() => handlePlanClick(plan.id)}
                disabled={bundleLoading && plan.enterprise}
                className={`mt-3 w-full py-2 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                plan.enterprise 
                  ? 'bg-white text-[#14ad9f] hover:bg-gray-100' 
                  : plan.highlight
                    ? 'bg-[#14ad9f] text-white hover:bg-teal-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                {bundleLoading && plan.enterprise ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Wird gebucht...
                  </span>
                ) : (
                  plan.enterprise ? 'Bundle starten' : 'Auswählen'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Sections */}
      {featureSections.map((section) => (
        <div key={section.id} className="border-b border-gray-100 last:border-b-0">
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full grid grid-cols-5 items-center hover:bg-gray-50 transition-colors"
          >
            <div className="p-4 text-left flex items-center gap-2">
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSections.includes(section.id) ? 'rotate-90' : ''
                }`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold text-[#14ad9f]">{section.title}</span>
            </div>
            <div className="col-span-4" />
          </button>

          {/* Section Content */}
          {expandedSections.includes(section.id) && (
            <div>
              {section.features.map((feature, featureIdx) => (
                <div 
                  key={feature.name}
                  className={`grid grid-cols-5 items-center ${
                    featureIdx % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'
                  }`}
                >
                  {/* Feature Name with Tooltip */}
                  <div className="p-4 pr-2">
                    <div className="flex items-center gap-1.5 group relative">
                      <span className="text-sm font-medium text-gray-800">{feature.name}</span>
                      {feature.tooltip && (
                        <>
                          <svg className="w-4 h-4 text-gray-400 cursor-help shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 pointer-events-none">
                            {feature.tooltip}
                            <div className="absolute left-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Feature Values */}
                  {feature.values.map((value, valueIdx) => (
                    <div 
                      key={valueIdx}
                      className={`p-4 flex justify-center ${
                        valueIdx < feature.values.length - 1 ? 'border-r border-gray-100' : ''
                      } ${plans[valueIdx].enterprise ? 'bg-teal-50/30' : ''}`}
                    >
                      {renderValue(value)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Bottom CTA */}
      <div className="bg-gray-50 p-6 grid grid-cols-5 items-center">
        <div className="text-sm text-gray-600">
          Alle Pläne mit 7 Tagen kostenloser Testphase
        </div>
        {plans.map((plan) => (
          <div key={plan.id} className="text-center">
            <button 
              onClick={() => handlePlanClick(plan.id)}
              disabled={bundleLoading && plan.enterprise}
              className={`py-2 px-6 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
              plan.enterprise 
                ? 'bg-[#14ad9f] text-white hover:bg-teal-700' 
                : 'text-[#14ad9f] hover:text-teal-700'
            }`}>
              {bundleLoading && plan.enterprise ? 'Wird gebucht...' : plan.enterprise ? 'Jetzt starten' : 'Mehr erfahren'}
            </button>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

function SeatSection({ companyId }: { companyId: string }) {
  const [seatInfo, setSeatInfo] = useState<{
    included: number;
    additional: number;
    total: number;
    used: number;
    available: number;
    pricePerSeat: number;
    monthlyTotal: number;
  } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/api/company/${companyId}/seats`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (data.success) {
          setSeatInfo(data.data.seats);
        }
      } catch {
        // Fehler beim Laden der Seats - wird ignoriert
      }
    };
    fetchSeats();
  }, [companyId]);

  const handleAddSeats = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/api/company/${companyId}/seats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ action: 'add', quantity }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh seat info
        const refreshRes = await fetch(`/api/company/${companyId}/seats`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const refreshData = await refreshRes.json();
        if (refreshData.success) {
          setSeatInfo(refreshData.data.seats);
        }
      }
    } catch {
      // Fehler beim Hinzufügen - wird ignoriert
    } finally {
      setLoading(false);
    }
  };

  if (!seatInfo) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#14ad9f]/10 flex items-center justify-center text-[#14ad9f] shrink-0">
          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Nutzer-Plätze (Seats)</h3>
          <p className="text-gray-600 text-sm sm:text-base">
            Dashboard-Zugänge für Ihre Mitarbeiter
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-3xl font-bold text-gray-900">{seatInfo.total}</p>
          <p className="text-gray-600 text-xs sm:text-sm">Gesamt</p>
        </div>
        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-3xl font-bold text-[#14ad9f]">{seatInfo.used}</p>
          <p className="text-gray-600 text-xs sm:text-sm">In Nutzung</p>
        </div>
        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
          <p className="text-xl sm:text-3xl font-bold text-[#14ad9f]">{seatInfo.available}</p>
          <p className="text-gray-600 text-xs sm:text-sm">Frei</p>
        </div>
      </div>

      <div className="border-t pt-4 sm:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">Zusätzliche Seats buchen</p>
            <p className="text-gray-600 text-xs sm:text-sm">
              {SEAT_CONFIG.pricePerSeat.monthly.toFixed(2).replace('.', ',')} € pro Seat/Monat
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-lg"
            >
              -
            </button>
            <span className="w-10 sm:w-12 text-center font-semibold text-base sm:text-lg">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(50, quantity + 1))}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-lg"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4">
          <span className="text-gray-600 text-sm sm:text-base">Monatliche Kosten</span>
          <span className="text-lg sm:text-xl font-bold text-gray-900">
            +{(quantity * SEAT_CONFIG.pricePerSeat.monthly).toFixed(2).replace('.', ',')} €
          </span>
        </div>

        <button
          onClick={handleAddSeats}
          disabled={loading}
          className="w-full py-2.5 sm:py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-[#14ad9f] text-white hover:bg-teal-700 disabled:opacity-50 text-sm sm:text-base"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {quantity} Seat{quantity > 1 ? 's' : ''} hinzufügen
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BusinessPricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [trialingModules, setTrialingModules] = useState<string[]>([]);
  const [bundleActive, setBundleActive] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [recommendedPlan, setRecommendedPlan] = useState<'single' | 'few' | 'bundle'>('few');

  // Hole die aktive Company
  const activeCompanyId = user?.uid;

  useEffect(() => {
    const fetchModules = async () => {
      if (!activeCompanyId) return;
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/api/company/${activeCompanyId}/modules`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (data.success) {
          setActiveModules(data.data.summary.activeModules);
          setTrialingModules(data.data.summary.trialingModules);
          setBundleActive(data.data.summary.bundleActive);
        }
      } catch {
        // Fehler beim Laden der Module - wird ignoriert
      }
    };
    fetchModules();
  }, [activeCompanyId]);

  const handleSubscribe = async (moduleId: string) => {
    if (!activeCompanyId) return;
    setLoading(moduleId);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/api/company/${activeCompanyId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'subscribe',
          moduleId,
          withTrial: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTrialingModules(prev => [...prev, moduleId]);
      }
    } catch {
      // Fehler beim Buchen - wird ignoriert
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribeBundle = async () => {
    if (!activeCompanyId) return;
    setLoading('bundle');
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`/api/company/${activeCompanyId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'subscribe-bundle',
          withTrial: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBundleActive(true);
        setActiveModules(MODULE_BUNDLE.includes);
      }
    } catch {
      // Fehler beim Bundle-Buchen - wird ignoriert
    } finally {
      setLoading(null);
    }
  };

  // Zeige Loading nur während Auth initialisiert
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#14ad9f] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <HeroHeader />
      
      {/* Hero Section - Taskilo Style mit Gradient Background */}
      <section className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 pt-12 sm:pt-16 pb-20 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-linear-to-r from-white/5 to-transparent rounded-full" />
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          {/* Social Proof */}
          <div className="mb-6 sm:mb-10 animate-fade-in">
            <SocialProofSection />
          </div>
          
          {/* Headline mit Animation */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight animate-slide-up">
            Bist du bereit dein Business zu{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-white">skalieren</span>
              <span className="absolute bottom-2 left-0 right-0 h-4 bg-amber-400/40 -skew-x-3 rounded" />
            </span>
            ?
          </h1>
          
          {/* Subtitle */}
          <p 
            className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-10 animate-slide-up-delay px-2"
          >
            Taskilo ist die am besten bewertete Business-Software für Freelancer und 
            kleine Unternehmen. Mehr als 2.000 Teams nutzen unsere Premium-Module 
            und sparen so bis zu 40% ihrer Zeit und ihres Budgets.
          </p>
          
          {/* CTA Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up-delay-2 px-4"
          >
            <a
              href="#pricing-plans"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-[#14ad9f] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center"
            >
              Jetzt Module entdecken
            </a>
            <a
              href="#faq"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white/10 text-white font-semibold rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all duration-300 text-center"
            >
              Häufige Fragen
            </a>
          </div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Pricing Section */}
      <main id="pricing-plans" className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 -mt-4 sm:-mt-8">
        {/* Pricing Cards - Synthesia Style */}
        <div className="mb-10 sm:mb-16">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Wähle deinen Plan
            </h2>
            <p className="text-gray-500 text-lg">
              Alle Pläne beinhalten 7 Tage kostenlose Testphase
            </p>
          </div>
          <PricingCards 
            onPlanChange={setRecommendedPlan} 
            user={user}
            onBundleSubscribe={handleSubscribeBundle}
            bundleLoading={loading === 'bundle'}
          />
        </div>

        {/* Pricing Comparison Table - Synthesia Style */}
        <section className="mb-10 sm:mb-16">
          <ComparisonTable 
            user={user}
            onBundleSubscribe={handleSubscribeBundle}
            bundleLoading={loading === 'bundle'}
          />
        </section>

        {/* Individual Modules */}
        <section id="premium-modules" className={`mb-10 sm:mb-16 transition-all duration-300 ${
          recommendedPlan !== 'bundle' ? 'scale-[1.02]' : ''
        }`}>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2 flex-wrap">
            Einzelne Premium-Module
            {recommendedPlan === 'single' && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-[#14ad9f] text-white rounded-full animate-pulse">
                Empfohlen
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Object.values(PREMIUM_MODULES).map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                isActive={activeModules.includes(module.id) || bundleActive}
                isTrialing={trialingModules.includes(module.id)}
                onSubscribe={() => handleSubscribe(module.id)}
                loading={loading === module.id}
              />
            ))}
          </div>
        </section>

        {/* Seats Section */}
        {activeCompanyId && (
          <section className="mb-10 sm:mb-16">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#14ad9f]" />
              Team-Zugänge
            </h2>
            <SeatSection companyId={activeCompanyId} />
          </section>
        )}

        {/* Enterprise CTA Section - Sanftes Teal */}
        <section className="mb-10 sm:mb-16 relative overflow-hidden rounded-2xl sm:rounded-3xl bg-linear-to-br from-teal-50 via-teal-100 to-[#14ad9f]/20">
          {/* Decorative curved line */}
          <svg className="absolute left-0 top-0 h-full w-1/2 opacity-40 hidden sm:block" viewBox="0 0 400 600" fill="none">
            <path d="M-100 600 Q 200 400, 100 200 T 300 -100" stroke="url(#gradientEnterprise)" strokeWidth="2" fill="none"/>
            <defs>
              <linearGradient id="gradientEnterprise" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14ad9f" stopOpacity="0"/>
                <stop offset="50%" stopColor="#14ad9f" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#14ad9f" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
          {/* Decorative circles */}
          <div className="absolute -top-24 -right-24 w-48 sm:w-96 h-48 sm:h-96 bg-[#14ad9f]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-36 sm:w-72 h-36 sm:h-72 bg-teal-200/30 rounded-full blur-3xl" />
          
          <div className="relative grid lg:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-10 lg:p-16">
            {/* Left Side - Text & CTA */}
            <div className="flex flex-col justify-center text-center lg:text-left">
              <span className="inline-block px-4 py-1.5 bg-[#14ad9f] text-white text-xs sm:text-sm font-semibold rounded-full mb-4 sm:mb-6 w-fit mx-auto lg:mx-0">
                BRAUCHST DU MEHR?
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                Taskilo<br />
                Enterprise
              </h2>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
                Du hast ein großes Team und benötigst erweiterte Funktionen, 
                individuelle Anpassungen oder dediziertes Support?
              </p>
              <a
                href="/kontakt"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 bg-[#14ad9f] text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors w-full sm:w-fit mx-auto lg:mx-0 group shadow-lg"
              >
                Demo buchen
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Right Side - Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1 */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:-translate-y-1 transition-all shadow-sm">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#14ad9f]" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Unbegrenzte Seats</h3>
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                  Keine Limits bei der Teamgröße - füge so viele Mitarbeiter hinzu, wie du brauchst.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:-translate-y-1 transition-all shadow-sm">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#14ad9f]" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Persönliches Onboarding</h3>
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                  Ein dedizierter Customer Success Manager führt dich durch den Onboarding-Prozess.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:-translate-y-1 transition-all shadow-sm">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#14ad9f]" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">DSGVO & GoBD</h3>
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                  Sicherheit ist das Herzstück unserer Arbeit - vollständig compliant und revisionssicher.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:-translate-y-1 transition-all shadow-sm">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center mb-3 sm:mb-4">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#14ad9f]" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Premium API</h3>
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">
                  Voller API-Zugang für individuelle Integrationen mit deinen bestehenden Systemen.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Dashboard Preview - Detailgetreue Nachbildung */}
          <div className="relative px-6 sm:px-10 lg:px-16 pb-6 sm:pb-10 lg:pb-16 -mt-4 hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white">
              <div className="absolute inset-0 bg-linear-to-t from-teal-50/80 via-transparent to-transparent z-10 pointer-events-none" />
              
              {/* Interactive Dashboard Mockup */}
              <div className="p-1">
                {/* Browser Chrome */}
                <div className="bg-[#2a3142] rounded-t-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-[#1a1f2e] rounded-lg px-4 py-1.5 text-gray-400 text-sm flex items-center gap-2 max-w-md w-full justify-center">
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>dashboard.taskilo.de</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="bg-[#f8fafc] rounded-b-xl overflow-hidden">
                  <div className="flex">
                    {/* Sidebar - Echte Navigation mit Hover-Submenüs */}
                    <div className="w-60 bg-white border-r border-gray-200 hidden lg:flex flex-col min-h-[500px]">
                      {/* Logo */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#14ad9f] flex items-center justify-center">
                            <span className="text-white font-bold text-lg">T</span>
                          </div>
                          <span className="font-bold text-gray-900 text-lg">Taskilo</span>
                        </div>
                      </div>
                      
                      {/* Navigation */}
                      <nav className="flex-1 p-3 space-y-1 overflow-visible">
                        {[
                          { icon: 'grid', label: 'Übersicht', active: true },
                          { icon: 'clipboard', label: 'Tasker', hasSubmenu: true, subItems: ['Posteingang', 'Aufträge', 'Projekt-Marktplatz', 'Bewertungen', 'Tasker-Level'] },
                          { icon: 'calendar', label: 'Kalender' },
                          { icon: 'mail', label: 'E-Mail', hasSubmenu: true, subItems: ['Posteingang', 'Gesendet', 'Entwürfe', 'Spam', 'Papierkorb'] },
                          { icon: 'calculator', label: 'Buchhaltung', hasSubmenu: true, subItems: ['Angebote', 'Rechnungen', 'Ausgaben', 'Steuern', 'Auswertung', 'DATEV'] },
                          { icon: 'users', label: 'Geschäftspartner' },
                          { icon: 'message', label: 'WhatsApp', premium: true },
                          { icon: 'banknote', label: 'Banking', hasSubmenu: true, subItems: ['Konten', 'Kassenbuch', 'Unvollständige Zahlungen'] },
                          { icon: 'box', label: 'Lagerbestand' },
                          { icon: 'trending', label: 'Advertising', premium: true, hasSubmenu: true, subItems: ['Dashboard', 'Google Ads', 'LinkedIn Ads', 'Meta Ads'] },
                          { icon: 'briefcase', label: 'Personal', hasSubmenu: true, subItems: ['Übersicht', 'Mitarbeiter', 'Dienstplan', 'Gehaltsabrechnung', 'Urlaub'] },
                        ].map((item) => (
                          <div 
                            key={item.label} 
                            className="relative group"
                          >
                            <div 
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                                item.active 
                                  ? 'bg-[#14ad9f]/10 text-[#14ad9f] font-medium' 
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 flex items-center justify-center">
                                  {item.icon === 'grid' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                  )}
                                  {item.icon === 'clipboard' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                  )}
                                  {item.icon === 'calendar' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  )}
                                  {item.icon === 'mail' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  )}
                                  {item.icon === 'calculator' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                  )}
                                  {item.icon === 'users' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                  )}
                                  {item.icon === 'message' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                  )}
                                  {item.icon === 'banknote' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                  )}
                                  {item.icon === 'box' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                  )}
                                  {item.icon === 'trending' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                  )}
                                  {item.icon === 'briefcase' && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                  )}
                                </div>
                                <span>{item.label}</span>
                              </div>
                              {item.hasSubmenu && (
                                <svg className="w-4 h-4 text-gray-400 group-hover:text-[#14ad9f] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                              {item.premium && !item.hasSubmenu && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">PRO</span>
                              )}
                            </div>
                            
                            {/* Hover Submenu */}
                            {item.hasSubmenu && item.subItems && (
                              <div className="absolute left-full top-0 ml-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="px-3 py-2 border-b border-gray-100">
                                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</span>
                                  {item.premium && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">PRO</span>
                                  )}
                                </div>
                                {item.subItems.map((subItem) => (
                                  <div 
                                    key={subItem}
                                    className="px-3 py-2 text-sm text-gray-600 hover:bg-[#14ad9f]/10 hover:text-[#14ad9f] cursor-pointer transition-colors"
                                  >
                                    {subItem}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </nav>

                      {/* Storage Card */}
                      <div className="p-3 border-t border-gray-100">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>Speicherplatz</span>
                            <span>2,4 GB / 10 GB</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#14ad9f] rounded-full" style={{ width: '24%' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-h-[500px]">
                      {/* Top Header Bar - Echter Taskilo Header Style */}
                      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
                        {/* Logo + Company Name */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xl font-bold text-[#14ad9f]">Taskilo</span>
                          <span className="text-gray-300 hidden md:inline">|</span>
                          <span className="text-lg font-semibold text-gray-800 hidden md:block">Meine Firma GmbH</span>
                        </div>

                        {/* Suchleiste */}
                        <div className="flex-1 relative">
                          <div className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-[#14ad9f] focus-within:border-transparent">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-sm text-gray-400">Dienstleistung auswählen...</span>
                          </div>
                        </div>

                        {/* Icons */}
                        <div className="flex items-center gap-3">
                          {/* Notifications Bell */}
                          <div className="relative p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#14ad9f] text-white text-[10px] font-medium rounded-full flex items-center justify-center">3</span>
                          </div>
                          
                          {/* Mail */}
                          <div className="relative p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>

                          {/* Help */}
                          <div className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer hidden md:block">
                            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>

                          {/* Profile Dropdown */}
                          <div className="flex items-center gap-2 pl-3 border-l border-gray-200 cursor-pointer hover:bg-gray-50 rounded-lg p-1.5 -m-1.5">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center overflow-hidden">
                              <span className="text-white font-semibold text-sm">MF</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Dashboard Content */}
                      <div className="flex-1 p-6 bg-[#f8fafc] overflow-hidden">
                        {/* Stats Cards - SectionCards Style */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          {[
                            { icon: 'trending', label: 'Umsatz (MTD)', value: '12.847,50 €', change: '+18,2%', positive: true, color: 'text-[#14ad9f]', bg: 'bg-[#14ad9f]/10' },
                            { icon: 'package', label: 'Neue Aufträge', value: '12', change: '+4 diese Woche', positive: true, color: 'text-blue-600', bg: 'bg-blue-100' },
                            { icon: 'credit', label: 'Offene Rechnungen', value: '3.420,00 €', change: '5 Stück', positive: false, color: 'text-amber-600', bg: 'bg-amber-100' },
                            { icon: 'wallet', label: 'Verfügbar', value: '8.234,00 €', change: 'Auszahlbar', positive: true, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                          ].map((stat) => (
                            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group">
                              <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                                  {stat.icon === 'trending' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                  {stat.icon === 'package' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                                  {stat.icon === 'credit' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                                  {stat.icon === 'wallet' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                                </div>
                                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                              <p className={`text-xs mt-1 ${stat.positive ? 'text-green-600' : 'text-amber-600'}`}>{stat.change}</p>
                            </div>
                          ))}
                        </div>

                        {/* Chart & Table Row */}
                        <div className="grid lg:grid-cols-3 gap-6">
                          {/* Chart - ChartAreaInteractive Style */}
                          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900">Umsatzentwicklung</h4>
                                <p className="text-sm text-gray-500">Einnahmen vs. Ausgaben</p>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                {['90T', '30T', '7T'].map((period, i) => (
                                  <button key={period} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${i === 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                    {period}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Area Chart */}
                            <div className="relative h-40">
                              <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <line x1="0" y1="30" x2="400" y2="30" stroke="#e5e7eb" strokeWidth="1" />
                                <line x1="0" y1="60" x2="400" y2="60" stroke="#e5e7eb" strokeWidth="1" />
                                <line x1="0" y1="90" x2="400" y2="90" stroke="#e5e7eb" strokeWidth="1" />
                                {/* Area fill */}
                                <path 
                                  d="M0,80 C30,75 60,60 100,50 C140,40 180,45 220,35 C260,25 300,30 340,20 C380,10 400,15 400,15 L400,120 L0,120 Z" 
                                  fill="url(#areaGradient)" 
                                />
                                {/* Line */}
                                <path 
                                  d="M0,80 C30,75 60,60 100,50 C140,40 180,45 220,35 C260,25 300,30 340,20 C380,10 400,15 400,15" 
                                  fill="none" 
                                  stroke="#14ad9f" 
                                  strokeWidth="2" 
                                />
                                <defs>
                                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#14ad9f" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#14ad9f" stopOpacity="0.05" />
                                  </linearGradient>
                                </defs>
                              </svg>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400 px-2">
                              <span>1. Jan</span>
                              <span>8. Jan</span>
                              <span>15. Jan</span>
                              <span>22. Jan</span>
                              <span>Heute</span>
                            </div>
                          </div>

                          {/* Recent Orders Table */}
                          <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-gray-900">Letzte Aufträge</h4>
                              <span className="text-xs text-[#14ad9f] font-medium cursor-pointer hover:underline">Alle anzeigen</span>
                            </div>
                            <div className="space-y-3">
                              {[
                                { service: 'Webdesign', customer: 'Schmidt GmbH', amount: '2.450 €', status: 'Abgeschlossen', statusColor: 'bg-green-100 text-green-700' },
                                { service: 'SEO Beratung', customer: 'Müller AG', amount: '890 €', status: 'In Bearbeitung', statusColor: 'bg-blue-100 text-blue-700' },
                                { service: 'Logo Design', customer: 'Weber & Co', amount: '650 €', status: 'Neu', statusColor: 'bg-amber-100 text-amber-700' },
                              ].map((order, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{order.service}</p>
                                    <p className="text-xs text-gray-500">{order.customer}</p>
                                  </div>
                                  <div className="text-right ml-3">
                                    <p className="text-sm font-semibold text-gray-900">{order.amount}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${order.statusColor}`}>{order.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Häufige Fragen</h2>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Was passiert nach der Testphase?</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Nach den 7 Tagen wird das Modul automatisch kostenpflichtig. Sie erhalten vorher 
                eine Erinnerung per E-Mail und können jederzeit kündigen.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Wie funktioniert die Abrechnung?</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Alle Module werden zusammen mit Ihrem Taskilo Business Abo abgerechnet. 
                Bei unterjährigen Änderungen erfolgt eine anteilige Berechnung.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Was sind Seats?</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Ein Seat ist ein Dashboard-Zugang für einen Mitarbeiter. Im Business-Abo ist 
                1 Seat (Inhaber) enthalten. Für jeden weiteren Mitarbeiter mit Dashboard-Zugang 
                benötigen Sie einen zusätzlichen Seat.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
