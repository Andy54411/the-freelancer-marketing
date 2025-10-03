'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface DatevOrganization {
  id: string;
  name: string;
}

interface DatevConnection {
  isConnected: boolean;
  organization?: DatevOrganization;
  user?: {
    name: string;
    id: string;
  };
  connectedAt?: string;
}

interface DatevAuthComponentProps {
  companyId: string;
  onAuthSuccess?: (organization: DatevOrganization) => void;
  onAuthError?: (error: string) => void;
}

function DatevAuthComponent({ companyId, onAuthSuccess, onAuthError }: DatevAuthComponentProps) {
  const [connection, setConnection] = useState<DatevConnection>({ isConnected: false });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkExistingConnection();
  }, [companyId]);

  const checkExistingConnection = async () => {
    setIsLoading(true);

    try {
      // Check if user has existing DATEV tokens by testing UserInfo API

      const response = await fetch(`/api/datev/userinfo-test?companyId=${companyId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const userInfo = await response.json();

        setConnection({
          isConnected: true,
          organization: {
            id: userInfo.userInfo?.account_id || 'datev-user',
            name: userInfo.userInfo?.name || 'DATEV User',
          },
          user: {
            name: userInfo.userInfo?.name || 'DATEV User',
            id: userInfo.userInfo?.account_id || 'datev-user',
          },
          connectedAt: new Date().toISOString(),
        });

        setIsAuthenticated(true);
        setShowButtons(false);

        if (onAuthSuccess) {
          onAuthSuccess({
            id: userInfo.userInfo?.account_id || 'datev-user',
            name: userInfo.userInfo?.name || 'DATEV User',
          });
        }

        toast.success('DATEV-Verbindung erfolgreich überprüft');
      } else {
        setShowButtons(true);
      }
    } catch (error) {
      setShowButtons(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async () => {
    setIsLoading(true);

    try {
      // Generate OAuth URL
      const response = await fetch('/api/datev/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate DATEV auth URL');
      }

      const { authUrl } = await response.json();

      // Redirect to DATEV OAuth

      window.location.href = authUrl;
    } catch (error) {
      if (onAuthError) {
        onAuthError(error instanceof Error ? error.message : 'Authentication failed');
      }
      toast.error('DATEV-Authentifizierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear tokens (implement as needed)
      setConnection({ isConnected: false });
      setIsAuthenticated(false);
      setShowButtons(true);

      toast.success('DATEV-Verbindung getrennt');
    } catch (error) {
      toast.error('Fehler beim Trennen der DATEV-Verbindung');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2">Prüfe DATEV-Verbindung...</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">DATEV Integration</h3>
          {connection.isConnected ? (
            <div className="mt-2">
              <p className="text-sm text-green-600">✅ Verbunden</p>
              <p className="text-xs text-gray-500">
                Benutzer: {connection.user?.name || 'DATEV User'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Keine DATEV-Verbindung aktiv</p>
          )}
        </div>

        <div className="flex gap-2">
          {connection.isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Trennen
            </button>
          ) : showButtons ? (
            <button
              onClick={handleAuthentication}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              {isLoading ? 'Verbinde...' : 'Mit DATEV verbinden'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DatevAuthComponent;
export { DatevAuthComponent };
