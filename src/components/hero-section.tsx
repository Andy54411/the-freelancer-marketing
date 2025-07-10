'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { HeroHeader } from '@/components/hero8-header'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/clients'

interface CompanyLogo {
  id: string; // WICHTIG: Eindeutige ID für den React-Key
  name: string;
  profilePictureURL: string;
}

export default function HeroSection() {
  const [newCompanies, setNewCompanies] = useState<CompanyLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Hinzufügen für Fehlerbehandlung

  useEffect(() => {
    const fetchNewCompanies = async () => {
      try {
        // HINZUGEFÜGT: Sicherheitsprüfung, um sicherzustellen, dass die DB-Instanz initialisiert ist.
        // Dies verhindert den Absturz, falls die Komponente rendert, bevor Firebase bereit ist.
        if (!db) {
          setError("Fehler: Datenbankverbindung konnte nicht hergestellt werden.");
          setLoading(false);
          return;
        }
        const companiesRef = collection(db, 'companies');
        // Annahme: Ein 'createdAt' Feld vom Typ Timestamp existiert in den Firmendokumenten zur Sortierung.
        const q = query(companiesRef, orderBy('createdAt', 'desc'), limit(15));
        const querySnapshot = await getDocs(q);

        const companies: CompanyLogo[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Nur Firmen mit einem Logo und Namen hinzufügen
          // ERWEITERT: Akzeptiere auch Firmen ohne Profilbild und verwende ein Fallback
          if (data.companyName) {
            companies.push({
              id: doc.id,
              name: data.companyName,
              profilePictureURL: data.profilePictureURL || '/icon/default-company-logo.png', // Fallback für fehlende Bilder
            });
          }
        });

        // NEUE LOGIK: Client-seitige Bildvalidierung überspringen für SSR-Kompatibilität
        // Filtere nur Firmen mit Profilbildern (nicht Default-Fallback)
        const companiesWithImages = companies.filter(company =>
          company.profilePictureURL &&
          company.profilePictureURL !== '/icon/default-company-logo.png' &&
          company.profilePictureURL.trim() !== ''
        );

        // Begrenze auf maximal 10 Firmen für bessere Performance
        const limitedCompanies = companiesWithImages.slice(0, 10);

        setNewCompanies(limitedCompanies);
      } catch (err) {
        console.error("Fehler beim Laden der neuen Firmen:", err);
        setError("Die neuesten Dienstleister konnten nicht geladen werden."); // Fehlermeldung für den Benutzer setzen
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
        <section>
          <div className="pb-24 pt-12 md:pb-32 lg:pb-56 lg:pt-44">
            <div className="relative mx-auto max-w-6xl px-6 flex flex-col-reverse items-center gap-10 lg:flex-row lg:items-center">
              <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">
                <h1 className="text-3xl font-semibold leading-snug tracking-tight md:text-4xl xl:text-5xl">
                  <span className="block">Finde verlässliche Hilfe</span>
                  <span className="block">für jedes Projekt –</span>
                  <span className="block">
                    schnell, einfach, <span className="text-[#14ad9f]">Tasko</span>
                  </span>
                </h1>

                <p className="mt-8 max-w-2xl text-pretty text-lg">
                  Tasko bringt Kunden und Dienstleister wie Handwerker & Mietköche schnell und zuverlässig über App & Web zusammen – einfach buchen & starten!
                </p>

                <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
                  <Button asChild size="lg" className="px-5 text-base bg-[#14ad9f] text-white hover:bg-teal-700">
                    <Link href="/auftrag/get-started">
                      <span className="text-nowrap">Ich suche Hilfe</span>
                    </Link>
                  </Button>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="px-5 text-base"
                  >
                    <Link href="#link">
                      <span className="text-nowrap">Ich biete Hilfe an</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Bild im eigenen div */}
              <div className="w-full max-w-xl lg:w-1/2">
                <Image
                  className="h-auto w-full object-contain"
                  src="/images/AdobeStock_163577338.jpeg"
                  alt="Tasko Hero"
                  width={1200}
                  height={800}
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background pb-16 md:pb-32">
          <div className="group relative m-auto max-w-6xl px-6">
            <div className="flex flex-col items-center md:flex-row">
              <div className="md:max-w-44 md:border-r md:pr-6">
                <p className="text-end text-sm">unsere neuen Tasker</p>
              </div>
              <div className="relative py-6 md:w-[calc(100%-11rem)]">
                {newCompanies.length > 0 && (
                  <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
                    {loading ? (
                      // Zeige Platzhalter während des Ladens
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ))
                    ) : (
                      newCompanies
                        .filter(company => company.profilePictureURL && company.profilePictureURL !== '/icon/default-company-logo.png') // Nur Firmen mit echten Bildern
                        .map((company) => { // Den eindeutigen Key verwenden
                          // KORREKTUR: Robuste URL-Behandlung für verschiedene Firebase Storage-Formate
                          let imageUrl = company.profilePictureURL;

                          // Wenn die URL nicht mit http beginnt, ist es ein relativer Pfad
                          if (!imageUrl.startsWith('http')) {
                            // URL-dekodieren falls nötig
                            const decodedPath = decodeURIComponent(imageUrl);
                            imageUrl = `https://storage.googleapis.com/tilvo-f142f.firebasestorage.app/${decodedPath}`;
                          }

                          return (
                            <div key={company.id} className="flex">
                              <Image
                                className="mx-auto h-6 w-fit" // dark:invert wurde entfernt, da es bei farbigen Logos stören kann
                                src={imageUrl}
                                alt={`${company.name} Logo`}
                                height={100}
                                width={200}
                                style={{ objectFit: "contain" }}
                                unoptimized={true} // Umgeht Next.js Image Optimization für Firebase Storage
                                onError={(e) => {
                                  console.warn(`Failed to load image for ${company.name}:`, imageUrl);
                                  // Verstecke das Bild und den Container bei Fehlern
                                  const target = e.currentTarget as HTMLImageElement;
                                  const container = target.closest('.flex') as HTMLElement;
                                  if (container) {
                                    container.style.display = 'none';
                                    container.remove(); // Entferne aus DOM, damit der Slider korrekt funktioniert
                                  }
                                }}
                              />
                            </div>
                          );
                        })
                    )}
                  </InfiniteSlider>
                )}
                {error && !loading && (
                  <div className="text-center text-sm text-red-500">{error}</div>
                )}
                {!loading && !error && newCompanies.length === 0 && (
                  <div className="text-center text-sm text-gray-500">Aktuell keine neuen Dienstleister.</div>
                )}

                <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>

                <ProgressiveBlur
                  className="pointer-events-none absolute left-0 top-0 h-full w-20"
                  direction="left"
                  blurIntensity={1}
                />
                <ProgressiveBlur
                  className="pointer-events-none absolute right-0 top-0 h-full w-20"
                  direction="right"
                  blurIntensity={1}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
