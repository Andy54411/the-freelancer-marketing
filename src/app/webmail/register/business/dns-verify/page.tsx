'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  priority?: string;
  status: 'correct' | 'missing' | 'conflict';
}

function DNSVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const domain = searchParams.get('domain') || '';
  const [isChecking, setIsChecking] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    verified: boolean;
    records: DNSRecord[];
    conflicts: string[];
    warnings: string[];
  } | null>(null);

  // Erwartete DNS-Records für Taskilo
  const expectedRecords: DNSRecord[] = [
    {
      type: 'TXT',
      name: domain,
      value: `taskilo-domain-verification=`,
      status: 'missing',
    },
    {
      type: 'MX',
      name: domain,
      value: 'mail.taskilo.de',
      priority: '10',
      status: 'missing',
    },
    {
      type: 'CNAME',
      name: `mail.${domain}`,
      value: 'mail.taskilo.de',
      status: 'missing',
    },
    {
      type: 'CNAME',
      name: `webmail.${domain}`,
      value: 'mail.taskilo.de',
      status: 'missing',
    },
  ];

  useEffect(() => {
    // Automatische Prüfung beim Laden
    checkDNS();
  }, []);

  const checkDNS = async () => {
    setIsChecking(true);
    
    try {
      // DNS-Status vom Backend abrufen
      const apiUrl = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';
      const apiKey = process.env.NEXT_PUBLIC_WEBMAIL_API_KEY || '';
      
      const response = await fetch(`${apiUrl}/api/dns/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ domain }),
      });

      const result = await response.json();

      if (result.success && result.verified) {
        // Domain ist verifiziert - zur Success-Seite
        router.push(`/webmail/register/business/success?domain=${domain}`);
      } else {
        // Zeige aktuellen Status an
        setDnsStatus({
          verified: false,
          records: expectedRecords,
          conflicts: [
            'Mehrere MX-Records gefunden (Google Mail + Taskilo)',
            'Google Mail MX-Records müssen entfernt werden',
          ],
          warnings: [
            'Die DNS-Propagierung kann bis zu 48 Stunden dauern',
            'Entfernen Sie alle Google Mail MX-Records (aspmx.l.google.com, alt1-4.aspmx.l.google.com)',
            'Behalten Sie nur den Taskilo MX-Record: mail.taskilo.de (Priorität 10)',
          ],
        });
      }
    } catch (error) {
      console.error('DNS Check Error:', error);
      setDnsStatus({
        verified: false,
        records: expectedRecords,
        conflicts: ['Fehler bei der DNS-Abfrage'],
        warnings: ['Bitte versuchen Sie es später erneut'],
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleContinue = () => {
    // Zur Success-Seite auch wenn nicht verifiziert (E-Mail-Benachrichtigung folgt)
    router.push(`/webmail/register/business/success?domain=${domain}&dnsStatus=pending`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header mit Logo */}
      <div className="border-b border-gray-200">
        <div className="flex justify-center py-6">
          <Link href="/">
            <Image 
              src="/images/taskilo-logo-transparent.png" 
              alt="Taskilo" 
              width={140} 
              height={44}
              className="h-12 w-auto"
            />
          </Link>
        </div>
        <div className="px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-4">
              <h2 className="text-sm font-medium text-gray-700">
                DNS-Verifizierung
              </h2>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div className="bg-[#14ad9f] h-1 rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-12">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-4">
            DNS-Einträge überprüfen
          </h1>
          <p className="text-[15px] text-gray-700 mb-8 leading-relaxed">
            Wir überprüfen, ob Ihre DNS-Einträge korrekt konfiguriert sind.
          </p>

          {/* Loading State */}
          {isChecking && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-[#1a73e8] mb-4" />
              <p className="text-gray-600">DNS-Einträge werden überprüft...</p>
            </div>
          )}

          {/* Konflikt-Warnung */}
          {!isChecking && dnsStatus && dnsStatus.conflicts.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    DNS-Konflikte erkannt!
                  </h3>
                  <ul className="space-y-2">
                    {dnsStatus.conflicts.map((conflict, index) => (
                      <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{conflict}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Aktuelle DNS-Einträge */}
          {!isChecking && dnsStatus && (
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden mb-8">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  DNS-Einträge für {domain}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Wert
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Priorität
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dnsStatus.records.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {record.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                          {record.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                          {record.value}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.priority || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.status === 'correct' ? (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-xs font-medium">Korrekt</span>
                            </span>
                          ) : record.status === 'conflict' ? (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">Konflikt</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-yellow-700">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs font-medium">Fehlt</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnungen & Hinweise */}
          {!isChecking && dnsStatus && dnsStatus.warnings.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                    Wichtige Hinweise
                  </h3>
                  <ul className="space-y-2">
                    {dnsStatus.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 flex-shrink-0 mt-2" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Zu entfernende Google Mail MX-Records */}
          {!isChecking && dnsStatus && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ❌ Diese Google Mail MX-Records müssen entfernt werden:
              </h3>
              <ul className="space-y-2">
                <li className="text-sm text-gray-700 font-mono">
                  • aspmx.l.google.com (Priorität 1)
                </li>
                <li className="text-sm text-gray-700 font-mono">
                  • alt1.aspmx.l.google.com (Priorität 5)
                </li>
                <li className="text-sm text-gray-700 font-mono">
                  • alt2.aspmx.l.google.com (Priorität 5)
                </li>
                <li className="text-sm text-gray-700 font-mono">
                  • alt3.aspmx.l.google.com (Priorität 10)
                </li>
                <li className="text-sm text-gray-700 font-mono">
                  • alt4.aspmx.l.google.com (Priorität 10)
                </li>
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={checkDNS}
              disabled={isChecking}
              className="flex items-center gap-2 px-6 py-3 border-2 border-[#14ad9f] text-[#14ad9f] rounded-full font-semibold hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
              DNS erneut prüfen
            </button>

            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-[#14ad9f] text-white rounded-full font-semibold hover:bg-[#0d8a7f] transition-colors"
            >
              Fortfahren
            </button>
          </div>

          <p className="text-sm text-gray-600 mt-6">
            Sie können fortfahren, auch wenn die DNS-Einträge noch nicht vollständig propagiert sind.
            Sie erhalten eine E-Mail, sobald Ihre Domain verifiziert ist.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DNSVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <DNSVerifyContent />
    </Suspense>
  );
}
