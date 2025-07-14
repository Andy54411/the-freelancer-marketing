'use client';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const categories = [
  {
    id: 'moebel',
    label: 'Möbelmontage',
    // text-[#14ad9f] won't affect Image color unless it's an SVG manipulated by CSS
    icon: (
      <img
        src="/icon/AdobeStock_439527548.svg"
        alt="Icon"
        className="w-8 h-8 sm:w-10 sm:h-10 text-[#14ad9f]"
        loading="lazy"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    tags: ['Möbelmontage', 'IKEA Montage'],
    image: '/images/AdobeStock_298445672.jpeg',
    title: 'Möbelmontage',
    text: 'Hilfe beim Aufbau von Möbeln und IKEA-Produkten.',
  },
  {
    id: 'mietkoeche',
    label: 'Mietköche',
    icon: (
      <img
        src="/icon/AdobeStock_574841528.svg"
        alt="Icon"
        className="w-8 h-8 sm:w-10 sm:h-10 text-[#14ad9f]"
        loading="lazy"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    tags: ['Privatkoch buchen', 'Event-Küche'],
    image: '/images/AdobeStock_136993219.jpeg',
    title: 'Mietköche',
    text: 'Flexible Köche für Events, Zuhause oder Gastronomie.',
  },
  {
    id: 'elektro',
    label: 'Elektrikarbeiten',
    icon: (
      <img
        src="/icon/AdobeStock_547824942.svg"
        alt="Icon"
        className="w-8 h-8 sm:w-10 sm:h-10 text-[#14ad9f]"
        loading="lazy"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    tags: ['Lichtinstallation', 'Steckdosen tauschen'],
    image: '/images/AdobeStock_377954036.jpeg',
    title: 'Elektrikarbeiten',
    text: 'Professionelle Unterstützung bei Elektroarbeiten.',
  },
  {
    id: 'reparatur',
    label: 'Reparaturen im Haus',
    icon: (
      <img
        src="/icon/AdobeStock_227384966.svg"
        alt="Icon"
        className="w-8 h-8 sm:w-10 sm:h-10 text-[#14ad9f]"
        loading="lazy"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    tags: ['Kleinreparaturen', 'Tür einstellen'],
    image: '/images/AdobeStock_221207083.jpeg',
    title: 'Reparaturen',
    text: 'Hilfe bei kleinen Reparaturen und Wartungen.',
  },
  {
    id: 'umzug',
    label: 'Umzug',
    icon: (
      <img
        src="/icon/AdobeStock_452856534.svg"
        alt="Icon"
        className="w-8 h-8 sm:w-10 sm:h-10 text-[#14ad9f]"
        loading="lazy"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    tags: ['Umzugshilfe', 'Schwere Lasten heben'],
    image: '/images/AdobeStock_171302559.jpeg',
    title: 'Umzug',
    text: 'Ein- und Auspacken, Tragen und Möbeltransport.',
  },
  {
    id: 'beliebt',
    label: 'Beliebt',
    icon: (
      <img
        src="/icon/AdobeStock_558879898.svg"
        alt="Icon"
        className="w-8 h-8 sm:w-10 sm:h-10 text-[#14ad9f]"
        loading="lazy"
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
    tags: ['Top Tilver ', 'Top Tilver'],
    image: '/images/AdobeStock_369265805.jpeg',
    title: 'Beliebte Tasks',
    text: 'Die beliebtesten Dienstleistungen der Woche.',
  },
];

export default function CategoryGrid() {
  const [active, setActive] = useState('moebel');
  const [imageLoading, setImageLoading] = useState(true);

  const selected = categories.find(cat => cat.id === active)!;

  const handleCategoryChange = useCallback((categoryId: string) => {
    setImageLoading(true); // Zeige Loading-State beim Kategoriewechsel
    setActive(categoryId);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 space-y-6 sm:space-y-8">
      {/* Kategorie-Icons im 2x3 Grid für Mobile, 3x2 für Tablet, 6x1 für Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6 justify-items-center border-b pb-4 sm:pb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className="flex flex-col items-center group min-h-[80px] sm:min-h-[auto]"
          >
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-1 transition-all',
                active === cat.id ? 'bg-[#d2f4ef] border-2 border-[#14ad9f]' : 'bg-gray-100'
              )}
            >
              {cat.icon}
            </div>
            <span
              className={cn(
                'text-xs sm:text-sm mt-1 text-center leading-tight',
                active === cat.id ? 'text-[#14ad9f] font-semibold' : 'text-gray-600'
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
            className="px-6 py-2 border border-black rounded-full text-base font-medium hover:bg-gray-100 transition"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Bild & Infobox */}
      <div className="relative bg-[#e1f5fe] rounded-2xl p-6 overflow-hidden">
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
          <div className="md:ml-[200px] w-full mt-4 sm:mt-6 md:mt-0">
            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-2xl overflow-hidden">
              {/* Loading Overlay */}
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-pulse text-gray-500">Laden...</div>
                </div>
              )}
              <img
                key={selected.id} // Key hinzugefügt für sauberen Re-render
                src={selected.image}
                alt={selected.title}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
                  imageLoading ? 'opacity-0' : 'opacity-100'
                )}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={e => {
                  console.error('Category image failed to load:', selected.image);
                  setImageLoading(false);
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              {/* Fallback wenn Bild nicht lädt */}
              <div className="fallback absolute inset-0 hidden items-center justify-center bg-gray-100 text-gray-500">
                <span>Bild nicht verfügbar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
