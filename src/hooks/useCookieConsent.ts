'use client';

import { useState, useEffect } from 'react';

export type CookieConsent = {
  necessary: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

const DEFAULT_CONSENT: CookieConsent = {
  necessary: true, // Immer erforderlich
  analytics: false,
  functional: false,
  marketing: false,
};

const COOKIE_CONSENT_KEY = 'taskilo_cookie_consent';
const COOKIE_BANNER_KEY = 'taskilo_cookie_banner_shown';

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Consent aus localStorage laden
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const bannerShown = localStorage.getItem(COOKIE_BANNER_KEY);

    if (savedConsent) {
      try {
        const parsedConsent = JSON.parse(savedConsent);
        setConsent(parsedConsent);
      } catch (error) {
        console.error('Error parsing cookie consent:', error);
      }
    }

    // Banner anzeigen, wenn noch keine Entscheidung getroffen wurde
    if (!bannerShown && !savedConsent) {
      setBannerVisible(true);
    }

    setIsLoading(false);
  }, []);

  const updateConsent = (newConsent: Partial<CookieConsent>) => {
    const updatedConsent = { ...consent, ...newConsent };
    setConsent(updatedConsent);
    
    // Consent speichern
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updatedConsent));
    localStorage.setItem(COOKIE_BANNER_KEY, 'true');
    
    // Banner ausblenden
    setBannerVisible(false);

    // Google Analytics Consent aktualisieren
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: updatedConsent.analytics ? 'granted' : 'denied',
        ad_storage: updatedConsent.marketing ? 'granted' : 'denied',
        functionality_storage: updatedConsent.functional ? 'granted' : 'denied',
        personalization_storage: updatedConsent.functional ? 'granted' : 'denied',
        security_storage: 'granted'
      });
    }
  };

  const acceptAll = () => {
    updateConsent({
      necessary: true,
      analytics: true,
      functional: true,
      marketing: true,
    });
  };

  const rejectAll = () => {
    updateConsent({
      necessary: true,
      analytics: false,
      functional: false,
      marketing: false,
    });
  };

  const resetConsent = () => {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_BANNER_KEY);
    setConsent(DEFAULT_CONSENT);
    setBannerVisible(true);
  };

  return {
    consent,
    bannerVisible,
    isLoading,
    updateConsent,
    acceptAll,
    rejectAll,
    resetConsent,
    setBannerVisible,
  };
}
