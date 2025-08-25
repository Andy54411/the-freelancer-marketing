'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { GA_TRACKING_ID, GTM_ID, pageview, initializeConsent, updateConsent } from '@/lib/gtag';
import { useCookieConsentContext } from '@/contexts/CookieConsentContext';
import { Suspense } from 'react';

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { consent } = useCookieConsentContext();

  // Track page views
  useEffect(() => {
    if (!GA_TRACKING_ID || typeof window === 'undefined' || !consent.analytics) return;

    const url = (pathname || '') + (searchParams?.toString() || '');
    pageview(url);
  }, [pathname, searchParams, consent.analytics]);

  // Update consent when cookie preferences change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateConsent({
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      functionality_storage: consent.functional ? 'granted' : 'denied',
      personalization_storage: consent.personalization ? 'granted' : 'denied',
      security_storage: 'granted', // Always granted
    });
  }, [consent]);

  // Initialize consent mode on first load
  useEffect(() => {
    initializeConsent();
  }, []);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_TRACKING_ID && !GTM_ID) {
    return null;
  }

  return (
    <>
      {/* Google Analytics Script */}
      {GA_TRACKING_ID && (
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          id="google-analytics"
        />
      )}

      {/* Google Analytics Configuration */}
      {GA_TRACKING_ID && (
        <Script
          id="google-analytics-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', '${GA_TRACKING_ID}', {
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
              });
            `,
          }}
        />
      )}

      {/* Analytics Component with Suspense */}
      <Suspense fallback={null}>
        <GoogleAnalyticsInner />
      </Suspense>
    </>
  );
}
