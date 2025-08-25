'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

const getCategoriesWithDynamicTags = (categoryTags: Record<string, string[]>) => [
  {
    id: 'moebel',
    label: 'Möbelmontage',
    icon: (
      <Image
        src="/icon/AdobeStock_439527548.svg"
        alt="Icon"
        width={40}
        height={40}
        className="w-10 h-10 text-[#14ad9f]"
      />
    ),
    tags: categoryTags['Möbelmontage'] || ['IKEA Möbel aufbauen', 'Küchenmontage'],
    image: '/images/AdobeStock_298445672.jpeg',
    title: 'Möbelmontage',
    text: 'Hilfe beim Aufbau von Möbeln und IKEA-Produkten.',
  },
  {
    id: 'mietkoeche',
    label: 'Mietköche',
    icon: (
      <Image
        src="/icon/AdobeStock_574841528.svg"
        alt="Icon"
        width={40}
        height={40}
        className="w-10 h-10 text-[#14ad9f]"
      />
    ),
    tags: categoryTags['Mietköche'] || ['Hochzeitsköche', 'Privat-Dinner'],
    image: '/images/AdobeStock_136993219.jpeg',
    title: 'Mietköche',
    text: 'Flexible Köche für Events, Zuhause oder Gastronomie.',
  },
  {
    id: 'elektro',
    label: 'Elektrikarbeiten',
    icon: (
      <Image
        src="/icon/AdobeStock_547824942.svg"
        alt="Icon"
        width={40}
        height={40}
        className="w-10 h-10 text-[#14ad9f]"
      />
    ),
    tags: categoryTags['Elektrikarbeiten'] || ['Lampen installieren', 'Steckdosen erneuern'],
    image: '/images/AdobeStock_377954036.jpeg',
    title: 'Elektrikarbeiten',
    text: 'Professionelle Unterstützung bei Elektroarbeiten.',
  },
  {
    id: 'reparatur',
    label: 'Reparaturen im Haus',
    icon: (
      <Image
        src="/icon/AdobeStock_227384966.svg"
        alt="Icon"
        width={40}
        height={40}
        className="w-10 h-10 text-[#14ad9f]"
      />
    ),
    tags: categoryTags['Reparaturen im Haus'] || ['Wasserhahn reparieren', 'Wände streichen'],
    image: '/images/AdobeStock_221207083.jpeg',
    title: 'Reparaturen',
    text: 'Hilfe bei kleinen Reparaturen und Wartungen.',
  },
  {
    id: 'umzug',
    label: 'Umzug',
    icon: (
      <Image
        src="/icon/AdobeStock_452856534.svg"
        alt="Icon"
        width={40}
        height={40}
        className="w-10 h-10 text-[#14ad9f]"
      />
    ),
    tags: categoryTags['Umzug'] || ['Wohnungsumzug', 'Möbel transportieren'],
    image: '/images/AdobeStock_171302559.jpeg',
    title: 'Umzug',
    text: 'Ein- und Auspacken, Tragen und Möbeltransport.',
  },
  {
    id: 'beliebt',
    label: 'Beliebt',
    icon: (
      <Image
        src="/icon/AdobeStock_558879898.svg"
        alt="Icon"
        width={40}
        height={40}
        className="w-10 h-10 text-[#14ad9f]"
      />
    ),
    tags: categoryTags['Beliebte Tasks'] || ['Reinigungsservice', 'Gartenarbeiten'],
    image: '/images/AdobeStock_369265805.jpeg',
    title: 'Beliebte Tasks',
    text: 'Die beliebtesten Dienstleistungen der Woche.',
  },
];

// Hook für dynamische Kategoriedaten aus der Datenbank
const useCategoryData = () => {
  const [categoryTags, setCategoryTags] = useState<Record<string, string[]>>({
    Möbelmontage: ['IKEA Möbel aufbauen', 'Küchenmontage'],
    Mietköche: ['Hochzeitsköche', 'Privat-Dinner'],
    Elektrikarbeiten: ['Lampen installieren', 'Steckdosen erneuern'],
    'Reparaturen im Haus': ['Wasserhahn reparieren', 'Wände streichen'],
    Umzug: ['Wohnungsumzug', 'Möbel transportieren'],
    'Beliebte Tasks': ['Reinigungsservice', 'Gartenarbeiten'],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPopularSubcategories = async () => {
      try {
        setLoading(true);

        // Prüfe zuerst die Firestore-Verbindung
        if (!db) {

          return;
        }

        // Abfrage der auftraege Collection (korrekte Collection-Name)
        const ordersRef = collection(db, 'auftraege');
        const recentOrdersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(500));

        const ordersSnapshot = await getDocs(recentOrdersQuery);

        // Gruppiere nach Kategorie und zähle Subkategorien
        const categoryStats: Record<string, Record<string, number>> = {};

        ordersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const category = data.selectedCategory;
          const subcategory = data.selectedSubcategory;

          if (category && subcategory) {
            if (!categoryStats[category]) {
              categoryStats[category] = {};
            }
            categoryStats[category][subcategory] = (categoryStats[category][subcategory] || 0) + 1;
          }
        });

        // Ermittle die Top 2 Subkategorien pro Kategorie
        const topSubcategories: Record<string, string[]> = {};

        Object.entries(categoryStats).forEach(([category, subcategories]) => {
          const sorted = Object.entries(subcategories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([name]) => name);
          topSubcategories[category] = sorted;
        });

        // Nur Updates wenn Daten vorhanden sind
        if (Object.keys(topSubcategories).length > 0) {
          setCategoryTags(prev => ({ ...prev, ...topSubcategories }));
        }
      } catch (error) {

        // Statische Daten bleiben als Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchPopularSubcategories();
  }, []);

  return { categoryTags, loading };
};

export default function CategoryGrid() {
  const [active, setActive] = useState('moebel');
  const { categoryTags, loading } = useCategoryData();

  // Dynamische Kategorien mit aktuellen Tags
  const categories = getCategoriesWithDynamicTags(categoryTags);
  const selected = categories.find(cat => cat.id === active)!;

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-white/80 drop-shadow-md">Lade Kategorien...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 space-y-8">
      {/* Kategorie-Icons im 3x2 Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-6 justify-items-center border-b pb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActive(cat.id)}
            className="flex flex-col items-center group"
          >
            <div
              className={cn(
                'flex items-center justify-center w-16 h-16 rounded-full mb-1 transition-all',
                active === cat.id ? 'bg-[#d2f4ef] border-2 border-[#14ad9f]' : 'bg-gray-100'
              )}
            >
              {cat.icon}
            </div>
            <span
              className={cn(
                'text-sm mt-1 text-center',
                active === cat.id
                  ? 'text-white font-semibold drop-shadow-md'
                  : 'text-white/80 drop-shadow-md'
              )}
            >
              {cat.label}
            </span>
            {active === cat.id && <div className="h-1 w-6 mt-2 bg-[#14ad9f] rounded" />}
          </button>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
        {selected.tags.map(tag => (
          <button
            key={tag}
            className="px-6 py-2 border border-white/30 rounded-full text-base font-medium text-white/90 hover:bg-white/10 transition drop-shadow-md"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Bild & Infobox */}
      <div className="relative bg-transparent rounded-2xl p-6 overflow-hidden">
        <div className="relative flex flex-col md:flex-row items-center md:items-start md:justify-start">
          {/* Infobox */}
          <div className="md:absolute md:left-6 md:top-1/2 md:-translate-y-1/2 bg-white p-6 rounded-xl shadow-lg z-10 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-4">{selected.title}</h3>
            <ul className="list-none text-gray-700 space-y-4">
              <li className="flex gap-2">
                <span className="text-[#14ad9f]">✓</span>
                <span>{selected.text}</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#14ad9f]">✓</span>
                <span>
                  Aktuelle Trends: Geschwungene Sofas, Computer-Schreibtische und nachhaltige
                  Materialien.
                </span>
              </li>
            </ul>
          </div>

          {/* Bild */}
          <div className="md:ml-[200px] w-full mt-6 md:mt-0">
            <Image
              src={selected.image}
              alt={selected.title}
              width={800} // Example width, adjust for aspect ratio
              height={450} // Example height, adjust for aspect ratio
              className="rounded-2xl w-full h-auto object-cover"
              priority // This image changes dynamically, consider if priority is always needed
            />
          </div>
        </div>
      </div>
    </div>
  );
}
