'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function AddUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const domain = searchParams.get('domain') || '';
  const plan = searchParams.get('plan') || '';
  const amount = searchParams.get('amount') || '';
  const company = searchParams.get('company') || '';
  const email = searchParams.get('email') || '';
  const username = searchParams.get('username') || '';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || '';
  const organizationName = searchParams.get('organizationName') || '';
  const legalName = searchParams.get('legalName') || '';
  const address = searchParams.get('address') || '';
  const apartment = searchParams.get('apartment') || '';
  const postalCode = searchParams.get('postalCode') || '';
  const city = searchParams.get('city') || '';
  const country = searchParams.get('country') || '';
  
  const [formData, setFormData] = useState({
    firstName: firstName,
    lastName: lastName,
    username: username,
    recoveryEmail: email,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddUser = () => {
    // Validierung
    if (!formData.firstName || !formData.lastName || !formData.username || !formData.recoveryEmail) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsLoading(true);

    // Weiterleitung zur Domain Setup Page
    const params = new URLSearchParams({
      company,
      domain,
      email,
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      recoveryEmail: formData.recoveryEmail,
      plan,
      amount,
      employees,
      region,
      organizationName,
      legalName,
      address,
      apartment,
      postalCode,
      city,
      country,
    });
    
    router.push(`/webmail/register/business/verify-domain?${params.toString()}`);
  };

  const handleSkip = () => {
    const params = new URLSearchParams({
      company,
      domain,
      email,
      username,
      firstName,
      lastName,
      recoveryEmail: formData.recoveryEmail || email,
      plan,
      amount,
      employees,
      region,
      organizationName,
      legalName,
      address,
      apartment,
      postalCode,
      city,
      country,
    });
    
    router.push(`/webmail/register/business/verify-domain?${params.toString()}`);
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
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-12">
        <div className="w-full max-w-2xl">
          {/* Title */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-3">
            {domain} Nutzer hinzufügen
          </h1>
          <p className="text-[15px] text-gray-700 mb-8 leading-relaxed">
            Jeder weitere Nutzer erhöht den Speicherplatz in Ihrem Workspace. Sie
            können mühelos mit Nutzern in Gmail, Drive, Docs und anderen Tools
            zusammenarbeiten.
          </p>

          {/* Form */}
          <div className="space-y-6 mb-8">
            {/* Vorname und Nachname */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Vorname*"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Nachname*"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                />
              </div>
            </div>

            {/* Nutzername */}
            <div>
              <div className="flex items-center gap-0">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Nutzername*"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-l-lg border-r-0 focus:outline-none focus:border-[#1a73e8] focus:border-r-2 transition-colors"
                />
                <div className="px-4 py-3 border-2 border-gray-300 rounded-r-lg border-l-0 bg-gray-50 text-gray-700">
                  @{domain}
                </div>
              </div>
            </div>

            {/* E-Mail-Adresse für Anleitung */}
            <div>
              <input
                type="email"
                name="recoveryEmail"
                value={formData.recoveryEmail}
                onChange={handleInputChange}
                placeholder="E-Mail-Adresse für die Anleitung zur Anmeldung"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
              />
              <p className="text-sm text-gray-600 mt-2">
                Anleitung für die erste Anmeldung wird an diese E-Mail-Adresse und an Sie gesendet
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800">
              Neue Nutzer können auf ihr Konto zugreifen, sobald Sie Ihre Domain
              bestätigt haben
            </p>
          </div>

          {/* Preis Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-8 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Gibt vorhandene Rabatte an. Nach dem Testzeitraum fallen Kosten an.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-gray-900">
                {amount} €
              </span>
              <span className="text-sm text-gray-600">pro Monat</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleAddUser}
              disabled={!formData.firstName || !formData.lastName || !formData.username || !formData.recoveryEmail || isLoading}
              className="w-full max-w-md px-8 py-4 bg-[#14ad9f] text-white rounded-full font-semibold transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed hover:enabled:bg-teal-700"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird verarbeitet...
                </span>
              ) : (
                'Nutzer hinzufügen'
              )}
            </button>

            <button
              onClick={handleSkip}
              className="text-[#14ad9f] font-medium hover:underline"
            >
              Überspringen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AddUserPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <AddUserContent />
    </Suspense>
  );
}
