'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Search, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { z } from 'zod';

// Zod-Validierung für Domain-Suche
const domainSearchSchema = z.string()
  .min(1, 'Domainname erforderlich')
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
    'Ungültiger Domainname (nur Buchstaben, Zahlen, Bindestriche)'
  );

interface DomainSearchResult {
  domain: string;
  available: boolean;
  price?: number;
  tld: string;
}

function DomainSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DomainSearchResult[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Beliebte TLDs für die Suche
  const popularTLDs = ['.de', '.com', '.net', '.org', '.eu'];

  const searchDomains = async () => {
    setSearchError(null);
    setSearchResults([]);
    
    // Validierung
    const validation = domainSearchSchema.safeParse(searchTerm.toLowerCase().trim());
    if (!validation.success) {
      setSearchError(validation.error.errors[0].message);
      return;
    }

    setIsSearching(true);

    try {
      const results: DomainSearchResult[] = [];

      for (const tld of popularTLDs) {
        const domain = `${validation.data}${tld}`;
        
        // MongoDB-Check über unsere API
        const response = await fetch('/api/webmail/validate-domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain }),
        });

        if (response.ok) {
          const result = await response.json();
          
          results.push({
            domain,
            available: !result.exists,
            tld,
            price: tld === '.de' ? 9.99 : tld === '.com' ? 12.99 : 8.99,
          });
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Domain search error:', error);
      setSearchError('Fehler bei der Domain-Suche. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleContinue = () => {
    if (!selectedDomain) return;
    
    setIsLoading(true);
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domain: selectedDomain,
      isNew: 'true',
    });
    
    // Weiter zum Domain-Kauf/Checkout
    router.push(`/webmail/register/business/checkout?${params.toString()}`);
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
        <div className="w-full max-w-2xl">
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
            Domain suchen und registrieren
          </h1>
          
          <p className="text-[15px] text-gray-700 leading-relaxed mb-8">
            Geben Sie den gewünschten Domainnamen ein und wir prüfen die Verfügbarkeit für beliebte Endungen.
          </p>

          {/* Search Box */}
          <div className="mb-8">
            {/* Search Input */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      searchDomains();
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all"
                  placeholder="meine-firma"
                />
              </div>
              <button
                onClick={searchDomains}
                disabled={!searchTerm.trim() || isSearching}
                className={cn(
                  "px-6 py-3 rounded font-medium transition-all flex items-center gap-2",
                  searchTerm.trim() && !isSearching
                    ? "bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <><Search className="w-5 h-5" /> Suchen</>
                )}
              </button>
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded mb-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{searchError}</p>
              </div>
            )}

            {/* Suggestion */}
            <p className="text-xs text-[#5f6368]">
              Beispiel: meine-firma, beispiel, ihr-unternehmen (ohne .de/.com)
            </p>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Verfügbare Domains
              </h2>

              <div className="space-y-3">
                {searchResults.map((result) => (
                  <button
                    key={result.domain}
                    onClick={() => result.available && setSelectedDomain(result.domain)}
                    disabled={!result.available}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-lg border transition-all",
                      result.available && selectedDomain === result.domain
                        ? "border-[#1a73e8] bg-blue-50/50 ring-1 ring-[#1a73e8]"
                        : result.available
                        ? "border-gray-300 hover:border-gray-400 bg-white"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        result.available && selectedDomain === result.domain
                          ? "border-[#1a73e8]"
                          : result.available
                          ? "border-gray-400"
                          : "border-gray-300"
                      )}>
                        {result.available && selectedDomain === result.domain && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "font-medium text-base",
                          result.available ? "text-gray-900" : "text-gray-400"
                        )}>
                          {result.domain}
                        </p>
                        <p className="text-sm text-[#5f6368]">
                          {result.available ? 'Verfügbar' : 'Bereits vergeben'}
                        </p>
                      </div>
                    </div>
                    {result.available && result.price && (
                      <div className="text-right">
                        <p className="font-semibold text-base text-gray-900">
                          {result.price.toFixed(2)} €
                        </p>
                        <p className="text-xs text-[#5f6368]">pro Jahr</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          {selectedDomain && (
            <div className="flex justify-start mt-10">
              <button
                onClick={handleContinue}
                disabled={isLoading}
                className="px-8 py-3.5 rounded-full font-medium bg-[#14ad9f] text-white hover:bg-teal-700 shadow-md hover:shadow-lg transition-all text-[15px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird geladen...
                  </span>
                ) : (
                  `Mit ${selectedDomain} fortfahren`
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DomainSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    }>
      <DomainSearchContent />
    </Suspense>
  );
}
