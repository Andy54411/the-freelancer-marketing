'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { HeroHeader } from '@/components/hero8-header';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAnalyticsContext } from '@/contexts/AnalyticsContext';

interface CompanyLogo {
  id: string;
  name: string;
  profilePictureURL: string;
}

export default function HeroSection() {
  const [newCompanies, setNewCompanies] = useState<CompanyLogo[]>([]);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null); // Hinzufügen für Fehlerbehandlung
  const { trackEvent, trackNavigation } = useAnalyticsContext();
  const router = useRouter();

  const handleSearchClick = () => {
    trackEvent('hero_cta_click', 'user_engagement', 'search_help');
    trackNavigation('order_creation', 'hero_section');
  };

  const handleProviderClick = () => {
    trackEvent('hero_cta_click', 'user_engagement', 'become_provider');
    trackNavigation('provider_registration', 'hero_section');
    // Navigiere zur Anbieter-Registrierung mit Next.js Router
    router.push('/register/company');
  };

  useEffect(() => {
    const fetchNewCompanies = async () => {
      try {
        // HINZUGEFÜGT: Sicherheitsprüfung, um sicherzustellen, dass die DB-Instanz initialisiert ist.
        // Dies verhindert den Absturz, falls die Komponente rendert, bevor Firebase bereit ist.
        if (!db) {
          setError('Fehler: Datenbankverbindung konnte nicht hergestellt werden.');
          setLoading(false);
          return;
        }

        // Timeout für bessere Performance - falls Firestore langsam ist
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        const queryPromise = (async () => {
          const companiesRef = collection(db, 'companies');
          // Einfache Abfrage ohne orderBy (vermeidet Index-Probleme)
          const q = query(companiesRef, limit(20));
          const querySnapshot = await getDocs(q);

          const companies: CompanyLogo[] = [];
          querySnapshot.forEach(doc => {
            const data = doc.data();
            // Nur Firmen mit echtem Profilbild und Namen hinzufügen
            if (data.companyName && data.profilePictureURL && data.profilePictureURL.trim() !== '') {
              companies.push({
                id: doc.id,
                name: data.companyName,
                profilePictureURL: data.profilePictureURL,
              });
            }
          });
          return companies;
        })();

        const companies = await Promise.race([queryPromise, timeoutPromise]);

        // Begrenze auf maximal 10 Firmen für bessere Performance
        const limitedCompanies = Array.isArray(companies) ? companies.slice(0, 10) : [];

        // Nur echte Firmen mit Logos anzeigen
        setNewCompanies(limitedCompanies);
      } catch (err) {
        // Bei Fehlern - leere Liste (keine Mock-Daten)
        console.error('Fehler beim Laden der Anbieter:', err);
        setNewCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNewCompanies();
  }, []);

  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden">
        <section className="relative min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800">
          {/* Background Image with Teal Gradient Overlay */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop"
              alt="Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/95 via-teal-700/90 to-teal-900/95" />
          </div>
          <div className="relative z-10 pb-8 pt-20 sm:pb-12 sm:pt-24 md:pb-16 md:pt-28 lg:pb-20 lg:pt-28">
            <div className="relative mx-auto max-w-6xl px-6 flex flex-col-reverse items-center gap-8 sm:gap-10 lg:flex-row lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-2xl sm:text-3xl font-semibold leading-snug tracking-tight md:text-4xl xl:text-5xl text-white drop-shadow-lg"
                >
                  <span className="block">Die beste Plattform für</span>
                  <span className="block">lokale Dienstleistungen</span>
                  <span className="block">
                    finden Sie auf
                    <span className="text-[#14ad9f]"> Taskilo</span>
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mt-6 sm:mt-8 max-w-2xl text-pretty text-base sm:text-lg text-white/90 drop-shadow-md"
                >
                  Verbinden Sie sich mit vertrauenswürdigen Dienstleistern in Ihrer Nähe. Schnell,
                  sicher und zu fairen Preisen.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="mt-8 sm:mt-12 flex flex-row items-center justify-center gap-2 sm:gap-2 lg:justify-start"
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      asChild
                      size="lg"
                      className="px-3 sm:px-5 text-sm sm:text-base bg-[#14ad9f] text-white hover:bg-teal-700"
                      onClick={handleSearchClick}
                    >
                      <Link href="/auftrag/get-started">
                        <span className="text-nowrap">Hilfe suchen</span>
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      key={2}
                      size="lg"
                      variant="outline"
                      className="px-3 sm:px-5 text-sm sm:text-base border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                      onClick={handleProviderClick}
                    >
                      <span className="text-nowrap">Hilfe anbieten</span>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Bild im eigenen div */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                className="w-full max-w-xl lg:w-1/2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="h-auto w-full object-contain rounded-2xl shadow-2xl"
                  src="/images/AdobeStock_163577338.jpeg"
                  alt="Taskilo Hero"
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              </motion.div>
            </div>
          </div>
          
          {/* Neue Anbieter - anzeigen wenn mindestens 1 Firma mit Logo vorhanden ist */}
          {newCompanies.length >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="relative z-10 pb-8 md:pb-12"
            >
              <div className="group relative m-auto max-w-6xl px-6">
                <div className="flex flex-col items-center md:flex-row">
                  <div className="md:max-w-44 md:pr-6">
                    <p className="text-end text-sm font-medium text-white drop-shadow-lg">
                      Neue Anbieter
                    </p>
                  </div>
                  <div className="relative py-4 md:w-[calc(100%-11rem)]">
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      {newCompanies.map(company => {
                        let imageUrl = company.profilePictureURL;
                        if (!imageUrl.startsWith('http')) {
                          const decodedPath = decodeURIComponent(imageUrl);
                          imageUrl = `https://storage.googleapis.com/tilvo-f142f.firebasestorage.app/${decodedPath}`;
                        }

                        return (
                          <Link 
                            key={company.id} 
                            href={`/profile/${company.id}`}
                            className="block"
                          >
                            <motion.div 
                              className="flex items-center gap-3 px-5 py-3 bg-white rounded-full shadow-xl cursor-pointer"
                              whileHover={{ scale: 1.05, y: -2 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              <Image
                                className="h-10 w-10 rounded-full object-cover border-2 border-[#14ad9f]"
                                src={imageUrl}
                                alt={`${company.name} Logo`}
                                width={40}
                                height={40}
                                loading="lazy"
                                onError={e => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  const container = target.closest('.flex') as HTMLElement;
                                  if (container) {
                                    container.style.display = 'none';
                                  }
                                }}
                              />
                              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{company.name}</span>
                            </motion.div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </section>
      </main>
    </>
  );
}
