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

      // DON'T test login automatically - just check if auth works
      setAuthTest('Ready to test - Auth object exists');
    } else {
      setStatus('❌ Firebase Auth not initialized');
      setAuthTest('Auth object is null/undefined');
    }
  }, []);

  const testLogin = async () => {
    setAuthTest('Testing login...');
    try {
      // Test with known credentials
      const result = await signInWithEmailAndPassword(
        auth,
        'a.staudinger32@gmail.com',
        'REAL_PASSWORD_HERE'
      );
      setAuthTest(`✅ Login successful: ${result.user.uid}`);
    } catch (error: any) {
      setAuthTest(`❌ Login failed: ${error.code} - ${error.message}`);

    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        backgroundColor: '#f0f0f0',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ color: '#ff4444' }}>🔥 FIREBASE DEBUG - LOGIN PROBLEM</h1>

      <h2>Status:</h2>
      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{status}</p>

      <h2>Environment Variables:</h2>
      <pre style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        {JSON.stringify(config, null, 2)}
      </pre>

      <h2>Auth Test:</h2>
      <p style={{ fontSize: '16px' }}>{authTest}</p>

      <button
        onClick={testLogin}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#ff4444',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        🚨 TEST LOGIN NOW
      </button>

      <h2>Current URL:</h2>
      <p>{typeof window !== 'undefined' ? window.location.href : 'Server-side'}</p>

      <h2>Firebase App Info:</h2>
      <pre style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc' }}>
        {auth
          ? JSON.stringify(
              {
                app: auth.app?.name || 'No app',
                config: auth.config || 'No config',
              },
              null,
              2
            )
          : 'No auth object'}
      </pre>
    </div>
  );
}
