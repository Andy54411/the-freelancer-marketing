'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

interface GoogleMapsApiLoaderContextType {
    isMapsLoaded: boolean;
    mapsLoadError: Error | undefined;
}

const GoogleMapsApiLoaderContext = createContext<GoogleMapsApiLoaderContextType | undefined>(undefined);

interface GoogleMapsApiLoaderProviderProps {
    children: ReactNode;
}

export const GoogleMapsApiLoaderProvider: React.FC<GoogleMapsApiLoaderProviderProps> = ({ children }) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error(
            '❌ Google Maps API Key fehlt. Bitte stelle sicher, dass NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in der .env.local gesetzt ist.'
        );
    } else {
        console.log('✅ Google Maps API Key geladen:', apiKey.slice(0, 8) + '...'); // Nur zur Debug-Ausgabe, Key nicht komplett zeigen
    }

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey || '', // leerer Fallback
        libraries: ['places'],
        language: 'de',
        region: 'DE',
    });

    const contextValue: GoogleMapsApiLoaderContextType = {
        isMapsLoaded: isLoaded,
        mapsLoadError: loadError || undefined,
    };

    return (
        <GoogleMapsApiLoaderContext.Provider value={contextValue}>
            {children}
        </GoogleMapsApiLoaderContext.Provider>
    );
};

export const useGoogleMapsApiLoader = (): GoogleMapsApiLoaderContextType => {
    const context = useContext(GoogleMapsApiLoaderContext);
    if (!context) {
        throw new Error('useGoogleMapsApiLoader muss innerhalb eines GoogleMapsApiLoaderProvider verwendet werden.');
    }
    return context;
};
