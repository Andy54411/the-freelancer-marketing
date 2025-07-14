'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/clients';
import { Button } from '@/components/ui/button';
import { FiDownload, FiLoader, FiAlertCircle } from 'react-icons/fi';

interface StripeFileDownloaderProps {
  fileId: string;
  label: string;
}

export default function StripeFileDownloader({ fileId, label }: StripeFileDownloaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const getStripeFileLink = httpsCallable<{ fileId: string }, { url: string }>(
        functions,
        'getStripeFileLink'
      );
      const result = await getStripeFileLink({ fileId });
      window.open(result.data.url, '_blank');
    } catch (err: any) {
      console.error('Fehler beim Abrufen des Datei-Links:', err);
      setError(err.message || 'Datei konnte nicht abgerufen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end">
      <Button onClick={handleDownload} disabled={isLoading} variant="outline" size="sm">
        {isLoading ? (
          <FiLoader className="animate-spin mr-2 h-4 w-4" />
        ) : (
          <FiDownload className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
