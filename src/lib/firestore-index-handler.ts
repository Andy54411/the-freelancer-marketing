/**
 * Firestore Index Error Handler
 * 
 * Erkennt Firestore-Fehler bei fehlenden Indizes und extrahiert den Link
 * zum Erstellen des Indexes in der Firebase Console.
 */

export interface FirestoreIndexError {
  isIndexError: boolean;
  indexUrl?: string;
  collection?: string;
  fields?: string[];
  originalMessage: string;
}

/**
 * Prüft ob ein Fehler ein Firestore Index-Fehler ist und extrahiert die Details
 */
export function parseFirestoreIndexError(error: unknown): FirestoreIndexError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Firestore Index-Fehler haben typischerweise diesen Text
  const isIndexError = 
    errorMessage.includes('requires an index') ||
    errorMessage.includes('The query requires an index') ||
    errorMessage.includes('FAILED_PRECONDITION') ||
    errorMessage.includes('no matching index found');
  
  if (!isIndexError) {
    return {
      isIndexError: false,
      originalMessage: errorMessage,
    };
  }
  
  // Extrahiere den Index-URL aus der Fehlermeldung
  // Format: "...You can create it here: https://console.firebase.google.com/..."
  const urlMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s"')]+/);
  const indexUrl = urlMatch ? urlMatch[0] : undefined;
  
  // Versuche Collection und Felder zu extrahieren
  const collectionMatch = errorMessage.match(/collection[:\s]+([^\s,]+)/i);
  const collection = collectionMatch ? collectionMatch[1] : undefined;
  
  return {
    isIndexError: true,
    indexUrl,
    collection,
    originalMessage: errorMessage,
  };
}

/**
 * Erstellt eine benutzerfreundliche Fehlermeldung für Index-Fehler
 */
export function formatIndexErrorMessage(error: FirestoreIndexError): string {
  if (!error.isIndexError) {
    return error.originalMessage;
  }
  
  let message = 'Firestore Index erforderlich';
  
  if (error.collection) {
    message += ` für Collection "${error.collection}"`;
  }
  
  if (error.indexUrl) {
    message += `. Klicke hier um den Index zu erstellen.`;
  } else {
    message += `. Bitte erstelle den Index in der Firebase Console.`;
  }
  
  return message;
}

/**
 * API Response für Index-Fehler
 */
export function createIndexErrorResponse(error: unknown) {
  const parsed = parseFirestoreIndexError(error);
  
  return {
    success: false,
    error: 'Firestore Index erforderlich',
    isIndexError: true,
    indexUrl: parsed.indexUrl,
    collection: parsed.collection,
    details: parsed.originalMessage,
    message: formatIndexErrorMessage(parsed),
  };
}
