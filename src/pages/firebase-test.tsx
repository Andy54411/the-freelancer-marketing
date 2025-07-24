// Firebase Connection Test Page
'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/firebase/clients';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function FirebaseTestPage() {
  const [status, setStatus] = useState('Testing...');
  const [config, setConfig] = useState<any>(null);
  const [authTest, setAuthTest] = useState('Not tested');

  useEffect(() => {
    // Test Firebase Config
    const testConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    setConfig(testConfig);

    // Test Firebase Auth
    if (auth) {
      setStatus('✅ Firebase Auth initialized');

      // Test with known credentials
      signInWithEmailAndPassword(auth, 'a.staudinger32@gmail.com', 'test-password')
        .then(() => {
          setAuthTest('✅ Login successful');
        })
        .catch(error => {
          setAuthTest(`❌ Login failed: ${error.code} - ${error.message}`);
        });
    } else {
      setStatus('❌ Firebase Auth not initialized');
    }
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔥 Firebase Connection Test</h1>

      <h2>Status:</h2>
      <p>{status}</p>

      <h2>Environment Variables:</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>

      <h2>Auth Test:</h2>
      <p>{authTest}</p>

      <h2>Current URL:</h2>
      <p>{typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>
    </div>
  );
}
