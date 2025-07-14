'use client';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CategoryGrid() {
  const { t } = useLanguage();
  const [active, setActive] = useState('moebel');

  const categories = [
    {
      id: 'moebel',
      label: t('categoryGrid.furniture.label'),
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
      tags: [t('categoryGrid.furniture.tag1'), t('categoryGrid.furniture.tag2')],
      image: '/images/AdobeStock_298445672.jpeg',
      title: t('categoryGrid.furniture.title'),
      text: t('categoryGrid.furniture.text'),
    },
    {
      id: 'mietkoeche',
      label: t('categoryGrid.chef.label'),
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
      tags: [t('categoryGrid.chef.tag1'), t('categoryGrid.chef.tag2')],
      image: '/images/AdobeStock_136993219.jpeg',
      title: t('categoryGrid.chef.title'),
      text: t('categoryGrid.chef.text'),
    },
    {
      id: 'elektro',
      label: t('categoryGrid.electrical.label'),
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
      tags: [t('categoryGrid.electrical.tag1'), t('categoryGrid.electrical.tag2')],
      image: '/images/AdobeStock_377954036.jpeg',
      title: t('categoryGrid.electrical.title'),
      text: t('categoryGrid.electrical.text'),
    },
    {
      id: 'reparatur',
      label: t('categoryGrid.repair.label'),
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
      tags: [t('categoryGrid.repair.tag1'), t('categoryGrid.repair.tag2')],
      image: '/images/AdobeStock_221207083.jpeg',
      title: t('categoryGrid.repair.title'),
      text: t('categoryGrid.repair.text'),
    },
    {
      id: 'umzug',
      label: t('categoryGrid.moving.label'),
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
      tags: [t('categoryGrid.moving.tag1'), t('categoryGrid.moving.tag2')],
      image: '/images/AdobeStock_171302559.jpeg',
      title: t('categoryGrid.moving.title'),
      text: t('categoryGrid.moving.text'),
    },
    {
      id: 'beliebt',
      label: t('categoryGrid.popular.label'),
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
      tags: [t('categoryGrid.popular.tag1'), t('categoryGrid.popular.tag2')],
      image: '/images/AdobeStock_369265805.jpeg',
      title: t('categoryGrid.popular.title'),
      text: t('categoryGrid.popular.text'),
    },
  ];

  const selected = categories.find(cat => cat.id === active)!;

  const handleCategoryChange = useCallback((categoryId: string) => {
    setActive(categoryId);
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
                  {t('categoryGrid.trends')}
                </span>
              </li>
            </ul>
          </div>

          <div className="md:ml-[200px] w-full mt-4 sm:mt-6 md:mt-0">
            <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-200 rounded-2xl overflow-hidden">
              <img
                key={selected.id} // Key hinzugefügt für sauberen Re-render
                src={selected.image}
                alt={selected.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={e => {
                  console.error('Category image failed to load:', selected.image);
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback');
                  if (fallback) {
                    (fallback as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              {/* Fallback wenn Bild nicht lädt */}
              <div className="fallback absolute inset-0 hidden items-center justify-center bg-gray-100 text-gray-500">
                <span>{t('categoryGrid.imageNotAvailable')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
