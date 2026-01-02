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
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const savedConsent = localStorage.getItem('taskilo-cookie-consent');
    if (!savedConsent) {
      setBannerVisible(true);
    } else {
      const parsedConsent = JSON.parse(savedConsent);
      setConsent(parsedConsent);

      setTimeout(() => {
        if (process.env.NODE_ENV === 'production') {
          sendConsentToGTM(parsedConsent);
        }
      }, 200);
    }
  }, []);

  const updateConsentState = (newConsent: Partial<ConsentState>) => {
    const updatedConsent = { ...consent, ...newConsent };
    setConsent(updatedConsent);
    if (isHydrated) {
      localStorage.setItem('taskilo-cookie-consent', JSON.stringify(updatedConsent));
    }
    setBannerVisible(false);

    if (process.env.NODE_ENV === 'production') {
      sendConsentToGTM(updatedConsent);
    }
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
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      personalization: false,
    };
    updateConsentState(allRejected);
  };

  const resetConsent = () => {
    if (isHydrated) {
      localStorage.removeItem('taskilo-cookie-consent');
      localStorage.removeItem('cookieConsent');
    }
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
