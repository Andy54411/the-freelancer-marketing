'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code'; // Verwendet jetzt 'react-qr-code' statt 'qrcode.react'
import { getDatabase, ref, set, onValue } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { initializeApp } from 'firebase/app';
import Image from 'next/image';

const firebaseConfig = {
  databaseURL: 'https://tilvo-f142f-default-rtdb.europe-west1.firebasedatabase.app',
  // ... ggf. weitere Firebase-Konfig ergänzen
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function UploadPromptDesktop() {
  const [sessionId, setSessionId] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploaded' | 'error' | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [phoneUrl, setPhoneUrl] = useState<string>('');

  useEffect(() => {
    // Session ID erzeugen
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    // Initialer Uploadstatus in Firebase
    set(ref(db, `uploads/${newSessionId}`), {
      status: 'pending',
      timestamp: Date.now(),
      imageUrl: null,
    });

    // Listener für den Upload-Status
    const statusRef = ref(db, `uploads/${newSessionId}/status`);
    onValue(statusRef, snapshot => {
      const status = snapshot.val();
      setUploadStatus(status);
    });

    // Listener für die Bild-URL
    const imageUrlRef = ref(db, `uploads/${newSessionId}/imageUrl`);
    onValue(imageUrlRef, snapshot => {
      const url = snapshot.val();
      if (url) setUploadedImageUrl(url);
    });

    // phoneUrl nur im Client setzen
    if (typeof window !== 'undefined') {
      setPhoneUrl(`${window.location.origin}/upload-from-phone?sessionId=${newSessionId}`);
    }
  }, []);

  return (
    <div className="p-6 text-center">
      <h2 className="mb-4 text-xl font-semibold">Upload per Handy</h2>
      <p className="mb-4">
        Scanne den QR-Code mit deinem Handy, um direkt Fotos aufzunehmen und hochzuladen.
      </p>
      {/* @ts-ignore */}
      {sessionId && phoneUrl && (
        <QRCode value={phoneUrl} size={220} title="QR-Code für Upload-Link" />
      )}
      <p className="mt-4">
        Oder öffne auf deinem Handy diesen Link:
        <br />
        {phoneUrl && (
          <a
            href={phoneUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            {phoneUrl}
          </a>
        )}
      </p>

      <div className="mt-6">
        {uploadStatus === 'pending' && <p>Warte auf Upload vom Handy...</p>}
        {uploadStatus === 'uploaded' && uploadedImageUrl && (
          <>
            <p className="text-green-600 font-semibold">Upload erfolgreich!</p>
            <Image
              src={uploadedImageUrl}
              alt="Hochgeladenes Bild"
              width={320} // Corresponds to max-w-xs (assuming 1rem = 16px, xs = 20rem = 320px)
              height={240} // Adjust height as needed, or use layout="responsive" if parent has dimensions
              className="mx-auto mt-2 rounded"
              objectFit="contain"
            />
          </>
        )}
        {uploadStatus === 'error' && <p className="text-red-600">Fehler beim Upload!</p>}
      </div>
    </div>
  );
}
