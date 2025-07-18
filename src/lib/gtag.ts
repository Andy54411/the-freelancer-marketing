// Google Analytics and GTM configuration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

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
      security_storage: 'granted',
      wait_for_update: 2000,
    });

    // Setze current date
    window.gtag('js', new Date());
  }
};

// Update consent based on user preferences
export const updateConsent = (consentSettings: Record<string, 'granted' | 'denied'>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'update', consentSettings);
  }
};

// Track page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Track custom events
export const event = (action: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, parameters);
  }
};

// Track conversion events
export const trackConversion = (conversionId: string, conversionLabel?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      ...(conversionLabel && { conversion_label: conversionLabel }),
    });
  }
};

// Track purchases
export const trackPurchase = (transactionId: string, value: number, currency: string = 'EUR') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
    });
  }
};

// Track form submissions
export const trackFormSubmit = (formName: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'form_submit', {
      form_name: formName,
    });
  }
};

// Track user engagement
export const trackEngagement = (engagementTime: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'user_engagement', {
      engagement_time_msec: engagementTime,
    });
  }
};

// Track sign up events
export const signUpEvent = (userId: string, method: string = 'email') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sign_up', {
      method: method,
      user_id: userId,
    });
  }
};

// Track login events
export const loginEvent = (userId: string, method: string = 'email') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'login', {
      method: method,
      user_id: userId,
    });
  }
};

// Track task order events
export const taskOrderEvent = (orderId: string, value: number, category: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'order_created', {
      order_id: orderId,
      value: value,
      category: category,
    });
  }
};

// Track provider registration events
export const providerRegistrationEvent = (providerId: string, serviceCategory: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'provider_registration', {
      provider_id: providerId,
      service_category: serviceCategory,
    });
  }
};

// Track purchase events
export const purchaseEvent = (transactionId: string, value: number, currency: string = 'EUR') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
    });
  }
};
