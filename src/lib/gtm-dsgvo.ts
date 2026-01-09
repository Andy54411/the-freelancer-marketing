// DSGVO-konforme GTM Event-Utilities

declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * Sendet DSGVO-konforme Cookie-Einwilligung an GTM
 */
export const sendConsentToGTM = (consent: {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  necessary: boolean;
  personalization: boolean;
}) => {
  if (typeof window === 'undefined') return;

  // Skip GTM in development to avoid postMessage errors
  if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  // Speichere Consent mit Timestamp
  const consentWithTimestamp = {
    ...consent,
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem('taskilo-cookie-consent', JSON.stringify(consentWithTimestamp));

  // 🚀 WICHTIG: Google Consent Mode v2 Update senden
  const consentUpdate = {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
    functionality_storage: consent.functional ? 'granted' : 'denied',
    personalization_storage: consent.personalization ? 'granted' : 'denied',
    security_storage: 'granted', // Immer erlaubt
  };

  // Debug logging

  // Method 1: GTM DataLayer Event
  window.dataLayer.push({
    event: 'consent_update',
    consent: consentUpdate,
  });

  // Method 2: Direct gtag consent update (primary method)
  if (typeof (window as any).gtag !== 'undefined') {
    (window as any).gtag('consent', 'update', consentUpdate);
  } else {
  }

  // Method 3: Alternative DataLayer push format
  window.dataLayer.push(['consent', 'update', consentUpdate]);

  // Sende einzelne Consent-Events für jeden Typ
  if (consent.analytics) {
    window.dataLayer.push({
      event: 'analytics_consent_granted',
      consent_type: 'analytics',
      consent_value: true,
      timestamp: new Date().toISOString(),
    });
  }

  if (consent.marketing) {
    window.dataLayer.push({
      event: 'marketing_consent_granted',
      consent_type: 'marketing',
      consent_value: true,
      timestamp: new Date().toISOString(),
    });
  }

  if (consent.functional) {
    window.dataLayer.push({
      event: 'functional_consent_granted',
      consent_type: 'functional',
      consent_value: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Sende allgemeines Consent-Event
  window.dataLayer.push({
    event: 'cookie_consent_updated',
    consent_analytics: consent.analytics,
    consent_marketing: consent.marketing,
    consent_functional: consent.functional,
    consent_necessary: consent.necessary,
    consent_personalization: consent.personalization,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Prüft ob Analytics-Consent gegeben wurde
 */
export const hasAnalyticsConsent = (): boolean => {
  try {
    // Development: Allow analytics consent for testing
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return true;
    }
    
    // Check both possible storage keys
    let consent = localStorage.getItem('taskilo-cookie-consent');
    if (!consent) {
      consent = localStorage.getItem('cookieConsent');
    }
    
    if (consent) {
      const consentObj = JSON.parse(consent);
      return consentObj.analytics === true;
    }
  } catch {}
  return false;
};

/**
 * Prüft ob Marketing-Consent gegeben wurde
 */
export const hasMarketingConsent = (): boolean => {
  try {
    const consent = localStorage.getItem('cookieConsent');
    if (consent) {
      const consentObj = JSON.parse(consent);
      return consentObj.marketing === true;
    }
  } catch {}
  return false;
};

/**
 * Prüft ob Functional-Consent gegeben wurde
 */
export const hasFunctionalConsent = (): boolean => {
  try {
    // Development: Allow functional consent for testing
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return true;
    }
    
    // Check both possible storage keys
    let consent = localStorage.getItem('taskilo-cookie-consent');
    if (!consent) {
      consent = localStorage.getItem('cookieConsent');
    }
    
    if (consent) {
      const consentObj = JSON.parse(consent);
      return consentObj.functional === true;
    }
  } catch {}
  return false;
};

/**
 * DSGVO-konforme Page View - nur mit Consent
 */
export const trackPageViewWithConsent = (pageData?: {
  page_title?: string;
  page_location?: string;
  page_path?: string;
}) => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'page_view_with_consent',
    page_title: pageData?.page_title || document.title,
    page_location: pageData?.page_location || window.location.href,
    page_path: pageData?.page_path || window.location.pathname,
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * DSGVO-konforme Button Clicks - nur mit Consent
 */
export const trackButtonClickWithConsent = (buttonData: {
  button_text?: string;
  button_id?: string;
  button_class?: string;
}) => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'button_click_with_consent',
    button_text: buttonData.button_text,
    button_id: buttonData.button_id,
    button_class: buttonData.button_class,
    page_location: window.location.href,
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * DSGVO-konforme Form Submits - nur mit Consent
 */
export const trackFormSubmitWithConsent = (formData: {
  form_id?: string;
  form_name?: string;
  form_action?: string;
}) => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'form_submit_with_consent',
    form_id: formData.form_id,
    form_name: formData.form_name,
    form_action: formData.form_action,
    page_location: window.location.href,
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * DSGVO-konforme E-Commerce Events - nur mit Consent
 */
export const trackPurchaseWithConsent = (purchaseData: {
  transaction_id: string;
  value: number;
  currency: string;
  items: any[];
}) => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'purchase_with_consent',
    transaction_id: purchaseData.transaction_id,
    value: purchaseData.value,
    currency: purchaseData.currency,
    items: purchaseData.items,
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * DSGVO-konforme Service Booking (TASKILO-spezifisch) - nur mit Consent
 */
export const trackServiceBookingWithConsent = (serviceData: {
  service_id: string;
  service_name: string;
  service_category: string;
  service_price: number;
  provider_id?: string;
  provider_name?: string;
}) => {
  if (!hasAnalyticsConsent()) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'service_booking_with_consent',
    service_id: serviceData.service_id,
    service_name: serviceData.service_name,
    service_category: serviceData.service_category,
    service_price: serviceData.service_price,
    provider_id: serviceData.provider_id,
    provider_name: serviceData.provider_name,
    consent_given: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Entfernt alle Tracking-Cookies bei Consent-Widerruf
 */
export const removeTrackingCookies = () => {
  // Entferne GA4-Cookies
  const ga4Cookies = ['_ga', '_ga_*', '_gid', '_gat_*'];

  ga4Cookies.forEach(cookieName => {
    if (cookieName.includes('*')) {
      // Entferne alle Cookies die mit dem Pattern übereinstimmen
      const prefix = cookieName.replace('*', '');
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (name.startsWith(prefix)) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } else {
      // Entferne spezifische Cookies
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
};

/**
 * Widerruft alle Consents und entfernt Tracking-Cookies
 */
export const revokeAllConsents = () => {
  // Entferne lokalen Storage
  localStorage.removeItem('cookieConsent');

  // Entferne Tracking-Cookies
  removeTrackingCookies();

  // Sende Widerruf-Event
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'cookie_consent_revoked',
    consent_analytics: false,
    consent_marketing: false,
    consent_functional: false,
    consent_necessary: true,
    consent_personalization: false,
    timestamp: new Date().toISOString(),
  });
};
