// src/lib/getFirebaseImageUrl.ts

/**
 * Baut eine öffentliche Download-URL für eine Datei im Firebase Storage-Bucket.
 * @param storagePath Pfad im Storage, z.B. "user_uploads/uid/dateiname.jpg"
 * @returns Die öffentliche Download-URL
 */
export function getFirebaseImageUrl(storagePath: string): string {
  const bucket = "tilvo-f142f.firebasestorage.app";
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
}
