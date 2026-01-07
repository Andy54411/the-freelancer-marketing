'use client';

import { toast } from 'sonner';

interface IndexErrorResponse {
  success: boolean;
  error?: string;
  isIndexError?: boolean;
  indexUrl?: string;
  collection?: string;
  details?: string;
  message?: string;
}

/**
 * Zeigt eine Toast-Warnung für Firestore Index-Fehler an
 * Mit klickbarem Link zur Firebase Console
 */
export function showIndexErrorToast(response: IndexErrorResponse) {
  if (!response.isIndexError) {
    // Normaler Fehler
    toast.error(response.error || 'Ein Fehler ist aufgetreten');
    return;
  }

  // Index-Fehler mit speziellem Toast
  if (response.indexUrl) {
    toast.error(
      <div className="space-y-2">
        <p className="font-semibold text-red-600">Firestore Index erforderlich</p>
        {response.collection && (
          <p className="text-sm text-gray-600">Collection: {response.collection}</p>
        )}
        <a
          href={response.indexUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Index in Firebase erstellen
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>,
      {
        duration: 15000, // 15 Sekunden sichtbar
        className: 'bg-yellow-50 border-yellow-200',
      }
    );
  } else {
    toast.error(
      <div className="space-y-2">
        <p className="font-semibold text-red-600">Firestore Index erforderlich</p>
        <p className="text-sm text-gray-600">
          Bitte erstelle den benötigten Index in der Firebase Console.
        </p>
        {response.details && (
          <p className="text-xs text-gray-500 font-mono break-all">
            {response.details.substring(0, 200)}
          </p>
        )}
      </div>,
      {
        duration: 10000,
      }
    );
  }
}

/**
 * Wrapper für fetch, der automatisch Index-Fehler behandelt
 */
export async function fetchWithIndexHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();

  // Prüfe auf Index-Fehler
  if (data.isIndexError) {
    showIndexErrorToast(data);
    throw new Error(data.message || 'Firestore Index erforderlich');
  }

  // Prüfe auf andere Fehler
  if (!response.ok || data.success === false) {
    const errorMessage = data.error || data.message || 'Ein Fehler ist aufgetreten';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Prüft eine API-Response auf Index-Fehler und zeigt ggf. Toast an
 * Gibt true zurück wenn ein Index-Fehler vorliegt
 */
export function handleApiResponse(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  
  const response = data as IndexErrorResponse;
  
  if (response.isIndexError) {
    showIndexErrorToast(response);
    return true;
  }
  
  return false;
}
