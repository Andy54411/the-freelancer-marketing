'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Search, Globe, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

function DomainSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  
  const [selectedOption, setSelectedOption] = useState<'new' | 'existing' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!selectedOption) return;
    
    setIsLoading(true);
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email,
      domainOption: selectedOption,
    });
    
    if (selectedOption === 'new') {
      // Zur Domain-Suche Seite
      router.push(`/webmail/register/business/domain/search?${params.toString()}`);
    } else {
      // Zur bestehenden Domain Verifizierung
      router.push(`/webmail/register/business/domain/existing?${params.toString()}`);
    }
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
            Wie möchten Sie Ihr Konto einrichten?
          </h1>
          
          <p className="text-[15px] text-gray-700 leading-relaxed mb-8">
            Sie benötigen eine <span className="underline decoration-dotted cursor-help" title="z.B. beispiel.de">Domain</span> wie beispiel.de, um den E-Mail-Dienst und ein Taskilo Workspace-Konto für Ihr Unternehmen einzurichten.
          </p>

          {/* Options */}
          <div className="space-y-4 mb-8">
            {/* Option 1: New Domain */}
            <button
              onClick={() => setSelectedOption('new')}
              className={cn(
                "w-full text-left p-6 rounded-lg border transition-all duration-200",
                selectedOption === 'new'
                  ? "border-[#1a73e8] bg-blue-50/50 ring-1 ring-[#1a73e8]"
                  : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  selectedOption === 'new'
                    ? "border-[#1a73e8]"
                    : "border-gray-400"
                )}>
                  {selectedOption === 'new' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Neue benutzerdefinierte Domain erhalten
                  </h3>
                  <p className="text-sm text-gray-600">
                    Neue Domain kaufen und online Ihre Marke aufbauen
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Existing Domain */}
            <button
              onClick={() => setSelectedOption('existing')}
              className={cn(
                "w-full text-left p-6 rounded-lg border transition-all duration-200",
                selectedOption === 'existing'
                  ? "border-[#1a73e8] bg-blue-50/50 ring-1 ring-[#1a73e8]"
                  : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  selectedOption === 'existing'
                    ? "border-[#1a73e8]"
                    : "border-gray-400"
                )}>
                  {selectedOption === 'existing' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Mit bestehender Domain einrichten
                  </h3>
                  <p className="text-sm text-gray-600">
                    Bereits vorhandene Domain verwenden
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Continue Button - Google Workspace Stil */}
          <div className="flex justify-start">
            <button
              onClick={handleContinue}
              disabled={!selectedOption || isLoading}
              className={cn(
                "px-6 py-2.5 rounded font-medium transition-all text-sm",
                selectedOption
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
                'Mit dieser Methode fortfahren'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DomainPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    }>
      <DomainSelectionContent />
    </Suspense>
  );
}
