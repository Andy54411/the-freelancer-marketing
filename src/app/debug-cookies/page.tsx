'use client';

import { useState, useEffect } from 'react';

// Global console log capture - starts immediately
const capturedLogs: string[] = [];
const originalConsoleLog = console.log;

// Override console.log immediately
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('GTM') || message.includes('🚀')) {
    capturedLogs.push(`${new Date().toLocaleTimeString()}: ${message}`);
  }
  originalConsoleLog.apply(console, args);
};

export default function DebugCookiesPage() {
  const [cookies, setCookies] = useState<string[]>([]);
  const [localStorage, setLocalStorage] = useState<{ [key: string]: string }>({});
  const [gtmLoaded, setGtmLoaded] = useState(false);
  const [gaLoaded, setGaLoaded] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [cookieHistory, setCookieHistory] = useState<{ timestamp: string; cookies: string[] }[]>(
    []
  );
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    // Load any previously captured logs
    setConsoleLogs([...capturedLogs]);

    // Initial cookie check
    const initialCookies = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .filter(c => c);
    setCookies(initialCookies);

    // Add to history
    setCookieHistory([
      {
        timestamp: new Date().toLocaleTimeString(),
        cookies: initialCookies,
      },
    ]);

    // Check if consent has been given
    const checkConsentAndStartMonitoring = () => {
      const storedConsent = window.localStorage.getItem('taskilo-cookie-consent');
      let hasAnalyticsConsent = false;

      if (storedConsent) {
        try {
          const parsed = JSON.parse(storedConsent);
          hasAnalyticsConsent = parsed.analytics === true;
        } catch (e) {
          console.log('Error parsing consent:', e);
        }
      }

      // Only start cookie monitoring if analytics consent is given
      if (hasAnalyticsConsent) {
        capturedLogs.push(
          `${new Date().toLocaleTimeString()}: ✅ ANALYTICS CONSENT GRANTED - Starting cookie monitoring`
        );
        setConsoleLogs([...capturedLogs]);
        setMonitoringActive(true);

        // Cookie monitoring - check every 2 seconds for new cookies
        const cookieInterval = setInterval(() => {
          const currentCookies = document.cookie
            .split(';')
            .map(cookie => cookie.trim())
            .filter(c => c);

          setCookies(prevCookies => {
            // Check if cookies have changed
            if (JSON.stringify(currentCookies.sort()) !== JSON.stringify(prevCookies.sort())) {
              const newCookies = currentCookies.filter(cookie => !prevCookies.includes(cookie));
              const removedCookies = prevCookies.filter(cookie => !currentCookies.includes(cookie));

              // Log changes
              if (newCookies.length > 0) {
                capturedLogs.push(
                  `${new Date().toLocaleTimeString()}: 🍪 NEW COOKIES DETECTED: ${newCookies.join(', ')}`
                );
                setConsoleLogs([...capturedLogs]);
              }
              if (removedCookies.length > 0) {
                capturedLogs.push(
                  `${new Date().toLocaleTimeString()}: 🗑️ COOKIES REMOVED: ${removedCookies.join(', ')}`
                );
                setConsoleLogs([...capturedLogs]);
              }

              // Update history
              setCookieHistory(prev =>
                [
                  ...prev,
                  {
                    timestamp: new Date().toLocaleTimeString(),
                    cookies: currentCookies,
                  },
                ].slice(-10)
              ); // Keep last 10 entries
            }
            return currentCookies;
          });
        }, 2000);

        return cookieInterval;
      } else {
        capturedLogs.push(
          `${new Date().toLocaleTimeString()}: ⛔ NO ANALYTICS CONSENT - Cookie monitoring disabled`
        );
        setConsoleLogs([...capturedLogs]);
        setMonitoringActive(false);
        return null;
      }
    };

    // Start monitoring based on consent
    let cookieInterval: NodeJS.Timeout | null = checkConsentAndStartMonitoring();

    // Listen for storage changes (when consent is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'taskilo-cookie-consent') {
        // Clear existing interval
        if (cookieInterval) {
          clearInterval(cookieInterval);
          cookieInterval = null;
        }
        // Restart monitoring based on new consent
        cookieInterval = checkConsentAndStartMonitoring();
      }
    };

    window.addEventListener('storage', handleStorageChange);

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

    // Cleanup
    return () => {
      console.log = originalConsoleLog;
      if (cookieInterval) {
        clearInterval(cookieInterval);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
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

  const refreshLogs = () => {
    setConsoleLogs([...capturedLogs]);
  };

  const showCurrentConsentState = () => {
    try {
      const stored = window.localStorage.getItem('taskilo-cookie-consent');
      const hasAnalyticsCookies =
        document.cookie.includes('_ga=') || document.cookie.includes('_ga_');

      // Simulate the same logic as in layout.tsx
      let simulatedPath = 'UNKNOWN';
      if (stored) {
        const parsed = JSON.parse(stored);
        simulatedPath = 'SAVED_CONSENT';
        capturedLogs.push(
          `${new Date().toLocaleTimeString()}: ✅ SAVED CONSENT FOUND: ${JSON.stringify(parsed)}`
        );
      } else if (hasAnalyticsCookies) {
        simulatedPath = 'INFERRED_FROM_COOKIES';
        capturedLogs.push(
          `${new Date().toLocaleTimeString()}: 🍪 COOKIE INFERENCE: Analytics cookies detected`
        );
      } else {
        simulatedPath = 'DEFAULT_DENIED';
        capturedLogs.push(
          `${new Date().toLocaleTimeString()}: 🚫 DEFAULT DENIED: No consent or cookies found`
        );
      }

      capturedLogs.push(
        `${new Date().toLocaleTimeString()}: 🎯 GTM SHOULD INITIALIZE WITH: ${simulatedPath}`
      );
      setConsoleLogs([...capturedLogs]);
    } catch (e) {
      capturedLogs.push(
        `${new Date().toLocaleTimeString()}: ❌ Error checking consent state: ${e}`
      );
      setConsoleLogs([...capturedLogs]);
    }
  };

  const testConsentFlow = () => {
    // Simulate giving analytics consent
    const testConsent = {
      necessary: true,
      analytics: true,
      marketing: false,
      functional: true,
      personalization: false,
    };

    window.localStorage.setItem('taskilo-cookie-consent', JSON.stringify(testConsent));

    // Trigger storage event manually (for same-tab updates)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'taskilo-cookie-consent',
        newValue: JSON.stringify(testConsent),
        oldValue: null,
      })
    );

    capturedLogs.push(
      `${new Date().toLocaleTimeString()}: 🧪 TEST: Analytics consent granted - Monitoring should activate`
    );
    setConsoleLogs([...capturedLogs]);
  };

  const revokeConsent = () => {
    // Simulate revoking analytics consent
    const testConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: true,
      personalization: false,
    };

    window.localStorage.setItem('taskilo-cookie-consent', JSON.stringify(testConsent));

    // Trigger storage event manually
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'taskilo-cookie-consent',
        newValue: JSON.stringify(testConsent),
        oldValue: null,
      })
    );

    capturedLogs.push(
      `${new Date().toLocaleTimeString()}: 🧪 TEST: Analytics consent revoked - Monitoring should deactivate`
    );
    setConsoleLogs([...capturedLogs]);
  };

  const forceCheckCookies = () => {
    const currentCookies = document.cookie
      .split(';')
      .map(cookie => cookie.trim())
      .filter(c => c);
    const currentCookieNames = currentCookies.map(cookie => cookie.split('=')[0]);
    const previousCookieNames = cookies.map(cookie => cookie.split('=')[0]);

    // Find new cookies
    const newCookies = currentCookieNames.filter(name => !previousCookieNames.includes(name));

    // Mark new cookies as recently added
    if (newCookies.length > 0) {
      setRecentlyAdded(prev => new Set([...Array.from(prev), ...newCookies]));
      // Remove the "recently added" status after 5 seconds
      setTimeout(() => {
        setRecentlyAdded(prev => {
          const updated = new Set(prev);
          newCookies.forEach(cookie => updated.delete(cookie));
          return updated;
        });
      }, 5000);
    }

    setCookies(currentCookies);

    // Add to history
    setCookieHistory(prev =>
      [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          cookies: currentCookies,
        },
      ].slice(-10)
    );

    capturedLogs.push(
      `${new Date().toLocaleTimeString()}: 🔍 MANUAL COOKIE CHECK: Found ${currentCookies.length} cookies${newCookies.length > 0 ? `, NEW: ${newCookies.join(', ')}` : ''}`
    );
    setConsoleLogs([...capturedLogs]);
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
                <strong>Cookie Monitoring:</strong>{' '}
                {monitoringActive ? '✅ Active' : '⛔ Disabled (No Consent)'}
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
                onClick={triggerConsentUpdate}
                className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              >
                🚀 Force Consent Update
              </button>
              <button
                onClick={refreshLogs}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
              >
                🔄 Refresh GTM Logs
              </button>
              <button
                onClick={showCurrentConsentState}
                className="w-full bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700"
              >
                📊 Show Consent State
              </button>
              <button
                onClick={forceCheckCookies}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700"
              >
                🔍 Check Cookies Now
              </button>
              <button
                onClick={testConsentFlow}
                className="w-full bg-emerald-600 text-white py-2 px-4 rounded hover:bg-emerald-700"
              >
                🧪 Test: Grant Analytics Consent
              </button>
              <button
                onClick={revokeConsent}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700"
              >
                🧪 Test: Revoke Analytics Consent
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
              <span className="text-sm font-normal text-gray-500 ml-2">
                {monitoringActive
                  ? '(Auto-refreshes every 2s)'
                  : '(Monitoring disabled - No consent)'}
              </span>
            </h2>
            {!monitoringActive && (
              <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                <p className="text-sm">
                  ⚠️ <strong>Cookie-Monitoring deaktiviert:</strong> Analytics-Zustimmung
                  erforderlich
                </p>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto">
              {cookies.length === 0 ? (
                <p className="text-gray-500 italic">No cookies found</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {cookies.map((cookie, index) => {
                    const cookieName = cookie.split('=')[0];
                    const isAnalytics = cookie.includes('_ga');
                    const isGTM = cookie.includes('GTM') || cookie.includes('TAG_ASSISTANT');
                    const isTaskilo = cookie.includes('taskilo');
                    const isNewlyAdded = recentlyAdded.has(cookieName);

                    return (
                      <li
                        key={index}
                        className={`font-mono text-xs p-2 rounded border-l-4 ${
                          isNewlyAdded
                            ? 'bg-yellow-100 border-yellow-500 animate-pulse'
                            : isAnalytics
                              ? 'bg-blue-50 border-blue-400'
                              : isGTM
                                ? 'bg-green-50 border-green-400'
                                : isTaskilo
                                  ? 'bg-purple-50 border-purple-400'
                                  : 'bg-gray-100 border-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isNewlyAdded && <span className="text-yellow-600 font-bold">🆕</span>}
                          {isAnalytics && <span className="text-blue-600">📊</span>}
                          {isGTM && <span className="text-green-600">🏷️</span>}
                          {isTaskilo && <span className="text-purple-600">🍪</span>}
                          <span>{cookie}</span>
                        </div>
                      </li>
                    );
                  })}
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

        {/* Cookie History */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Cookie History ({cookieHistory.length} entries)
          </h2>
          <div className="max-h-64 overflow-y-auto">
            {cookieHistory.length === 0 ? (
              <p className="text-gray-500 italic">No cookie history yet</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {cookieHistory
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <li key={index} className="border-l-4 border-blue-400 pl-3 py-2">
                      <div className="font-semibold text-blue-700 text-xs mb-1">
                        {entry.timestamp} ({entry.cookies.length} cookies)
                      </div>
                      <div className="space-y-1">
                        {entry.cookies.map((cookie, cookieIndex) => (
                          <div
                            key={cookieIndex}
                            className="font-mono text-xs bg-blue-50 p-1 rounded"
                          >
                            {cookie}
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
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

        {/* Console Logs */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            GTM Console Logs ({consoleLogs.length})
          </h2>
          <div className="max-h-64 overflow-y-auto">
            {consoleLogs.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {consoleLogs.map((log, index) => (
                  <li
                    key={index}
                    className="font-mono text-xs bg-green-50 p-2 rounded text-green-700 border-l-4 border-green-400"
                  >
                    {log}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 italic space-y-2">
                <p>No GTM logs captured yet.</p>
                <p className="text-sm">
                  <strong>Tips:</strong>
                  <br />• Reload the page to capture initialization logs
                  <br />• Click &quot;🔄 Refresh GTM Logs&quot; to update
                  <br />• Use &quot;🚀 Force Consent Update&quot; to test
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
