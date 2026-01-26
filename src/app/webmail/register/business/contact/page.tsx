'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

function ContactFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigem Schritt
  const company = searchParams.get('company') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || 'Deutschland';
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailHelp, setShowEmailHelp] = useState(false);

  const isFormValid = firstName.trim() && lastName.trim() && currentEmail.trim() && currentEmail.includes('@');

  const handleContinue = () => {
    if (!isFormValid) return;
    
    setIsLoading(true);
    // Weiter zum nächsten Schritt - Domain-Auswahl
    const params = new URLSearchParams({
      company,
      employees,
      region,
      firstName,
      lastName,
      email: currentEmail,
    });
    router.push(`/webmail/register/business/domain?${params.toString()}`);
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
            Kontaktdaten angeben
          </h1>
          
          <p className="text-[15px] text-gray-700 leading-relaxed mb-8 flex items-start gap-2">
            <span>Sie werden Administrator des Taskilo Workspace-Kontos, da Sie das Konto erstellen.</span>
            <button 
              onClick={() => setShowEmailHelp(!showEmailHelp)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </p>

          {/* Help Text */}
          {showEmailHelp && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p className="font-medium mb-1">Warum benötigen wir diese Daten?</p>
              <p className="text-blue-800">Als Administrator können Sie Nutzer verwalten, Einstellungen ändern und haben vollen Zugriff auf alle Funktionen Ihres Taskilo Workspace.</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-6 mb-8">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm text-[#5f6368] mb-2">
                Vorname
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all"
                id="firstName"
                autoComplete="given-name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm text-[#5f6368] mb-2">
                Nachname
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all"
                id="lastName"
                autoComplete="family-name"
              />
            </div>

            {/* Current Email */}
            <div>
              <label htmlFor="currentEmail" className="block text-sm text-[#5f6368] mb-2">
                Aktuelle E-Mail-Adresse
              </label>
              <input
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all"
                id="currentEmail"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Continue Button - Google Workspace Stil */}
          <div className="flex justify-start">
            <button
              onClick={handleContinue}
              disabled={!isFormValid || isLoading}
              className={cn(
                "px-6 py-2.5 rounded font-medium transition-all text-sm",
                isFormValid
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

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a73e8]" />
      </div>
    }>
      <ContactFormContent />
    </Suspense>
  );
}
