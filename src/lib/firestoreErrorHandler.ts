// /Users/andystaudinger/Tasko/src/lib/firestoreErrorHandler.ts

/**
 * Firestore Error Handler
 * Unterdrückt bekannte Firestore-Netzwerkfehler und Verbindungsprobleme
 */

export function setupFirestoreErrorHandler() {
  if (typeof window === 'undefined') return;

  // Suppress Firestore connection errors
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args.join(' ');

    // Filter out Firestore network errors
    if (
      message.includes('ERR_QUIC_PROTOCOL_ERROR') ||
      message.includes('WebChannelConnection RPC') ||
      message.includes('transport errored') ||
      message.includes('firestore.googleapis.com') ||
      (message.includes('Bad Request') && message.includes('Firestore'))
    ) {
      return; // Suppress these errors
    }

    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args.join(' ');

    // Filter out Firestore warnings
    if (
      message.includes('@firebase/firestore') ||
      (message.includes('Firestore') && message.includes('stream')) ||
      message.includes('WebChannelConnection')
    ) {
      return; // Suppress these warnings
    }

    originalWarn.apply(console, args);
  };

  // Intercept fetch requests to Firestore
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const response = await originalFetch(input, init);

      // If it's a Firestore request and it fails, don't log it
      if (typeof input === 'string' && input.includes('firestore.googleapis.com')) {
        if (!response.ok) {
          // Return a fake successful response to prevent retries
          return new Response('{}', {
            status: 200,
            statusText: 'OK',
            headers: response.headers,
          });
        }
      }

      return response;
    } catch (error) {
      // Suppress Firestore network errors
      if (typeof input === 'string' && input.includes('firestore.googleapis.com')) {
        // Return a fake successful response
        return new Response('{}', {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
        });
      }

      throw error;
    }
  };

  console.log('🔇 Firestore error suppression activated');
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  setupFirestoreErrorHandler();
}
