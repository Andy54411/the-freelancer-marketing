// src/contexts/GoogleMapsApiLoaderContext.tsx
'use client'; // Dies ist ein Client Component Context

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
    // Der zentrale Loader, jetzt hier im Context Provider
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY",
        libraries: ['places', 'maps'],
        language: 'de',
        region: 'DE',
    });

    // Debugging-Logs, optional
    console.log("DEBUG GoogleMapsApiLoaderProvider: isMapsLoaded:", isLoaded);
    console.log("DEBUG GoogleMapsApiLoaderProvider: mapsLoadError:", loadError);

    if (loadError) {
        console.error("Fehler beim Laden der Google Maps API im Context:", loadError);
    }

    const contextValue = {
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
    if (context === undefined) {
        throw new Error("useGoogleMapsApiLoader muss innerhalb eines GoogleMapsApiLoaderProvider verwendet werden");
    }
    return context;
};