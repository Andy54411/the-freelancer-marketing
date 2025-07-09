// src/lib/getFirebaseImageUrl.ts

/**
 * Baut eine öffentliche Download-URL für eine Datei im Firebase Storage-Bucket.
 * @param storagePathOrUrl Pfad im Storage (z.B. "user_uploads/uid/dateiname.jpg") oder bereits eine URL
 * @returns Die öffentliche Download-URL
 */
export function getFirebaseImageUrl(storagePathOrUrl: string): string {
    if (!storagePathOrUrl) return '/default-avatar.jpg';
    if (storagePathOrUrl.startsWith('http')) return storagePathOrUrl;
    // Nur kodieren, wenn noch nicht kodiert
    const needsEncoding = !storagePathOrUrl.includes('%2F');
    const encodedPath = needsEncoding ? encodeURIComponent(storagePathOrUrl) : storagePathOrUrl;
    const bucket = "tilvo-f142f.firebasestorage.app";
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}
