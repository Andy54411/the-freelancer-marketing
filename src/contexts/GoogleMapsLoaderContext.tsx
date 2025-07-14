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
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!,
      version: 'weekly',
      // WICHTIG: Hier alle benötigten Libraries auf einmal angeben
      libraries: ['maps', 'places', 'marker'],
    });

    loader
      .load()
      .then(loadedGoogle => {
        setGoogle(loadedGoogle);
        setIsLoaded(true);
        console.log('[GoogleMapsLoaderProvider] Google Maps API erfolgreich geladen.');
      })
      .catch(e => {
        console.error('[GoogleMapsLoaderProvider] Fehler beim Laden der Google Maps API:', e);
      });
  }, []); // Der leere Array sorgt dafür, dass dies nur einmal ausgeführt wird

  const value = { isLoaded, google };

  return <GoogleMapsContext.Provider value={value}>{children}</GoogleMapsContext.Provider>;
};
