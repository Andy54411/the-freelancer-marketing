'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, Star, Briefcase } from 'lucide-react';
import { categories } from '@/lib/categoriesData';
import Header from '@/components/Header';
import Link from 'next/link';
import { db } from '@/firebase/clients';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface SubcategoryStats {
  averagePrice: number;
  providerCount: number;
  averageRating: number;
}

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const category = (params?.category as string) || '';

  // States für Subcategory-Statistiken
  const [subcategoryStats, setSubcategoryStats] = useState<Record<string, SubcategoryStats>>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // URL-Parameter dekodieren - handle both %26 and & cases
  const decodedCategory = decodeURIComponent(category);

  // Normalisierungsfunktion
  const normalizeToSlug = (str: string) =>
    str.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und');

  // Finde die Kategorie durch Vergleich der normalisierten Namen
  const categoryInfo = categories.find(cat => {
    const expectedSlug = normalizeToSlug(cat.title);
    // Prüfe sowohl den URL-Slug als auch mögliche andere Varianten
    return expectedSlug === category || expectedSlug === decodedCategory;
  });

  // Funktion zum Laden der Subcategory-Statistiken
  const loadSubcategoryStats = async () => {
    if (!categoryInfo) return;

    console.log('Loading stats for category:', categoryInfo.title);
    console.log('Subcategories:', categoryInfo.subcategories);

    setIsLoadingStats(true);
    const stats: Record<string, SubcategoryStats> = {};

    try {
      // Lade Daten für jede Subcategory
      for (const subcategory of categoryInfo.subcategories) {
        // Query für Firmen in dieser Subcategory
        const companiesQuery = query(
          collection(db, 'companies'),
          where('selectedSubcategory', '==', subcategory),
          limit(100)
        );

        // Query für Freelancer/Users in dieser Subcategory
        const usersQuery = query(
          collection(db, 'users'),
          where('selectedSubcategory', '==', subcategory),
          where('isFreelancer', '==', true),
          limit(100)
        );

        const [companiesSnapshot, usersSnapshot] = await Promise.all([
          getDocs(companiesQuery),
          getDocs(usersQuery),
        ]);

        let totalPrice = 0;
        let priceCount = 0;
        let totalRating = 0;
        let ratingCount = 0;
        const totalProviders = companiesSnapshot.docs.length + usersSnapshot.docs.length;

        // Sammle Preise und Bewertungen von Firmen
        companiesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.hourlyRate && typeof data.hourlyRate === 'number') {
            totalPrice += data.hourlyRate;
            priceCount++;
          }
          if (data.rating && typeof data.rating === 'number') {
            totalRating += data.rating;
            ratingCount++;
          }
        });

        // Sammle Preise und Bewertungen von Freelancern
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.hourlyRate && typeof data.hourlyRate === 'number') {
            totalPrice += data.hourlyRate;
            priceCount++;
          }
          if (data.rating && typeof data.rating === 'number') {
            totalRating += data.rating;
            ratingCount++;
          }
        });

        // Berechne Durchschnittswerte
        const averagePrice = priceCount > 0 ? Math.round(totalPrice / priceCount) : 25; // Fallback auf 25€
        const averageRating =
          ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(1)) : 4.8; // Fallback auf 4.8

        // Debug-Ausgabe
        console.log(`Subcategory: ${subcategory}`, {
          companiesCount: companiesSnapshot.docs.length,
          usersCount: usersSnapshot.docs.length,
          totalProviders,
          priceCount,
          averagePrice,
          ratingCount,
          averageRating,
        });

        stats[subcategory] = {
          averagePrice,
          providerCount: totalProviders,
          averageRating,
        };
      }

      setSubcategoryStats(stats);
      console.log('Final stats:', stats);
    } catch (error) {
      console.error('Fehler beim Laden der Subcategory-Statistiken:', error);
      // Fallback-Werte bei Fehler
      const fallbackStats: Record<string, SubcategoryStats> = {};
      categoryInfo.subcategories.forEach(subcategory => {
        fallbackStats[subcategory] = {
          averagePrice: 25,
          providerCount: 50,
          averageRating: 4.8,
        };
      });
      setSubcategoryStats(fallbackStats);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Lade Statistiken beim Mount und wenn sich die Kategorie ändert
  useEffect(() => {
    if (categoryInfo) {
      loadSubcategoryStats();
    }
  }, [categoryInfo]);

  if (!categoryInfo) {
    return (
      <>
        <Header />
        <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative -m-4 lg:-m-6 min-h-screen">
          <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
          <div className="relative z-10 pt-8">
            <div className="max-w-2xl mx-auto text-center p-8">
              <h1 className="text-2xl font-bold text-white mb-4">Kategorie nicht gefunden</h1>
              <button
                onClick={() => router.back()}
                className="text-white/80 hover:text-white flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      {/* Modern Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-[#14ad9f] transition-colors">
              Startseite
            </Link>
            <span className="mx-2">/</span>
            <Link href="/services" className="hover:text-[#14ad9f] transition-colors">
              Services
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">{categoryInfo.title}</span>
          </nav>

          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-[#14ad9f] p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{categoryInfo.title}</h1>
              <p className="text-xl text-gray-600">
                Entdecken Sie professionelle Services von verifizierten Anbietern
              </p>
            </div>
          </div>

          {/* Value Proposition Pills */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium border border-green-200">
              ✓ Verifizierte Anbieter
            </div>
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium border border-blue-200">
              ✓ Sofortige Verfügbarkeit
            </div>
            <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium border border-purple-200">
              ✓ Flexible Preismodelle
            </div>
            <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-medium border border-orange-200">
              ✓ Qualitätsgarantie
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid Section */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verfügbare Services</h2>
            <p className="text-gray-600">
              Wählen Sie aus {categoryInfo.subcategories.length} spezialisierten Service-Bereichen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categoryInfo.subcategories.map((subcategory, index) => {
              const stats = subcategoryStats[subcategory];
              const isLoading = isLoadingStats || !stats;

              return (
                <Link
                  key={index}
                  href={`/services/${categoryInfo.title.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und')}/${subcategory.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'und')}`}
                  className="group block"
                >
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group-hover:border-[#14ad9f]/20">
                    {/* Card Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#14ad9f] to-[#129488] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <span className="text-white font-bold text-lg">
                            {subcategory.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">ab</div>
                          <div className="text-sm font-bold text-gray-900">
                            {isLoading ? (
                              <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                            ) : (
                              `€${stats.averagePrice}/h`
                            )}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#14ad9f] transition-colors">
                        {subcategory}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        Professionelle {subcategory} Services von verifizierten Experten
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {isLoading ? (
                            <div className="animate-pulse bg-gray-200 h-3 w-6 rounded"></div>
                          ) : (
                            <span>{stats.averageRating}</span>
                          )}
                        </div>
                        <div>
                          {isLoading ? (
                            <div className="animate-pulse bg-gray-200 h-3 w-16 rounded"></div>
                          ) : (
                            `${stats.providerCount}+ Anbieter`
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-4 bg-gray-50 group-hover:bg-[#14ad9f]/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[#14ad9f] text-sm font-medium group-hover:text-[#129488] transition-colors">
                          Services durchstöbern
                        </span>
                        <ArrowLeft className="w-4 h-4 text-[#14ad9f] rotate-180 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-[#14ad9f] to-[#129488] rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-4">Sind Sie Anbieter?</h3>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Werden Sie Teil der Taskilo-Community und erreichen Sie tausende potenzielle Kunden.
              Professionelle Tools, faire Provisionen, transparente Abrechnung.
            </p>
            <Link
              href="/dashboard/provider/register"
              className="inline-flex items-center gap-2 bg-white text-[#14ad9f] px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="w-5 h-5" />
              Jetzt als Anbieter registrieren
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
