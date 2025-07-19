'use client';

import { useState } from 'react';

interface Farbe {
  name: string;
  baseColor: string;
  intensitaet: {
    hell: string;
    mittel: string;
    dunkel: string;
  };
  qualitaet: 'Standard' | 'Premium' | 'Profi';
  glanz: 'Matt' | 'Seidenmatt' | 'Seidenglanz' | 'Glänzend';
  preis: number;
}

const FARBEN_PALETTE: Farbe[] = [
  {
    name: 'Schneeweiß',
    baseColor: '#FFFFFF',
    intensitaet: {
      hell: '#FFFFFF',
      mittel: '#F8F8F8',
      dunkel: '#F0F0F0',
    },
    qualitaet: 'Premium',
    glanz: 'Matt',
    preis: 24.9,
  },
  {
    name: 'Warmgrau',
    baseColor: '#8B8680',
    intensitaet: {
      hell: '#D3D0CC',
      mittel: '#8B8680',
      dunkel: '#5A5651',
    },
    qualitaet: 'Standard',
    glanz: 'Seidenmatt',
    preis: 19.5,
  },
  {
    name: 'Himmelblau',
    baseColor: '#87CEEB',
    intensitaet: {
      hell: '#E0F6FF',
      mittel: '#87CEEB',
      dunkel: '#4682B4',
    },
    qualitaet: 'Profi',
    glanz: 'Seidenglanz',
    preis: 32.0,
  },
  {
    name: 'Waldgrün',
    baseColor: '#228B22',
    intensitaet: {
      hell: '#90EE90',
      mittel: '#228B22',
      dunkel: '#006400',
    },
    qualitaet: 'Premium',
    glanz: 'Matt',
    preis: 28.75,
  },
  {
    name: 'Terrakotta',
    baseColor: '#E2725B',
    intensitaet: {
      hell: '#F4A291',
      mittel: '#E2725B',
      dunkel: '#CD5C2F',
    },
    qualitaet: 'Standard',
    glanz: 'Glänzend',
    preis: 22.3,
  },
  {
    name: 'Anthrazit',
    baseColor: '#36454F',
    intensitaet: {
      hell: '#708090',
      mittel: '#36454F',
      dunkel: '#2F4F4F',
    },
    qualitaet: 'Profi',
    glanz: 'Matt',
    preis: 35.8,
  },
];

const GLANZ_EIGENSCHAFTEN = {
  Matt: {
    beschreibung: 'Keine Reflexion, verbirgt Unebenheiten',
    anwendung: 'Wohnzimmer, Schlafzimmer',
    haltbarkeit: 'Mittel',
  },
  Seidenmatt: {
    beschreibung: 'Leichter Glanz, pflegeleicht',
    anwendung: 'Flur, Kinderzimmer',
    haltbarkeit: 'Gut',
  },
  Seidenglanz: {
    beschreibung: 'Mittlerer Glanz, abwaschbar',
    anwendung: 'Küche, Bad',
    haltbarkeit: 'Sehr gut',
  },
  Glänzend: {
    beschreibung: 'Hoher Glanz, sehr strapazierfähig',
    anwendung: 'Türen, Fenster, Möbel',
    haltbarkeit: 'Excellent',
  },
};

export default function MalerFarbsystem() {
  const [selectedFarbe, setSelectedFarbe] = useState<Farbe | null>(null);
  const [selectedIntensitaet, setSelectedIntensitaet] = useState<'hell' | 'mittel' | 'dunkel'>(
    'mittel'
  );
  const [filterQualitaet, setFilterQualitaet] = useState<string>('Alle');
  const [filterGlanz, setFilterGlanz] = useState<string>('Alle');

  const gefilterte_farben = FARBEN_PALETTE.filter(farbe => {
    const qualitaetMatch = filterQualitaet === 'Alle' || farbe.qualitaet === filterQualitaet;
    const glanzMatch = filterGlanz === 'Alle' || farbe.glanz === filterGlanz;
    return qualitaetMatch && glanzMatch;
  });

  const getFarbwert = (farbe: Farbe, intensitaet: 'hell' | 'mittel' | 'dunkel') => {
    return farbe.intensitaet[intensitaet];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
          🎨 Maler Farbsystem Professional
        </h1>

        {/* Filter Controls */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Filter & Auswahl</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Qualitäts Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Qualität der Farbe
              </label>
              <select
                value={filterQualitaet}
                onChange={e => setFilterQualitaet(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Alle">Alle Qualitäten</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
                <option value="Profi">Profi</option>
              </select>
            </div>

            {/* Glanz Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Glanzgrad</label>
              <select
                value={filterGlanz}
                onChange={e => setFilterGlanz(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Alle">Alle Glanzgrade</option>
                <option value="Matt">Matt</option>
                <option value="Seidenmatt">Seidenmatt</option>
                <option value="Seidenglanz">Seidenglanz</option>
                <option value="Glänzend">Glänzend</option>
              </select>
            </div>

            {/* Intensitäts Auswahl */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Farbintensität</label>
              <div className="flex space-x-2">
                {(['hell', 'mittel', 'dunkel'] as const).map(intensitaet => (
                  <button
                    key={intensitaet}
                    onClick={() => setSelectedIntensitaet(intensitaet)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      selectedIntensitaet === intensitaet
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {intensitaet.charAt(0).toUpperCase() + intensitaet.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Farben Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {gefilterte_farben.map((farbe, index) => (
            <div
              key={index}
              onClick={() => setSelectedFarbe(farbe)}
              className={`bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                selectedFarbe?.name === farbe.name ? 'ring-4 ring-blue-500' : ''
              }`}
            >
              {/* Farbvorschau */}
              <div className="h-32 flex">
                <div
                  className="flex-1"
                  style={{ backgroundColor: farbe.intensitaet.hell }}
                  title="Hell"
                />
                <div
                  className="flex-1 border-l-2 border-r-2 border-white"
                  style={{ backgroundColor: farbe.intensitaet.mittel }}
                  title="Mittel"
                />
                <div
                  className="flex-1"
                  style={{ backgroundColor: farbe.intensitaet.dunkel }}
                  title="Dunkel"
                />
              </div>

              {/* Farb-Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{farbe.name}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Qualität:</span>
                    <span
                      className={`font-medium ${
                        farbe.qualitaet === 'Profi'
                          ? 'text-purple-600'
                          : farbe.qualitaet === 'Premium'
                            ? 'text-blue-600'
                            : 'text-green-600'
                      }`}
                    >
                      {farbe.qualitaet}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Glanz:</span>
                    <span className="font-medium">{farbe.glanz}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preis:</span>
                    <span className="font-bold text-gray-800">{farbe.preis.toFixed(2)} €/L</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailansicht */}
        {selectedFarbe && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Detailansicht: {selectedFarbe.name}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Farbmuster */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Farbintensitäten</h3>
                <div className="space-y-4">
                  {(['hell', 'mittel', 'dunkel'] as const).map(intensitaet => (
                    <div key={intensitaet} className="flex items-center space-x-4">
                      <div
                        className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-inner"
                        style={{ backgroundColor: getFarbwert(selectedFarbe, intensitaet) }}
                      />
                      <div>
                        <div className="font-medium text-gray-800 capitalize">{intensitaet}</div>
                        <div className="text-sm text-gray-500 font-mono">
                          {getFarbwert(selectedFarbe, intensitaet)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eigenschaften */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Eigenschaften</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Glanzgrad: {selectedFarbe.glanz}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {GLANZ_EIGENSCHAFTEN[selectedFarbe.glanz].beschreibung}
                    </p>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Anwendung:</strong>{' '}
                        {GLANZ_EIGENSCHAFTEN[selectedFarbe.glanz].anwendung}
                      </div>
                      <div>
                        <strong>Haltbarkeit:</strong>{' '}
                        {GLANZ_EIGENSCHAFTEN[selectedFarbe.glanz].haltbarkeit}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Qualität: {selectedFarbe.qualitaet}
                    </h4>
                    <div className="text-sm text-gray-600">
                      {selectedFarbe.qualitaet === 'Standard' &&
                        'Gutes Preis-Leistungs-Verhältnis für normale Anwendungen'}
                      {selectedFarbe.qualitaet === 'Premium' &&
                        'Hochwertige Farbe mit verbesserter Deckkraft und Haltbarkeit'}
                      {selectedFarbe.qualitaet === 'Profi' &&
                        'Professionelle Qualität für höchste Ansprüche und Langlebigkeit'}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Preisinformation</h4>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedFarbe.preis.toFixed(2)} € / Liter
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Inklusive MwSt. • Verfügbar in 1L, 2.5L, 5L, 10L Gebinden
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
