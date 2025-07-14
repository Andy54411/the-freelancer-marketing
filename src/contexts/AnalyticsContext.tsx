'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsContextType {
  trackEvent: (action: string, category: string, label?: string, value?: number) => void;
  trackUserRegistration: (userType: 'user' | 'company' | 'employee') => void;
  trackLogin: (method: string) => void;
  trackOrderCreation: (category: string, subcategory: string, value: number) => void;
  trackNavigation: (destination: string, source?: string) => void;
  trackFeatureUsage: (feature: string, action: string) => void;
  trackSearch: (searchTerm: string, category?: string) => void;
  trackContactInteraction: (type: 'chat' | 'email' | 'phone' | 'form') => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const analytics = useAnalytics();

  // Track page views automatically only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      analytics.trackPageView(pathname);
      analytics.trackEvent('page_load', 'navigation', pathname);
    }
  }, [pathname, analytics]);

  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
};

export const useAnalyticsContext = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};
