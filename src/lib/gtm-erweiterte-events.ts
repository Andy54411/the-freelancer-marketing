// Erweiterte GTM-Events für Taskilo User Registration und Order Tracking
// src/lib/gtm-erweiterte-events.ts

declare global {
  interface Window {
    gtag: (command: "consent" | "config" | "event" | "js", targetId: string | Date, config?: any) => void;
    dataLayer: any[];
  }
}

export interface UserRegistrationData {
  category: 'kunde' | 'dienstleister';
  userId: string;
  email?: string;
  registrationMethod?: 'email' | 'google' | 'facebook';
  timestamp: string;
}

export interface OrderCreationData {
  category: 'reinigung' | 'garten_landschaft' | 'handwerk' | 'transport_umzug' | 'it_technik' | 'beratung_coaching' | 'gesundheit_wellness' | 'sonstiges';
  subcategory?: string;
  orderId: string;
  userId: string;
  value?: number;
  currency?: string;
  timestamp: string;
  location?: string;
}

// User Registration Events
export const trackUserRegistration = (data: UserRegistrationData) => {
  // GTM Event
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'user_registration',
      user_category: data.category,
      user_id: data.userId,
      registration_method: data.registrationMethod || 'email',
      timestamp: data.timestamp,
      email_hash: data.email ? btoa(data.email) : undefined // Gehashed für Datenschutz
    });
  }

  // Google Analytics 4 Event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'sign_up', {
      method: data.registrationMethod || 'email',
      custom_parameter_1: data.category,
      user_id: data.userId,
      timestamp: data.timestamp
    });
  }

  console.log('📊 User Registration Tracked:', {
    category: data.category,
    userId: data.userId,
    method: data.registrationMethod
  });
};

// Order Creation Events
export const trackOrderCreation = (data: OrderCreationData) => {
  // GTM Event
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'order_created',
      order_category: data.category,
      order_subcategory: data.subcategory || '',
      order_id: data.orderId,
      user_id: data.userId,
      order_value: data.value || 0,
      currency: data.currency || 'EUR',
      timestamp: data.timestamp,
      location: data.location || ''
    });
  }

  // Google Analytics 4 Event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: data.orderId,
      value: data.value || 0,
      currency: data.currency || 'EUR',
      items: [{
        item_id: data.orderId,
        item_name: `${data.category} - ${data.subcategory || 'Allgemein'}`,
        item_category: data.category,
        item_category2: data.subcategory,
        quantity: 1,
        price: data.value || 0
      }],
      custom_parameter_1: data.category,
      custom_parameter_2: data.subcategory,
      user_id: data.userId
    });
  }

  console.log('📊 Order Creation Tracked:', {
    category: data.category,
    subcategory: data.subcategory,
    orderId: data.orderId,
    value: data.value
  });
};

// Spezifische Kategorie-Events für besseres Tracking
export const trackOrderByCategory = {
  reinigung: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'reinigung' }),
  
  gartenLandschaft: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'garten_landschaft' }),
  
  handwerk: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'handwerk' }),
  
  transportUmzug: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'transport_umzug' }),
  
  itTechnik: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'it_technik' }),
  
  beratungCoaching: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'beratung_coaching' }),
  
  gesundheitWellness: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'gesundheit_wellness' }),
  
  sonstiges: (data: Omit<OrderCreationData, 'category'>) => 
    trackOrderCreation({ ...data, category: 'sonstiges' })
};

// User Registration nach Kategorie
export const trackRegistrationByCategory = {
  kunde: (data: Omit<UserRegistrationData, 'category'>) => 
    trackUserRegistration({ ...data, category: 'kunde' }),
  
  dienstleister: (data: Omit<UserRegistrationData, 'category'>) => 
    trackUserRegistration({ ...data, category: 'dienstleister' })
};

// Erweiterte Analytics Events
export const trackOrderInteraction = (action: 'view' | 'edit' | 'cancel' | 'complete', orderId: string, category: string) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'order_interaction',
      order_action: action,
      order_id: orderId,
      order_category: category,
      timestamp: new Date().toISOString()
    });
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'order_interaction', {
      action: action,
      order_id: orderId,
      category: category
    });
  }
};

export const trackUserJourney = (step: 'registration' | 'profile_complete' | 'first_order' | 'recurring_user', userId: string) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'user_journey',
      journey_step: step,
      user_id: userId,
      timestamp: new Date().toISOString()
    });
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'user_journey', {
      step: step,
      user_id: userId
    });
  }
};

// Performance Tracking für verschiedene Kategorien
export const trackCategoryPerformance = (category: string, metrics: {
  loadTime?: number;
  interactionTime?: number;
  conversionStep?: string;
}) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'category_performance',
      category: category,
      load_time: metrics.loadTime || 0,
      interaction_time: metrics.interactionTime || 0,
      conversion_step: metrics.conversionStep || '',
      timestamp: new Date().toISOString()
    });
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'category_performance', {
      category: category,
      load_time: metrics.loadTime,
      interaction_time: metrics.interactionTime,
      conversion_step: metrics.conversionStep
    });
  }
};

// DSGVO-konformes Tracking mit Consent Check
export const trackWithConsent = (trackingFunction: () => void) => {
  if (typeof window !== 'undefined') {
    const consent = localStorage.getItem('taskilo-cookie-consent');
    if (consent) {
      const consentData = JSON.parse(consent);
      if (consentData.analytics) {
        trackingFunction();
      } else {
        console.log('📊 Tracking skipped - Analytics consent not granted');
      }
    }
  }
};

// Utility für sichere Event-Übertragung
export const safeTrackEvent = (eventName: string, parameters: Record<string, any>) => {
  trackWithConsent(() => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({
        event: eventName,
        ...parameters,
        timestamp: new Date().toISOString()
      });
    }
  });
};
