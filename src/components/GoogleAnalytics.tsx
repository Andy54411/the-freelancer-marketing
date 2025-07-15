'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { GA_TRACKING_ID, GTM_ID, pageview, initializeConsent } from '@/lib/gtag';
import { Suspense } from 'react';

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_TRACKING_ID || typeof window === 'undefined') return;

    const url = pathname + searchParams.toString();
    pageview(url);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Initialize consent mode
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

      {/* Google Analytics Script (falls GA_TRACKING_ID separat verwendet wird) */}
      {GA_TRACKING_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <Script
            id="google-analytics"
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
