'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FiCheckCircle, FiArrowRight, FiUser, FiSettings, FiCreditCard } from 'react-icons/fi';

export default function UserOnboardingWelcome() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && user && user.uid !== uid) {
      router.push(`/dashboard/user/${user.uid}`);
      return;
    }
  }, [user, loading, uid, router]);

  const handleContinue = () => {
    router.push(`/dashboard/user/${uid}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 flex justify-center items-center">
        <div className="text-white text-xl">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
              <FiCheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Willkommen bei Taskilo! 🎉</h1>
            <p className="text-xl text-white/90 mb-2">Ihr Konto wurde erfolgreich erstellt.</p>
            <p className="text-lg text-white/80">
              Sie können jetzt Services buchen und Projekte erstellen.
            </p>
          </div>

          {/* Features Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg mb-4">
                <FiUser className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Services buchen</h3>
              <p className="text-white/80 text-sm">
                Finden Sie lokale Dienstleister und Freelancer für Ihre Projekte.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg mb-4">
                <FiSettings className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Projekte verwalten</h3>
              <p className="text-white/80 text-sm">
                Erstellen Sie detaillierte Projektanfragen und erhalten Sie Angebote.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg mb-4">
                <FiCreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sichere Zahlungen</h3>
              <p className="text-white/80 text-sm">
                Bezahlen Sie sicher und transparent nur für erbrachte Leistungen.
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Ihre nächsten Schritte
            </h2>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-white/10 rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  1
                </div>
                <div className="flex-grow">
                  <h3 className="text-white font-semibold">Profil vervollständigen</h3>
                  <p className="text-white/80 text-sm">
                    Fügen Sie ein Profilbild und weitere Informationen hinzu
                  </p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-white/10 rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  2
                </div>
                <div className="flex-grow">
                  <h3 className="text-white font-semibold">Erste Service-Buchung</h3>
                  <p className="text-white/80 text-sm">
                    Durchstöbern Sie unsere Kategorien und buchen Sie Ihren ersten Service
                  </p>
                </div>
              </div>

              <div className="flex items-center p-4 bg-white/10 rounded-lg">
                <div className="shrink-0 w-8 h-8 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4">
                  3
                </div>
                <div className="flex-grow">
                  <h3 className="text-white font-semibold">Projekt erstellen</h3>
                  <p className="text-white/80 text-sm">
                    Erstellen Sie detaillierte Projektanfragen für größere Aufträge
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              className="inline-flex items-center px-8 py-4 bg-white text-[#14ad9f] font-semibold rounded-xl hover:bg-gray-50 transition-colors duration-200 text-lg"
            >
              Zum Dashboard
              <FiArrowRight className="ml-2 w-5 h-5" />
            </button>
          </div>

          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-white/70 text-sm">
              Haben Sie Fragen? Besuchen Sie unser{' '}
              <a href="/help" className="underline hover:text-white">
                Hilfe-Center
              </a>{' '}
              oder kontaktieren Sie unseren{' '}
              <a href="/support" className="underline hover:text-white">
                Support
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
