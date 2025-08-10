// Status Messages Component for Google Ads Pages
// Centralized status message rendering

import React from 'react';
import { SuccessIcon, ErrorIcon } from './GoogleAdsIcons';
import { StatusMessages as IStatusMessages } from '@/hooks/useStatusMessages';

interface StatusMessagesProps extends IStatusMessages {
  className?: string;
}

export const StatusMessages: React.FC<StatusMessagesProps> = ({
  success,
  error,
  details,
  accounts,
  className = 'mb-6',
}) => {
  // Success Messages
  if (success === 'connected') {
    return (
      <div className={`${className} bg-green-50 border border-green-200 rounded-lg p-4`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <SuccessIcon className="text-green-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Google Ads erfolgreich verbunden!
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                {accounts
                  ? `${accounts} Account(s) gefunden und verknüpft.`
                  : 'Accounts wurden erfolgreich verknüpft.'}{' '}
                Sie können jetzt Ihre Kampagnen verwalten.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Other Success Messages
  if (success) {
    return (
      <div className={`${className} p-4 bg-green-50 border border-green-200 rounded-lg`}>
        <p className="text-green-800">{success}</p>
      </div>
    );
  }

  // Error Messages
  if (error) {
    const getErrorMessage = (errorCode: string) => {
      const errorMessages: Record<string, string> = {
        missing_parameters: 'Fehlende Parameter bei der Autorisierung.',
        token_exchange_failed: 'Token-Austausch fehlgeschlagen.',
        fetch_customers_failed: 'Laden der Google Ads Accounts fehlgeschlagen.',
        save_failed: 'Speichern der Konfiguration fehlgeschlagen.',
        callback_failed: 'Callback-Verarbeitung fehlgeschlagen.',
        invalid_company_id: 'Ungültige Unternehmens-ID.',
        missing_developer_token: 'Fehlender Developer Token.',
      };

      return errorMessages[errorCode] || `Unbekannter Fehler: ${errorCode}`;
    };

    return (
      <div className={`${className} bg-red-50 border border-red-200 rounded-lg p-4`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <ErrorIcon className="text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Verbindungsfehler</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{getErrorMessage(error)}</p>
              {/* Show additional error details if available */}
              {details && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border">
                  <strong>Details:</strong> {decodeURIComponent(details)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No messages
  return null;
};
