'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Standard-Regionen für das Dropdown
const defaultRegions = [
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Belgien',
  'Frankreich',
  'Italien',
  'Luxemburg',
  'Niederlande',
  'Polen',
  'Spanien',
  'Vereinigtes Königreich',
  'Vereinigte Staaten',
];

function BusinessRegistrationContent() {
  const router = useRouter();
  
  const [companyName, setCompanyName] = useState('');
  const [employeeCount, setEmployeeCount] = useState<string>('');
  const [region, setRegion] = useState('');
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRegion, setIsLoadingRegion] = useState(true);

  // Region aus IP-Adresse ermitteln
  useEffect(() => {
    const detectRegion = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          // Ländername direkt von der API nutzen
          const countryName = data.country_name || 'Deutschland';
          setRegion(countryName);
          setDetectedCountry(countryName);
        } else {
          setRegion('Deutschland');
        }
      } catch {
        setRegion('Deutschland');
      } finally {
        setIsLoadingRegion(false);
      }
    };
    
    detectRegion();
  }, []);

  // Regionen-Liste mit erkanntem Land kombinieren
  const regionOptions = React.useMemo(() => {
    const regions = [...defaultRegions];
    // Erkanntes Land hinzufügen wenn nicht in der Liste
    if (detectedCountry && !regions.includes(detectedCountry)) {
      regions.unshift(detectedCountry);
    }
    return regions.sort((a, b) => a.localeCompare(b, 'de'));
  }, [detectedCountry]);

  const employeeOptions = [
    { value: '1', label: 'Nur ich' },
    { value: '2-9', label: '2-9' },
    { value: '10-99', label: '10-99' },
    { value: '100-299', label: '100-299' },
    { value: '300+', label: '300 und mehr' },
  ];

  const handleContinue = () => {
    if (!companyName || !employeeCount) return;
    
    setIsLoading(true);
    // Weiter zum nächsten Schritt - Kontaktdaten eingeben
    router.push(`/webmail/register/business/contact?company=${encodeURIComponent(companyName)}&employees=${employeeCount}&region=${encodeURIComponent(region)}`);
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
            onClick={() => router.push('/webmail/add-account')}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title - Google Workspace Stil */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-8 leading-tight">
            Los geht&apos;s
          </h1>

          {/* Company Name Input */}
          <div className="mb-6">
            <label htmlFor="companyName" className="block text-sm text-[#5f6368] mb-2">
              Name des Unternehmens
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all"
              id="companyName"
            />
          </div>

          {/* Employee Count */}
          <div className="mb-6">
            <p className="text-sm text-[#5f6368] mb-3">
              Anzahl der Mitarbeiter, einschließlich Sie selbst
            </p>
            <div className="space-y-2">
              {employeeOptions.map((option) => (
                <label 
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer group py-1"
                  onClick={() => setEmployeeCount(option.value)}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    employeeCount === option.value 
                      ? "border-[#1a73e8]" 
                      : "border-gray-400"
                  )}>
                    {employeeCount === option.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                    )}
                  </div>
                  <span className="text-[15px] text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

            {/* Region Select */}
            <div className="mb-8">
              <label htmlFor="region" className="block text-sm text-[#5f6368] mb-2">
                Region
              </label>
              {isLoadingRegion ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-gray-400 text-sm">Region wird erkannt...</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent appearance-none bg-white cursor-pointer"
                    id="region"
                  >
                    {regionOptions.map((regionOption) => (
                      <option key={regionOption} value={regionOption}>
                        {regionOption}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Continue Button - Google Workspace Stil */}
            <div className="flex justify-start">
              <button
                onClick={handleContinue}
                disabled={!companyName || !employeeCount || isLoading}
                className={cn(
                  "px-6 py-2.5 rounded font-medium transition-all text-sm",
                  companyName && employeeCount
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

export default function BusinessRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    }>
      <BusinessRegistrationContent />
    </Suspense>
  );
}
