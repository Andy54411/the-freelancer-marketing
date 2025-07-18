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
  const { isAnalyticsAllowed, isMarketingAllowed, isFunctionalAllowed, consent } =
    useCookieConsentContext();

  // Track page views
  useEffect(() => {
    if (!GA_TRACKING_ID || typeof window === 'undefined' || !isAnalyticsAllowed) return;

    const url = pathname + searchParams.toString();
    pageview(url);
  }, [pathname, searchParams, isAnalyticsAllowed]);

  // Update consent when cookie preferences change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateConsent({
      analytics_storage: isAnalyticsAllowed ? 'granted' : 'denied',
      ad_storage: isMarketingAllowed ? 'granted' : 'denied',
      ad_user_data: isMarketingAllowed ? 'granted' : 'denied',
      ad_personalization: isMarketingAllowed ? 'granted' : 'denied',
      functionality_storage: isFunctionalAllowed ? 'granted' : 'denied',
      personalization_storage: consent.personalization ? 'granted' : 'denied',
      security_storage: 'granted', // Always granted
    });
  }, [isAnalyticsAllowed, isMarketingAllowed, isFunctionalAllowed, consent.personalization]);

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
      {/* Google Consent Mode V2 - Initialize before any tracking */}
      <Script
        id="google-consent-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            
            // Set default consent state
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'functionality_storage': 'denied',
              'personalization_storage': 'denied',
              'security_storage': 'granted',
              'wait_for_update': 2000
            });
          `,
        }}
      />

      {/* Google Tag Manager Script */}
      {GTM_ID && (
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
      )}

      {/* Google Tag Manager NoScript Fallback */}
      {GTM_ID && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      )}

      {/* Google Analytics Script (wenn GA direkt verwendet wird, zusätzlich zu GTM) */}
      {GA_TRACKING_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <Script
            id="google-analytics-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}', {
                  page_path: window.location.pathname,
                  anonymize_ip: true,
                  cookie_flags: 'SameSite=None;Secure',
                  send_page_view: false // Controlled by consent
                });
              `,
            }}
          />
        </>
      )}

      <Suspense fallback={null}>
        <GoogleAnalyticsInner />
      </Suspense>
    </>
  );
}
