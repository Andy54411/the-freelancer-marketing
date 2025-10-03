// Google Tag Manager DataLayer utilities

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (
      command: 'config' | 'event' | 'consent' | 'js',
      targetId: string | Date,
      config?: any
    ) => void;
  }
}

export interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  personalization: boolean;
}

export const initializeGTM = () => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args);
    };
  }
};

export const trackCookieConsent = (consent: ConsentState) => {
  if (typeof window !== 'undefined' && window.gtag) {
    // Google Analytics Consent Mode
    window.gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      functionality_storage: consent.functional ? 'granted' : 'denied',
      personalization_storage: consent.functional ? 'granted' : 'denied',
      security_storage: 'granted', // Always granted for necessary cookies
    });

    // Custom event for tracking cookie consent
    window.gtag('event', 'cookie_consent', {
      event_category: 'engagement',
      event_label: 'cookie_consent_updated',
      custom_parameters: {
        analytics_consent: consent.analytics,
        marketing_consent: consent.marketing,
        functional_consent: consent.functional,
      },
    });
  }
};

export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
      page_path: url,
    });
  }
};

export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};
