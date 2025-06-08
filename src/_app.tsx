import '@/styles/globals.css';
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { auth } from './firebase/clients';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { RegistrationProvider } from '@/app/contexts/registrationContext';
import { GoogleMapsApiLoaderProvider } from './components/GoogleMapsApiLoaderContext';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('Auth state changed:', user);
    });

    return () => unsubscribe();
  }, []);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    console.warn(
      '⚠️ WARNUNG: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ist nicht gesetzt. Google Maps wird nicht funktionieren.'
    );
  }

  return (
    <AuthProvider>
      <RegistrationProvider>
        <GoogleMapsApiLoaderProvider>
          <Component {...pageProps} />
        </GoogleMapsApiLoaderProvider>
      </RegistrationProvider>
    </AuthProvider>
  );
}

export default MyApp;
