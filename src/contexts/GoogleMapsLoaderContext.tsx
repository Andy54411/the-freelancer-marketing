// src/contexts/GoogleMapsLoaderContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapsContextType {
  isLoaded: boolean;
  google: typeof window.google | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | null>(null);

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps muss innerhalb eines GoogleMapsLoaderProvider verwendet werden');
  }
  return context;
};

interface GoogleMapsLoaderProviderProps {
  children: React.ReactNode;
}

export const GoogleMapsLoaderProvider: React.FC<GoogleMapsLoaderProviderProps> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [google, setGoogle] = useState<typeof window.google | null>(null);

  useEffect(() => {
    // Prüfe ob Google Maps bereits geladen ist
    if (window.google?.maps?.places) {
      setGoogle(window.google);
      setIsLoaded(true);
      return;
    }

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY!,
      version: 'weekly',
      // WICHTIG: Hier alle benötigten Libraries auf einmal angeben - mit korrekten Namen
      libraries: ['places', 'marker'] as any,
    });

    loader
      .load()
      .then(loadedGoogle => {
        setGoogle(loadedGoogle);
        setIsLoaded(true);
        console.log('✅ Google Maps erfolgreich mit @googlemaps/js-api-loader geladen');
      })
      .catch(e => {
        console.error('❌ Fehler beim Laden von Google Maps:', e);
      });
  }, []); // Der leere Array sorgt dafür, dass dies nur einmal ausgeführt wird

  const value = { isLoaded, google };

  return <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>;
};
