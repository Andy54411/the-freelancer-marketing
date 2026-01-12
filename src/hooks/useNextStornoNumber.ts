'use client';

import { useState, useEffect } from 'react';
import { NumberSequenceService } from '@/services/numberSequenceService';

/**
 * Hook zum Laden der nächsten Stornonummer für Platzhalter-Anzeige
 */
export function useNextStornoNumber(companyId: string | null) {
  const [nextNumber, setNextNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setNextNumber('');
      return;
    }

    const loadNextNumber = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await NumberSequenceService.getNextNumberForType(companyId, 'Storno');
        const previewNumber = result.formattedNumber;

        setNextNumber(previewNumber);
      } catch (err) {
        console.error('Fehler beim Laden der Stornonummer:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Nummer');

        // Fallback für Platzhalter
        setNextNumber('ST-XXXX');
      } finally {
        setIsLoading(false);
      }
    };

    loadNextNumber();
  }, [companyId]);

  return {
    nextNumber,
    isLoading,
    error,
    // Refresh-Funktion für manuelle Aktualisierung
    refresh: () => {
      if (companyId) {
        const loadNextNumber = async () => {
          try {
            const result = await NumberSequenceService.getNextNumberForType(companyId, 'Storno');
            setNextNumber(result.formattedNumber);
          } catch (err) {
            console.error('Fehler beim Aktualisieren der Stornonummer:', err);
          }
        };
        loadNextNumber();
      }
    }
  };
}
