// src/types/global.d.ts

declare global {
  // Erweitere das Window-Objekt mit Google Maps und initMap
  interface Window {
    google: typeof google; // Typisierung für Google Maps API
    initMap: () => void; // Typisierung der initMap Funktion
  }

  // Beispiel: Globale Interface für das Unternehmen
  interface Company {
    companyName: string;
    profileImageUrl: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    state: string;
  }

  // Beispiel: Ein globaler Typ für eine URL
  interface URLObject {
    url: string;
    description: string;
  }
}

// Benutzerdefinierte Module: Hier wird ein Beispiel für ein benutzerdefiniertes Modul gezeigt.
// Beispiel: Ein benutzerdefiniertes Modul für API-Aufrufe
declare module 'my-custom-api' {
  export function fetchData(endpoint: string): Promise<unknown>;
}

// Typisierung für Umgebungsvariablen
declare namespace _NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string; // API_KEY als Umgebungsvariable
  }
}

export {};
