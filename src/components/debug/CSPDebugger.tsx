'use client';

import { useEffect, useState } from 'react';

interface CSPViolation {
  blockedURI: string;
  violatedDirective: string;
  originalPolicy: string;
  timestamp: string;
}

export default function CSPDebugger() {
  const [violations, setViolations] = useState<CSPViolation[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Nur in Development anzeigen
    if (process.env.NODE_ENV !== 'development') return;

    // CSP Violation Event Listener
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      const violation: CSPViolation = {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
        timestamp: new Date().toISOString(),
      };

      setViolations(prev => [violation, ...prev].slice(0, 20)); // Keep last 20 violations

      console.group('🚨 CSP Violation Detected');

      console.groupEnd();
    };

    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Shortcut zum Toggle (Ctrl+Shift+C)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Floating Debug Toggle Button */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-4 left-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg z-50 text-xs"
          title="CSP Debug (Ctrl+Shift+C)"
        >
          🛡️ CSP
        </button>
      )}

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed bottom-4 right-4 bg-red-900 text-white p-4 rounded-lg shadow-lg max-w-md max-h-80 overflow-y-auto z-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold">CSP Violations ({violations.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViolations([])}
                className="text-xs bg-red-700 px-2 py-1 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-xs bg-red-700 px-2 py-1 rounded"
              >
                Hide (Ctrl+Shift+C)
              </button>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {violations.length === 0 ? (
              <p className="text-green-300">No violations detected</p>
            ) : (
              violations.map((violation, index) => (
                <div key={index} className="border-l-2 border-red-500 pl-2 py-1">
                  <div className="font-mono text-yellow-300">{violation.blockedURI}</div>
                  <div className="text-red-300">Violated: {violation.violatedDirective}</div>
                  <div className="text-gray-400">
                    {new Date(violation.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-red-700">
            <p className="text-xs text-gray-300">Press Ctrl+Shift+C to toggle</p>
          </div>
        </div>
      )}
    </>
  );
}
