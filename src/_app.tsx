import '@/styles/globals.css';
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { auth } from './firebase/clients';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { RegistrationProvider } from '@/app/contexts/registrationContext';
import { GoogleMapsApiLoaderProvider } from './components/GoogleMapsApiLoaderContext'; // richtiger Pfad!

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
        <GoogleMapsApiLoaderProvider>
          <Component {...pageProps} />
        </GoogleMapsApiLoaderProvider>
      </RegistrationProvider>
    </AuthProvider>
  );
}

export default MyApp;
