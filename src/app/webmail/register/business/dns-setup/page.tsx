'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Copy, Check, Info, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: string;
  priority?: string;
}

function DNSSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const domain = searchParams.get('domain') || '';
  const [selectedHost, setSelectedHost] = useState('');
  const [showHostSelect, setShowHostSelect] = useState(false);
  const [useOtherHost, setUseOtherHost] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // DNS-Records für Taskilo Webmail
  const verificationCode = `taskilo-domain-verification=${btoa(domain).substring(0, 32)}`;
  
  const dnsRecords: DNSRecord[] = [
    {
      type: 'TXT',
      name: '@',
      value: verificationCode,
      ttl: '3600',
    },
    {
      type: 'MX',
      name: '@',
      value: 'mail.taskilo.de',
      priority: '10',
      ttl: '3600',
    },
    {
      type: 'CNAME',
      name: 'webmail',
      value: 'mail.taskilo.de',
      ttl: '3600',
    },
    {
      type: 'CNAME',
      name: 'mail',
      value: 'mail.taskilo.de',
      ttl: '3600',
    },
  ];

  const dnsProviders = [
    'SiteGround',
    'GoDaddy',
    'Namecheap',
    'Cloudflare',
    'IONOS',
    'Strato',
    '1&1',
    'HostEurope',
    'ALL-INKL',
    'Hetzner',
  ];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      const company = searchParams.get('company') || '';
      const email = searchParams.get('recoveryEmail') || searchParams.get('email') || '';
      const username = searchParams.get('username') || '';
      const firstName = searchParams.get('firstName') || '';
      const lastName = searchParams.get('lastName') || '';
      const plan = searchParams.get('plan') || '';
      const amount = searchParams.get('amount') || '';
      const employees = searchParams.get('employees') || '';
      const region = searchParams.get('region') || '';
      const organizationName = searchParams.get('organizationName') || '';
      const legalName = searchParams.get('legalName') || '';
      const address = searchParams.get('address') || '';
      const apartment = searchParams.get('apartment') || '';
      const postalCode = searchParams.get('postalCode') || '';
      const city = searchParams.get('city') || '';
      const country = searchParams.get('country') || '';

      // DNS-Konfiguration im Backend speichern
      const dnsResponse = await fetch(`${process.env.NEXT_PUBLIC_WEBMAIL_API_URL}/api/dns/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WEBMAIL_API_KEY || '',
        },
        body: JSON.stringify({
          domain,
          userId: email,
          companyName: company,
          dnsRecords,
          selectedHost: selectedHost || 'Other',
          status: 'pending',
        }),
      });

      if (!dnsResponse.ok) {
        throw new Error('DNS-Konfiguration konnte nicht gespeichert werden');
      }

      // Zur Zahlung weiterleiten
      const response = await fetch('/api/webmail/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          domain,
          email,
          username,
          firstName,
          lastName,
          plan,
          amount: parseFloat(amount),
          currency: 'EUR',
          metadata: {
            employees,
            region,
            organizationName,
            legalName,
            address,
            apartment,
            postalCode,
            city,
            country,
            dnsConfigured: true,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Checkout-Erstellung fehlgeschlagen');
      }

      // Revolut Checkout URL öffnen
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Fehler beim Starten des Zahlungsvorgangs. Bitte versuchen Sie es erneut.');
      setIsVerifying(false);
    }
  };

  const handleHostSelect = (host: string) => {
    setSelectedHost(host);
    setShowHostSelect(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header mit Logo und Progress */}
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
                Domain-Einrichtung
              </h2>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div className="bg-[#1a73e8] h-1 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-12">
        <div className="w-full max-w-3xl">
          {/* Step 1: Host auswählen */}
          {!selectedHost && !useOtherHost ? (
            <>
              <h1 className="text-[32px] font-normal text-gray-900 mb-4">
                Bestätigen Sie, dass Sie der Inhaber von {domain} sind
              </h1>

              <p className="text-[15px] text-gray-700 mb-8 leading-relaxed">
                Ihre Organisation kann Google Workspace-Apps wie Gmail, Kalender, Drive,
                Meet, Chat und weitere Produkte verwenden, sobald Sie bestätigt haben, dass
                Sie der Inhaber von <span className="font-semibold">{domain}</span> sind
              </p>

              <p className="text-[15px] text-gray-900 font-medium mb-4">
                Wählen Sie Ihren Domainhost aus.
              </p>

              {/* Domain Provider Dropdown */}
              <div className="mb-6">
                <div className="relative">
                  <button
                    onClick={() => setShowHostSelect(!showHostSelect)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                  >
                    <span className="text-gray-900">
                      {selectedHost || 'Domainhost'}
                    </span>
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  </button>

                  {showHostSelect && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {dnsProviders.map((provider) => (
                        <button
                          key={provider}
                          onClick={() => handleHostSelect(provider)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          {provider}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="otherHost"
                    checked={useOtherHost}
                    onChange={(e) => setUseOtherHost(e.target.checked)}
                    className="w-4 h-4 text-[#1a73e8] border-gray-300 rounded focus:ring-[#1a73e8]"
                  />
                  <label htmlFor="otherHost" className="text-sm text-gray-700">
                    Meine Domain verwendet einen anderen Host
                  </label>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-800">
                  <p className="font-medium mb-1">
                    Halten Sie zuerst Ihre Konto-ID und das Passwort bereit, das Sie für die Anmeldung bei
                    Ihrem Domainhost brauchen. Sie wissen nicht, wer Ihr Domainhost ist?{' '}
                    <a href="https://support.google.com/a/answer/48323" className="text-[#1a73e8] hover:underline">
                      Domainhost identifizieren
                    </a>
                  </p>
                </div>
              </div>

              <button
                onClick={() => !selectedHost ? setUseOtherHost(true) : null}
                disabled={!selectedHost && !useOtherHost}
                className="px-8 py-4 bg-[#1a73e8] text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </>
          ) : (
            <>
              {/* Step 2: DNS-Records hinzufügen */}
              <h1 className="text-[32px] font-normal text-gray-900 mb-4">
                Bestätigungscode hinzufügen
              </h1>

              <p className="text-[15px] text-gray-700 mb-8 leading-relaxed">
                Kopieren Sie die folgenden Einträge und fügen Sie sie im DNS-Abschnitt der
                Website Ihres Domainhosts ein.
              </p>

              {/* TXT-Eintrag für Verifizierung */}
              <div className="mb-8">
                <button
                  className="flex items-center gap-2 text-[#1a73e8] font-medium mb-4"
                >
                  TXT-Eintrag
                  <ChevronDown className="w-5 h-5" />
                </button>

                <div className="space-y-4 bg-gray-50 rounded-xl p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value="@"
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900"
                      />
                      <button
                        onClick={() => handleCopy('@', 'txt-name')}
                        className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedField === 'txt-name' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Auf Standardwert setzen
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wert
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 font-mono text-sm"
                      />
                      <button
                        onClick={() => handleCopy(verificationCode, 'txt-value')}
                        className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copiedField === 'txt-value' ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TTL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value="3600"
                        readOnly
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Auf Standard- oder niedrigsten Wert setzen
                    </p>
                  </div>
                </div>
              </div>

              {/* MX & CNAME Records */}
              <div className="mb-8">
                <button className="flex items-center gap-2 text-[#1a73e8] font-medium mb-4">
                  E-Mail-Einträge (MX & CNAME)
                  <ChevronDown className="w-5 h-5" />
                </button>

                <div className="space-y-6">
                  {/* MX Record */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                      MX-Eintrag (E-Mail-Empfang)
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Name
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value="@"
                            readOnly
                            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleCopy('@', 'mx-name')}
                            className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {copiedField === 'mx-name' ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wert
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value="mail.taskilo.de"
                            readOnly
                            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleCopy('mail.taskilo.de', 'mx-value')}
                            className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {copiedField === 'mx-value' ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Priorität
                        </label>
                        <input
                          type="text"
                          value="10"
                          readOnly
                          className="w-24 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CNAME Records */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">
                      CNAME-Einträge (Webmail-Zugriff)
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          webmail.{domain} → mail.taskilo.de
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value="webmail"
                            readOnly
                            className="w-32 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                          />
                          <span className="text-gray-500">→</span>
                          <input
                            type="text"
                            value="mail.taskilo.de"
                            readOnly
                            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleCopy('webmail\tmail.taskilo.de', 'cname1')}
                            className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {copiedField === 'cname1' ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">
                          mail.{domain} → mail.taskilo.de
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value="mail"
                            readOnly
                            className="w-32 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                          />
                          <span className="text-gray-500">→</span>
                          <input
                            type="text"
                            value="mail.taskilo.de"
                            readOnly
                            className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg"
                          />
                          <button
                            onClick={() => handleCopy('mail\tmail.taskilo.de', 'cname2')}
                            className="p-3 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {copiedField === 'cname2' ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox und Button */}
              <div className="flex items-start gap-3 mb-6">
                <input
                  type="checkbox"
                  id="confirmDNS"
                  className="mt-1 w-4 h-4 text-[#1a73e8] border-gray-300 rounded focus:ring-[#1a73e8]"
                />
                <label htmlFor="confirmDNS" className="text-sm text-gray-700">
                  Kehren Sie hierher zurück und bestätigen Sie die Eingabe des Codes, wenn Sie den Code bei Ihrem Domainhost aktualisiert haben
                </label>
              </div>

              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="px-8 py-4 bg-[#1a73e8] text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Überprüfe DNS-Einträge...
                  </span>
                ) : (
                  'Bestätigen'
                )}
              </button>

              <p className="text-sm text-gray-600 mt-4">
                Die Überprüfung kann bis zu 48 Stunden dauern. Sie erhalten eine E-Mail, sobald Ihre Domain verifiziert ist.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DNSSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <DNSSetupContent />
    </Suspense>
  );
}
