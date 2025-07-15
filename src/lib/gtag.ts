// Google Analytics and GTM configuration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-TG3H7QHX';

// Erweitere Window-Interface für gtag und GTM
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'consent' | 'js',
      targetId: string | Date | 'default' | 'update',
      config?: any
    ) => void;
    dataLayer: any[];
  }
}

// Google Consent Mode V2 - Initial Setup
export const initializeConsent = () => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];

    // Definiere gtag function
    window.gtag = function (...args: any[]) {
      window.dataLayer.push(args);
    };

    // Setze default consent state (denied für alle bis User zustimmt)
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted', // Immer granted für Sicherheit
      wait_for_update: 2000, // Warte 2 Sekunden auf User-Consent
    });

    // Setze current date
    window.gtag('js', new Date());
  }
};

// GTM-spezifische Initialisierung
export const initializeGTM = () => {
  if (typeof window !== 'undefined' && GTM_ID) {
    window.dataLayer = window.dataLayer || [];

    // Push GTM initialization event
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Cookie Consent Management - DSGVO V2 compliant
export const updateConsent = (consent: {
  analytics_storage?: 'granted' | 'denied';
  ad_storage?: 'granted' | 'denied';
  ad_user_data?: 'granted' | 'denied';
  ad_personalization?: 'granted' | 'denied';
  functionality_storage?: 'granted' | 'denied';
  personalization_storage?: 'granted' | 'denied';
  security_storage?: 'granted' | 'denied';
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', consent);
  }
};

// Convenience function for common consent patterns
export const grantAnalyticsConsent = () => {
  updateConsent({
    analytics_storage: 'granted',
    functionality_storage: 'granted',
  });
};

export const grantMarketingConsent = () => {
  updateConsent({
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
};

export const grantAllConsent = () => {
  updateConsent({
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    functionality_storage: 'granted',
    personalization_storage: 'granted',
    security_storage: 'granted',
  });
};

export const denyAllConsent = () => {
  updateConsent({
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted', // Sicherheit bleibt immer granted
  });
};

// Enhanced ecommerce events
export const purchaseEvent = ({
  transactionId,
  value,
  currency = 'EUR',
  items,
}: {
  transactionId: string;
  value: number;
  currency?: string;
  items: Array<{
    item_id: string;
    item_name: string;
    category: string;
    quantity: number;
    price: number;
  }>;
}) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items,
    });
  }
};

// User engagement events
export const signUpEvent = (method: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', 'sign_up', {
      method: method,
    });
  }
};

export const loginEvent = (method: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', 'login', {
      method: method,
    });
  }
};

// Custom business events for Taskilo
export const taskOrderEvent = ({
  category,
  subcategory,
  value,
}: {
  category: string;
  subcategory: string;
  value: number;
}) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', 'task_order_created', {
      event_category: 'engagement',
      custom_category: category,
      custom_subcategory: subcategory,
      value: value,
    });
  }
};

export const providerRegistrationEvent = (userType: 'company' | 'employee') => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('event', 'provider_registration', {
      event_category: 'engagement',
      user_type: userType,
    });
  }
};
