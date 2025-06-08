// src/app/_app.tsx
import '@/styles/globals.css';
import { useEffect } from 'react';
import { auth } from './firebase/clients';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { RegistrationProvider } from '@/app/contexts/registrationContext';
import { GoogleMapsApiLoaderProvider } from '@/components/GoogleMapsApiLoaderContext'; // Pfad anpassen

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user);
    });

    return () => unsubscribe();
  }, []);


  return (
    <AuthProvider>
      <RegistrationProvider>
        {/* Der GoogleMapsApiLoaderProvider kapselt jetzt den useJsApiLoader */}
        <GoogleMapsApiLoaderProvider>
          {/* isMapsLoaded wird NICHT mehr als Prop übergeben, da es über den Context abgerufen wird */}
          <Component {...pageProps} />
        </GoogleMapsApiLoaderProvider>
      </RegistrationProvider>
    </AuthProvider>
  );
}

export default MyApp;