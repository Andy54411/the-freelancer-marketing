'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sendConsentToGTM } from '@/lib/gtm-dsgvo';

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  personalization: boolean;
}

interface CookieConsentContextType {
  consent: ConsentState;
  bannerVisible: boolean;
  updateConsentState: (newConsent: Partial<ConsentState>) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  resetConsent: () => void;
  setBannerVisible: (visible: boolean) => void;
  isAnalyticsAllowed: () => boolean;
  isMarketingAllowed: () => boolean;
  isFunctionalAllowed: () => boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const useCookieConsentContext = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsentContext must be used within a CookieConsentProvider');
  }
  return context;
};

interface CookieConsentProviderProps {
  children: ReactNode;
}

export const CookieConsentProvider: React.FC<CookieConsentProviderProps> = ({ children }) => {
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
    personalization: false,
  });
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    // Prüfe, ob bereits eine Einwilligung gespeichert ist
    const savedConsent = localStorage.getItem('taskilo-cookie-consent');
    if (!savedConsent) {
      setBannerVisible(true);
    } else {
      const parsedConsent = JSON.parse(savedConsent);
      setConsent(parsedConsent);

      // GTM sollte bereits initialisiert sein, aber sicherheitshalber nochmal senden
      setTimeout(() => {
        console.log('🍪 CookieConsentContext: Restoring saved consent:', parsedConsent);
        sendConsentToGTM(parsedConsent);
      }, 200);
    }
  }, []);

  const updateConsentState = (newConsent: Partial<ConsentState>) => {
    const updatedConsent = { ...consent, ...newConsent };
    setConsent(updatedConsent);
    localStorage.setItem('taskilo-cookie-consent', JSON.stringify(updatedConsent));
    setBannerVisible(false);

    // 🚀 WICHTIG: Neue Einwilligung sofort an GTM senden
    sendConsentToGTM(updatedConsent);
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      personalization: true,
    };
    updateConsentState(allAccepted);
  };

  const rejectAll = () => {
    const allRejected = {
      necessary: true, // Necessary cookies always enabled
      analytics: false,
      marketing: false,
      functional: false,
      personalization: false,
    };
    updateConsentState(allRejected);
  };

  const resetConsent = () => {
    localStorage.removeItem('taskilo-cookie-consent');
    localStorage.removeItem('cookieConsent'); // Remove old key as well
    setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      personalization: false,
    });
    setBannerVisible(true);
  };

  const isAnalyticsAllowed = () => consent.analytics;
  const isMarketingAllowed = () => consent.marketing;
  const isFunctionalAllowed = () => consent.functional;

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        bannerVisible,
        updateConsentState,
        acceptAll,
        rejectAll,
        resetConsent,
        setBannerVisible,
        isAnalyticsAllowed,
        isMarketingAllowed,
        isFunctionalAllowed,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
};
