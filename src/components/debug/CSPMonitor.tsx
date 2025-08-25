/**
 * CSP Monitoring und Debugging Tool für Taskilo
 * Hilft dabei CSP-Violations zu erkennen und zu beheben
 */
'use client';

import { useState, useEffect } from 'react';

interface CSPViolation {
  'blocked-uri': string;
  'document-uri': string;
  'effective-directive': string;
  'original-policy': string;
  referrer: string;
  'status-code': number;
  'violated-directive': string;
  timestamp: number;
}

export default function CSPMonitor() {
  const [violations, setViolations] = useState<CSPViolation[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // CSP Violation Event Listener
    const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
      const violation: CSPViolation = {
        'blocked-uri': event.blockedURI,
        'document-uri': event.documentURI,
        'effective-directive': event.effectiveDirective,
        'original-policy': event.originalPolicy,
        referrer: event.referrer,
        'status-code': event.statusCode,
        'violated-directive': event.violatedDirective,
        timestamp: Date.now(),
      };

      setViolations(prev => [violation, ...prev.slice(0, 49)]); // Keep last 50

      // Log für Development
      if (process.env.NODE_ENV === 'development') {

      }
    };

    // Event Listener registrieren
    document.addEventListener('securitypolicyviolation', handleCSPViolation);

    // Debug-Hotkey (Ctrl+Shift+C)
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

  const clearViolations = () => {
    setViolations([]);
  };

  const copyToClipboard = async () => {
    const violationData = JSON.stringify(violations, null, 2);
    try {
      await navigator.clipboard.writeText(violationData);
      alert('CSP Violations in Zwischenablage kopiert!');
    } catch (err) {

    }
  };

  if (!isVisible && violations.length === 0) return null;

  return (
    <>
      {/* Toggle Button */}
      {violations.length > 0 && !isVisible && (
        <div
          className="fixed bottom-4 right-4 z-50 bg-red-500 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-red-600 transition-colors"
          onClick={() => setIsVisible(true)}
          title="CSP Violations gefunden - Klicken zum Anzeigen"
        >
          🚨 {violations.length}
        </div>
      )}

      {/* Debug Panel */}
      {isVisible && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-red-500 text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">CSP Violations Monitor (Ctrl+Shift+C)</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                  disabled={violations.length === 0}
                >
                  Kopieren
                </button>
                <button
                  onClick={clearViolations}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                  disabled={violations.length === 0}
                >
                  Löschen
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 max-h-[60vh] overflow-auto">
              {violations.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p>Keine CSP Violations erkannt!</p>
                  <p className="text-sm mt-2">
                    Das bedeutet, dass alle externen Ressourcen korrekt konfiguriert sind.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <h3 className="font-semibold text-red-800 mb-2">
                      🚨 {violations.length} CSP Violation(s) erkannt
                    </h3>
                    <p className="text-sm text-red-700">
                      Diese Violations deuten auf blockierte Ressourcen hin. Überprüfe die
                      CSP-Konfiguration in next.config.mjs.
                    </p>
                  </div>

                  {violations.map((violation, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-semibold text-red-600">Blockiert:</span>
                          <div className="font-mono text-xs bg-white p-1 rounded mt-1 break-all">
                            {violation['blocked-uri']}
                          </div>
                        </div>
                        <div>
                          <span className="font-semibold text-blue-600">Directive:</span>
                          <div className="font-mono text-xs bg-white p-1 rounded mt-1">
                            {violation['violated-directive']}
                          </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <span className="font-semibold text-gray-600">Zeit:</span>
                          <span className="ml-2 text-xs">
                            {new Date(violation.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t">
              <div className="text-xs text-gray-500">
                <p>
                  <strong>Tipp:</strong> Nutze Ctrl+Shift+C um dieses Panel zu öffnen/schließen
                </p>
                <p>
                  <strong>Debug:</strong> Violations werden auch in der Browser-Konsole geloggt
                </p>
                <p>
                  <strong>Fix:</strong> Füge blockierte Domains zur CSP-Konfiguration in
                  next.config.mjs hinzu
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
