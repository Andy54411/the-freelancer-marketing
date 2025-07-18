'use client';

import { useState, useEffect } from 'react';

export default function DebugCookiesPage() {
  const [cookies, setCookies] = useState<string[]>([]);
  const [localStorage, setLocalStorage] = useState<{ [key: string]: string }>({});
  const [gtmLoaded, setGtmLoaded] = useState(false);
  const [gaLoaded, setGaLoaded] = useState(false);

  useEffect(() => {
    // Check all cookies
    const allCookies = document.cookie.split(';').map(cookie => cookie.trim());
    setCookies(allCookies);

    // Check localStorage
    const localStorageData: { [key: string]: string } = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        localStorageData[key] = window.localStorage.getItem(key) || '';
      }
    }
    setLocalStorage(localStorageData);

    // Check if GTM is loaded
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      setGtmLoaded(true);
    }

    // Check if GA is loaded
    if (typeof window !== 'undefined' && (window as any).gtag) {
      setGaLoaded(true);
    }
  }, []);

  const testCookie = () => {
    document.cookie = `test-cookie=test-value-${Date.now()}; path=/; max-age=3600`;
    window.location.reload();
  };

  const clearAllCookies = () => {
    // Clear all cookies
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });

    // Clear localStorage
    window.localStorage.clear();

    // Reload page to see changes
    window.location.reload();
  };

  const triggerConsentUpdate = () => {
    // Manually trigger consent update for debugging
    const testConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      personalization: true,
    };

    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'consent_update',
        consent: {
          analytics_storage: 'granted',
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted',
          functionality_storage: 'granted',
          personalization_storage: 'granted',
          security_storage: 'granted',
        },
      });
    }

    // Also try direct gtag call
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        functionality_storage: 'granted',
        personalization_storage: 'granted',
        security_storage: 'granted',
      });
    }

    console.log('🚀 Consent update triggered!');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Cookie Debug Page</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Environment Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Environment</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>GTM ID:</strong> {process.env.NEXT_PUBLIC_GTM_ID || 'Not set'}
              </p>
              <p>
                <strong>GA ID:</strong> {process.env.NEXT_PUBLIC_GA_ID || 'Not set'}
              </p>
              <p>
                <strong>GTM Loaded:</strong> {gtmLoaded ? '✅ Yes' : '❌ No'}
              </p>
              <p>
                <strong>GA Loaded:</strong> {gaLoaded ? '✅ Yes' : '❌ No'}
              </p>
              <p>
                <strong>User Agent:</strong>{' '}
                {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Actions</h2>
            <div className="space-y-4">
              <button
                onClick={testCookie}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Test Cookie Creation
              </button>
              <button
                onClick={clearAllCookies}
                className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
              >
                Clear All Cookies & LocalStorage
              </button>
            </div>
          </div>

          {/* Cookies */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Current Cookies ({cookies.length})
            </h2>
            <div className="max-h-64 overflow-y-auto">
              {cookies.length === 0 ? (
                <p className="text-gray-500 italic">No cookies found</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {cookies.map((cookie, index) => (
                    <li key={index} className="font-mono text-xs bg-gray-100 p-2 rounded">
                      {cookie}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* LocalStorage */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              LocalStorage ({Object.keys(localStorage).length})
            </h2>
            <div className="max-h-64 overflow-y-auto">
              {Object.keys(localStorage).length === 0 ? (
                <p className="text-gray-500 italic">No localStorage data found</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {Object.entries(localStorage).map(([key, value]) => (
                    <li key={key} className="font-mono text-xs bg-gray-100 p-2 rounded">
                      <strong>{key}:</strong> {value.substring(0, 100)}
                      {value.length > 100 ? '...' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* GTM DataLayer */}
        {gtmLoaded && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">GTM DataLayer</h2>
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-xs bg-gray-100 p-4 rounded">
                {JSON.stringify((window as any).dataLayer, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
