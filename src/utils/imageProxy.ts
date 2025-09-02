/**
 * Hilfsfunktionen für das Laden von Firebase Storage Bildern
 */

/**
 * Konvertiert eine Firebase Storage URL in eine Proxy-URL
 * Um Firebase Storage-Berechtigungsprobleme zu umgehen
 */
export function getProxiedImageUrl(firebaseStorageUrl: string): string {
  if (!firebaseStorageUrl || firebaseStorageUrl.trim() === '') {
    return '';
  }

  // Prüfe ob es bereits eine Proxy-URL ist
  if (firebaseStorageUrl.includes('/api/image-proxy')) {
    return firebaseStorageUrl;
  }

  try {
    // Extrahiere den Pfad aus der Firebase Storage URL
    let imagePath = firebaseStorageUrl;

    // Entferne Firebase Storage Prefixes
    if (imagePath.includes('https://storage.googleapis.com/')) {
      imagePath = imagePath.replace('https://storage.googleapis.com/tilvo-f142f-storage/', '');
    } else if (imagePath.includes('gs://')) {
      imagePath = imagePath.replace('gs://tilvo-f142f-storage/', '');
    }

    // Erstelle die Proxy-URL
    const proxyUrl = `/api/image-proxy?path=${encodeURIComponent(imagePath)}`;

    console.log('🖼️ Image URL Proxy:', {
      original: firebaseStorageUrl,
      proxied: proxyUrl,
      imagePath,
    });

    return proxyUrl;
  } catch (error) {
    console.error('🖼️ Error creating proxy URL:', error);
    return firebaseStorageUrl; // Fallback zur originalen URL
  }
}

/**
 * Prüft ob eine URL eine Firebase Storage URL ist
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('storage.googleapis.com') || url.includes('firebasestorage.googleapis.com');
}
