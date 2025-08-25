'use client';

import { useCallback } from 'react';
import * as gtag from '@/lib/gtag';

export const useAnalytics = () => {
  const trackPageView = useCallback((url: string) => {
    gtag.pageview(url);
  }, []);

  const trackEvent = useCallback(
    (action: string, category: string, label?: string, value?: number) => {
      gtag.event(action, {
        event_category: category,
        event_label: label,
        value: value
      });
    },
    []
  );

  const trackUserRegistration = useCallback(
    (userType: 'user' | 'company' | 'employee') => {
      gtag.signUpEvent(userType, 'email');
      trackEvent('registration_completed', 'user_engagement', userType);
    },
    [trackEvent]
  );

  const trackLogin = useCallback(
    (method: string) => {
      gtag.loginEvent('user_id', method);
      trackEvent('login', 'user_engagement', method);
    },
    [trackEvent]
  );

  const trackOrderCreation = useCallback(
    (category: string, subcategory: string, value: number) => {
      gtag.taskOrderEvent(`order_${Date.now()}`, value, `${category}_${subcategory}`);
      trackEvent('order_created', 'ecommerce', `${category}_${subcategory}`, value);
    },
    [trackEvent]
  );

  const trackProviderRegistration = useCallback(
    (userType: 'company' | 'employee') => {
      gtag.providerRegistrationEvent(`provider_${Date.now()}`, userType);
      trackEvent('provider_registration', 'business', userType);
    },
    [trackEvent]
  );

  const trackPurchase = useCallback(
    (
      transactionId: string,
      value: number,
      _items: Array<{
        item_id: string;
        item_name: string;
        category: string;
        quantity: number;
        price: number;
      }>
    ) => {
      gtag.purchaseEvent(transactionId, value, 'EUR');
      trackEvent('purchase', 'ecommerce', transactionId, value);
    },
    [trackEvent]
  );

  // Navigation tracking
  const trackNavigation = useCallback(
    (destination: string, source?: string) => {
      trackEvent('navigation', 'user_interaction', `${source || 'unknown'}_to_${destination}`);
    },
    [trackEvent]
  );

  // Feature usage tracking
  const trackFeatureUsage = useCallback(
    (feature: string, action: string) => {
      trackEvent(action, 'feature_usage', feature);
    },
    [trackEvent]
  );

  // Search tracking
  const trackSearch = useCallback(
    (searchTerm: string, category?: string) => {
      trackEvent('search', 'user_interaction', searchTerm);
      if (category) {
        trackEvent('category_search', 'user_interaction', `${category}_${searchTerm}`);
      }
    },
    [trackEvent]
  );

  // Contact/Support tracking
  const trackContactInteraction = useCallback(
    (type: 'chat' | 'email' | 'phone' | 'form') => {
      trackEvent('contact_interaction', 'support', type);
    },
    [trackEvent]
  );

  return {
    trackPageView,
    trackEvent,
    trackUserRegistration,
    trackLogin,
    trackOrderCreation,
    trackProviderRegistration,
    trackPurchase,
    trackNavigation,
    trackFeatureUsage,
    trackSearch,
    trackContactInteraction,
  };
};
