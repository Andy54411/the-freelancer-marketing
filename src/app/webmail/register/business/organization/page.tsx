'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function OrganizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Daten aus vorherigen Schritten
  const company = searchParams.get('company') || '';
  const domain = searchParams.get('domain') || '';
  const employees = searchParams.get('employees') || '';
  const region = searchParams.get('region') || '';
  const firstName = searchParams.get('firstName') || '';
  const lastName = searchParams.get('lastName') || '';
  const email = searchParams.get('email') || '';
  const username = searchParams.get('username') || '';
  const plan = searchParams.get('plan') || '';
  const amount = searchParams.get('amount') || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [formData, setFormData] = useState({
    organizationName: company,
    legalName: company,
    address: '',
    apartment: '',
    postalCode: '',
    city: '',
    country: region,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    // Validierung
    if (!formData.organizationName || !formData.legalName || !formData.address || !formData.postalCode || !formData.city) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsLoading(true);
    setShowModal(false);

    // Simuliere Speichern/Loading
    setTimeout(() => {
      const params = new URLSearchParams({
        company,
        domain,
        email,
        username,
        firstName,
        lastName,
        plan,
        amount,
        employees,
        region,
        organizationName: formData.organizationName,
        legalName: formData.legalName,
        address: formData.address,
        apartment: formData.apartment,
        postalCode: formData.postalCode,
        city: formData.city,
        country: formData.country,
      });
      
      router.push(`/webmail/register/business/add-user?${params.toString()}`);
    }, 2000);
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    // Loading State (wie Screenshot 4)
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Link href="/">
          <Image 
            src="/images/taskilo-logo-transparent.png" 
            alt="Taskilo" 
            width={180} 
            height={56}
            className="h-14 w-auto mb-8"
          />
        </Link>
        <Loader2 className="w-12 h-12 animate-spin text-[#14ad9f]" />
      </div>
    );
  }

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

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-6 pt-8">
        <div className="w-full max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-8 p-3 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Title */}
          <h1 className="text-[32px] font-normal text-gray-900 mb-8 text-center">
            Überprüfen und bezahlen
          </h1>

          {/* Cart Summary */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-8">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-4">
              EINKAUFSWAGEN
            </p>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Business Standard
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Der Rabatt von 50 % gilt bis zum 9. Mai 2026. Ab dem 10. Mai 2026 beträgt
                  der Preis wieder 16,80 $ () pro Monat für alle Nutzer. Für die ersten 14 Tage
                  (beschränkt auf 10 Nutzer) werden Ihnen keine Kosten in Rechnung gestellt.
                  Wenn Sie Kosten vermeiden möchten, können Sie das Abo einfach vor Ende...
                  Automatische monatliche Belastung
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {amount} € monatlich
                </p>
                <p className="text-xs text-gray-600">+ Steuer</p>
              </div>
            </div>
          </div>

          {/* Kontaktdaten Section */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Kontaktdaten
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-[#1a73e8] font-medium">
                Name und Adresse hinzufügen
              </span>
              <span className="text-2xl text-[#1a73e8]">+</span>
            </button>
          </div>

          {/* Zahlungsmethode Section */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Zahlungsmethode
            </h3>
            <button
              disabled
              className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-left"
            >
              <span className="text-gray-400 font-medium">
                Zahlungsmethode hinzufügen
              </span>
              <span className="text-2xl text-gray-400">+</span>
            </button>
            <p className="text-sm text-gray-600 mt-3">
              Fügen Sie Kontaktdaten hinzu, bevor Sie fortfahren
            </p>
          </div>

          {/* Hinweis und Button */}
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-6">
              Wenn Sie auf {'"'}Zustimmen und 14-tägige Testversion starten{'"'} klicken,
              stimmen Sie der{' '}
              <a href="#" className="text-[#1a73e8] hover:underline">
                Google Workspace Agreement
              </a>{' '}
              und{' '}
              <a href="#" className="text-[#1a73e8] hover:underline">
                Ergänzende Nutzungsbedingungen für den kostenlosen Testzeitraum von Google
                Workspace Agreement
              </a>{' '}
              zu.
            </p>
            <button
              disabled
              className="px-8 py-4 bg-gray-300 text-gray-500 rounded-full font-semibold cursor-not-allowed"
            >
              Zustimmen und 14-tägige Testversion starten
            </button>
          </div>
        </div>
      </main>

      {/* Modal für Kontaktdaten */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-6">
                Kontaktdaten
              </h2>

              <div className="space-y-5">
                {/* Name der Organisation */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Name der Organisation
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                    placeholder="Name der Organisation"
                  />
                </div>

                {/* Rechtsgültiger Name */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Rechtsgültiger Name
                  </label>
                  <input
                    type="text"
                    name="legalName"
                    value={formData.legalName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                    placeholder="Rechtsgültiger Name"
                  />
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Adresse
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                    placeholder="Straße und Hausnummer"
                  />
                </div>

                {/* Apt., Suite usw. (optional) */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Apt., Suite usw. (optional)
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                    placeholder="Zusätzliche Adressinformationen"
                  />
                </div>

                {/* Postleitzahl */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Postleitzahl
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                    placeholder="PLZ"
                  />
                </div>

                {/* Stadt */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Stadt
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#1a73e8] transition-colors"
                    placeholder="Stadt"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 text-[#14ad9f] font-medium hover:bg-teal-50 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-[#14ad9f] text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
      </div>
    }>
      <OrganizationContent />
    </Suspense>
  );
}
