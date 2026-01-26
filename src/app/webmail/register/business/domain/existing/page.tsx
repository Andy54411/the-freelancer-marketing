'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { z } from 'zod';

// Zod-Validierung für Domain
const domainSchema = z.string()
  .min(1, 'Domain erforderlich')
  .regex(
    /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/,
    'Ungültige Domain (z.B. beispiel.de)'
  )
  .refine(
    (domain) => !domain.startsWith('www.'),
    'Bitte ohne www. eingeben (z.B. beispiel.de statt www.beispiel.de)'
  );

function ExistingDomainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  
  const [domain, setDomain] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Domain-Format validieren und auf Duplikate prüfen
  const validateDomain = async () => {
    setValidationError(null);
    setValidationSuccess(false);
    
    // Zod-Validierung
    const validation = domainSchema.safeParse(domain.toLowerCase().trim());
    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    setIsValidating(true);

    try {
      // MongoDB Duplikat-Check via Hetzner webmail-proxy
      const response = await fetch('/api/webmail/validate-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: validation.data }),
      });

      const result = await response.json();

      if (!response.ok) {
        setValidationError(result.error || 'Validierung fehlgeschlagen');
        return;
      }

      if (result.exists) {
        setValidationError(
          'Diese Domain ist bereits registriert. Bitte verwenden Sie eine andere Domain oder kontaktieren Sie den Support.'
        );
        return;
      }

      // Erfolgreich - Domain ist verfügbar
      setValidationSuccess(true);
    } catch (error) {
      console.error('Domain validation error:', error);
      setValidationError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (!validationSuccess) return;
    
    setIsLoading(true);
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domain: domain.toLowerCase().trim(),
    });
    
    // Weiter zur Verifizierung/DNS-Setup
    router.push(`/webmail/register/business/verify?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo */}
      <div className="flex justify-center pt-12 mb-8">
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

      {/* Main Content - Zentriert wie Google Workspace */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8">
        <div className="w-full max-w-xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title - Google Workspace Stil */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-4 leading-tight">
            Wie lautet der Domainname Ihres Unternehmens?
          </h1>
          
          <div className="mb-8">
            <p className="text-[15px] text-gray-700 leading-relaxed mb-2">
              Geben Sie den Domainnamen Ihres Unternehmens ein. Damit können Sie benutzerdefinierte E-Mail-Adressen erstellen, z. B. info@IhrUnternehmen.de.
            </p>
            <p className="text-[15px] text-gray-700 leading-relaxed">
              <span className="text-[#14ad9f] cursor-pointer hover:underline">Wir erklären Ihnen später Schritt für Schritt, wie Sie die Inhaberschaft für diese Domain bestätigen.</span>
            </p>
          </div>

          {/* Domain Input - Google Workspace Stil */}
          <div className="mb-6">
            <label htmlFor="domain" className="block text-sm text-[#5f6368] mb-2">
              Ihr Domainname
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setValidationError(null);
                setValidationSuccess(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && domain.trim()) {
                  validateDomain();
                }
              }}
              onBlur={() => {
                if (domain.trim()) {
                  validateDomain();
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent transition-all text-base"
              placeholder="beispiel.de"
              id="domain"
            />
            <p className="text-xs text-[#5f6368] mt-2">
              Beispiel: IhrUnternehmen.de
            </p>
          </div>

          {/* Validation Messages */}
          {validationError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    Domain nicht verfügbar
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {validationError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {validationSuccess && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Domain verfügbar
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Diese Domain kann für Ihr Taskilo Webmail-Konto verwendet werden.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validierung läuft */}
          {isValidating && (
            <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-900">
                  Domain wird geprüft...
                </p>
              </div>
            </div>
          )}

          {/* Continue Button - Google Workspace Stil */}
          <div className="flex justify-start">
            <button
              onClick={handleContinue}
              disabled={!validationSuccess || isLoading}
              className={cn(
                "px-6 py-2.5 rounded font-medium transition-all text-sm",
                validationSuccess
                  ? "bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-sm"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird geladen...
                </span>
              ) : (
                'Weiter'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ExistingDomainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    }>
      <ExistingDomainContent />
    </Suspense>
  );
}
