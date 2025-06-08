'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getDatabase, ref, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  // Weitere Firebase-Konfiguration ergänzen
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

export default function MobileUploadCamera() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Optionales Chaining: Wenn searchParams null ist, wird sessionId auf null gesetzt
  const sessionId = searchParams?.get('sessionId');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sessionId) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const filename = `${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, `mobileUploads/${sessionId}/${filename}`);

      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          () => resolve()
        );
      });

      const downloadUrl = await getDownloadURL(fileRef);

      const uploadRef = ref(db, `uploads/${sessionId}`);
      await update(uploadRef, {
        status: 'uploaded',
        imageUrl: downloadUrl,
        timestamp: Date.now(),
      });

      setUploadSuccess(true);
    } catch (error: unknown) {
      let errorMessage = 'Upload fehlgeschlagen';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setUploadError(errorMessage);
      const uploadRef = ref(db, `uploads/${sessionId}`);
      await update(uploadRef, { status: 'error' });
    } finally {
      setUploading(false);
    }
  };

  if (!sessionId) {
    return <p className="p-6 text-center text-red-600">Kein Upload-Link gefunden.</p>;
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Foto aufnehmen & hochladen</h1>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={uploading}
        className="border p-2 rounded w-full"
      />

      {uploading && <p className="mt-2 text-blue-600">Upload läuft...</p>}
      {uploadError && <p className="mt-2 text-red-600">{uploadError}</p>}
      {uploadSuccess && <p className="mt-2 text-green-600">Upload erfolgreich!</p>}

      <button
        onClick={() => router.back()}
        className="mt-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
      >
        Zurück
      </button>
    </div>
  );
}
