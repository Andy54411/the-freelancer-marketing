// src/lib/getFirebaseImageUrl.ts

/**
 * Baut eine öffentliche Download-URL für eine Datei im Firebase Storage-Bucket.
 * @param storagePathOrUrl Pfad im Storage (z.B. "user_uploads/uid/dateiname.jpg") oder bereits eine URL
 * @returns Die öffentliche Download-URL
 */
export function getFirebaseImageUrl(storagePathOrUrl: string): string {
    if (!storagePathOrUrl) return '/default-avatar.jpg';
    if (storagePathOrUrl.startsWith('http')) return storagePathOrUrl;

    // Korrektur: Der Pfad muss korrekt für die Firebase Storage URL kodiert werden.
    // `encodeURIComponent` kodiert auch Slashes ('/'), was hier falsch ist.
    // Wir müssen jedes Pfadsegment einzeln kodieren und sie dann wieder mit Slashes verbinden.
    const encodedPath = storagePathOrUrl
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    const bucket = "tilvo-f142f.firebasestorage.app";
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}
