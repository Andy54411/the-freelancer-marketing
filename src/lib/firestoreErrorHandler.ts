// /Users/andystaudinger/Tasko/src/lib/firestoreErrorHandler.ts

/**
 * Firestore Error Handler
 * Unterdrückt bekannte Firestore-Netzwerkfehler und Verbindungsprobleme
 */

export function setupFirestoreErrorHandler() {
  if (typeof window === 'undefined') return;

  // TEMPORÄR DEAKTIVIERT - Error Handler wurde deaktiviert um echte Firestore-Probleme zu diagnostizieren
  // Der Error Handler hat fetch-Requests manipuliert und echte Verbindungsprobleme verschleiert

  // Nur minimale Unterdrückung bestimmter bekannter harmlöser Warnings beibehalten
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ');

    // Nur spezifische harmlose Warnungen unterdrücken
    if (message.includes('ERR_QUIC_PROTOCOL_ERROR')) {
      return; // Diese eine Warnung ist harmlos
    }

    originalWarn.apply(console, args);
  };

  // FETCH MANIPULATION ENTFERNT - Real Firestore errors sollen sichtbar sein
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  setupFirestoreErrorHandler();
}
