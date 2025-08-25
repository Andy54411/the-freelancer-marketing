/**
 * DATEV Authentication Component
 * Frontend Component für DATEV OAuth Integration mit neuer Auth Middleware
 * Ähnlich dem finAPI Banking Connection Pattern
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/firebase/clients';

interface DatevAuthComponentProps {
  onAuthSuccess?: (result: DatevAuthResult) => void;
  onAuthError?: (error: string) => void;
  className?: string;
}

interface DatevAuthResult {
  success: boolean;
  datefUserId?: string;
  organizationId?: string;
  message?: string;
}

export default function DatevAuthComponent({
  onAuthSuccess,
  onAuthError,
  className = '',
}: DatevAuthComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'success' | 'error'>(
    'idle'
  );
  const [statusMessage, setStatusMessage] = useState('');
  const { user } = useAuth();
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);

  // Get Firebase token when user is available
  useEffect(() => {
    const getToken = async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          setFirebaseToken(token);
        } catch (error) {

        }
      }
    };
    getToken();
  }, [user]);

  const handleDatevAuth = async () => {
    if (!user || !firebaseToken) {
      setStatusMessage('Firebase authentication required');
      setAuthStatus('error');
      onAuthError?.('Firebase authentication required');
      return;
    }

    setIsLoading(true);
    setAuthStatus('authenticating');
    setStatusMessage('Initiating DATEV OAuth flow...');

    try {

      // Call new DATEV auth API with Firebase token
      const response = await fetch('/api/datev/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          redirectUri: `${window.location.origin}/api/datev/callback`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate DATEV OAuth');
      }

      if (result.success && result.authUrl) {
        setStatusMessage('Redirecting to DATEV authentication...');

        // Redirect to DATEV OAuth page
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error || 'Invalid OAuth response');
      }
    } catch (error: any) {

      setStatusMessage(error.message || 'Authentication failed');
      setAuthStatus('error');
      onAuthError?.(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    if (!user || !firebaseToken) return;

    try {

      const response = await fetch('/api/datev/userinfo-test', {
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatusMessage('DATEV authentication is active');
        setAuthStatus('success');
        onAuthSuccess?.({
          success: true,
          message: 'DATEV authentication verified',
        });
      } else {
        const errorData = await response.json();
        if (errorData.requiresAuth) {
          setStatusMessage('DATEV authentication required');
          setAuthStatus('idle');
        } else {
          setStatusMessage(`Authentication check failed: ${errorData.error}`);
          setAuthStatus('error');
        }
      }
    } catch (error: any) {

      setStatusMessage('Failed to check authentication status');
      setAuthStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (authStatus) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'authenticating':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (authStatus) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'authenticating':
        return '🔄';
      default:
        return '🔐';
    }
  };

  return (
    <div className={`p-6 border border-gray-200 rounded-lg bg-white ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">DATEV Authentication</h3>
        <p className="text-sm text-gray-600">
          Connect your DATEV account to access financial data and services.
        </p>
      </div>

      <div className="mb-4">
        <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
          <span className="text-lg">{getStatusIcon()}</span>
          <span>{statusMessage || 'Ready to authenticate'}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleDatevAuth}
          disabled={isLoading || authStatus === 'authenticating'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">🔄</span>
              Authenticating...
            </>
          ) : (
            <>
              <span>🔐</span>
              Connect DATEV
            </>
          )}
        </button>

        <button
          onClick={checkAuthStatus}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>🔍</span>
          Check Status
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          Uses new DATEV Authentication Middleware with Firebase integration. Similar to finAPI
          banking connection pattern.
        </p>
      </div>
    </div>
  );
}
