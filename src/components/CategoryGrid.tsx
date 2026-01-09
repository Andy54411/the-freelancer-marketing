'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { db } from '@/firebase/clients';
import { collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { getTagMapping, generateServiceUrl } from '@/lib/serviceTagMapping';

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
      } catch {
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
  const router = useRouter();

  // Tag-Click Handler für Navigation
  const handleTagClick = (tag: string) => {
    const mapping = getTagMapping(tag);

    if (!mapping) {
      return;
    }

    // Generiere URL mit Filtern
    const serviceUrl = generateServiceUrl(mapping);

    // Navigation zur Service-Seite
    router.push(serviceUrl);
  };

  // Dynamische Kategorien mit aktuellen Tags
  const categories = getCategoriesWithDynamicTags(categoryTags);
  const selected = categories.find(cat => cat.id === active)!;

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Lade Kategorien...</div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: '-50px' }}
        className="w-full max-w-6xl mx-auto px-4 space-y-8"
      >
      {/* Section Header */}
      <div className="text-center mb-12">
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className="inline-block px-4 py-1.5 bg-[#d2f4ef] text-[#14ad9f] text-sm font-semibold rounded-full mb-4"
        >
          Unsere Kategorien
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
        >
          Finde den passenden Service
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-lg text-gray-600 max-w-2xl mx-auto"
        >
          Entdecke unsere beliebtesten Dienstleistungen und finde genau den Tasker, den du brauchst
        </motion.p>
      </div>

      {/* Kategorie-Icons im 3x2 Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-6 justify-items-center border-b border-gray-200 pb-6">
        {categories.map((cat, index) => (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActive(cat.id)}
            className="flex flex-col items-center group"
          >
            <motion.div
              className={cn(
                'flex items-center justify-center w-16 h-16 rounded-full mb-1 transition-all',
                active === cat.id ? 'bg-[#d2f4ef] border-2 border-[#14ad9f]' : 'bg-gray-100 hover:bg-gray-200'
              )}
              whileHover={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.3 }}
            >
              {cat.icon}
            </motion.div>
            <span
              className={cn(
                'text-sm mt-1 text-center transition-colors',
                active === cat.id
                  ? 'text-[#14ad9f] font-semibold'
                  : 'text-gray-600 group-hover:text-gray-900'
              )}
            >
              {cat.label}
            </span>
            {active === cat.id && (
              <motion.div
                layoutId="activeIndicator"
                className="h-1 w-6 mt-2 bg-[#14ad9f] rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tags mit Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap gap-4 justify-center md:justify-start"
      >
        {selected.tags.map((tag, index) => (
          <motion.button
            key={tag}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTagClick(tag)}
            className="px-6 py-2 border border-[#14ad9f] rounded-full text-base font-medium text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white transition-all duration-200"
          >
            {tag}
          </motion.button>
        ))}
      </motion.div>

      {/* Bild & Infobox mit Slide-Animation */}
      <div className="relative bg-transparent rounded-2xl p-6 overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative flex flex-col md:flex-row items-center md:items-start md:justify-start"
          >
            {/* Infobox - slidet von links */}
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.1,
                type: 'spring',
                stiffness: 100,
                damping: 15
              }}
              whileHover={{ scale: 1.02 }}
              className="md:absolute md:left-6 md:top-1/2 md:-translate-y-1/2 bg-white p-6 rounded-xl shadow-lg z-10 w-full max-w-sm"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">{selected.title}</h3>
              <ul className="list-none text-gray-700 space-y-4">
                <li className="flex gap-2">
                  <span className="text-[#14ad9f] font-bold">✓</span>
                  <span>{selected.text}</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[#14ad9f] font-bold">✓</span>
                  <span>
                    Aktuelle Trends: Geschwungene Sofas, Computer-Schreibtische und nachhaltige
                    Materialien.
                  </span>
                </li>
              </ul>
            </motion.div>

            {/* Bild - slidet von rechts */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.15,
                type: 'spring',
                stiffness: 100,
                damping: 15
              }}
              className="md:ml-[200px] w-full mt-6 md:mt-0"
            >
              <Image
                src={selected.image}
                alt={selected.title}
                width={800}
                height={450}
                className="rounded-2xl w-full h-auto object-cover shadow-lg"
                priority
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
    </section>
  );
}
