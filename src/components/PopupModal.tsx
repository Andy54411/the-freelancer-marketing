'use client';

import Image from 'next/image'; // Import next/image
import React, { useState, useEffect } from "react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/firebase/clients"; // Importiere auth von hier
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import QRCode from "react-qr-code"; // Verwende 'react-qr-code'

interface PopupWithUploadProps {
  missingFields: string[];
  onClose: () => void;
  // disableClose?: boolean; // Marked as unused
}

export default function PopupWithUpload({ missingFields, onClose }: PopupWithUploadProps) {
  const [identityFrontUrl, setIdentityFrontUrl] = useState<string | null>(null);
  const [identityBackUrl, setIdentityBackUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [showQRCode, setShowQRCode] = useState(false); // Zustand für QR-Code
  const [identityFrontPreview, setIdentityFrontPreview] = useState<string | null>(null); // Vorschau Vorderseite
  const [identityBackPreview, setIdentityBackPreview] = useState<string | null>(null); // Vorschau Rückseite

  const user = auth.currentUser;
  const uid = user?.uid || "";

  useEffect(() => {
    if (!uid) return;

    const fetchUserDocs = async () => {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setIdentityFrontUrl(data.step3?.identityFrontUrl || null);
        setIdentityBackUrl(data.step3?.identityBackUrl || null);

        // Wenn beide Ausweisdokumente fehlen, dann QR Code anzeigen
        if (!data.step3?.identityFrontUrl || !data.step3?.identityBackUrl) {
          setShowQRCode(true);
        }
      }
    };
    fetchUserDocs();
  }, [uid]);

  const handleFileUpload = async (file: File, side: "front" | "back") => {
    if (!uid) return;

    setUploadError(null);
    setUploadSuccess(false);

    try {
      const storage = getStorage();
      const fileRef = ref(storage, `identityDocs/${uid}/${side}.jpg`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      await uploadTask;
      const url = await getDownloadURL(fileRef);

      const userDocRef = doc(db, "users", uid);
      await updateDoc(userDocRef, {
        [`step3.identity${side === "front" ? "FrontUrl" : "BackUrl"}`]: url,
      });

      if (side === "front") setIdentityFrontUrl(url);
      else setIdentityBackUrl(url);

      setUploadSuccess(true);
    } catch (error: unknown) {
      let errorMessage = `Fehler beim Hochladen der ${side === "front" ? "Vorderseite" : "Rückseite"}.`;
      if (error instanceof Error) {
        errorMessage = `Fehler beim Hochladen der ${side === "front" ? "Vorderseite" : "Rückseite"}: ${error.message}`;
      }
      setUploadError(errorMessage);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Zeige die Vorschau des Bildes, bevor es hochgeladen wird
    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === "front") {
        setIdentityFrontPreview(reader.result as string); // Setze die Vorschau für die Vorderseite
      } else {
        setIdentityBackPreview(reader.result as string); // Setze die Vorschau für die Rückseite
      }
    };
    reader.readAsDataURL(file);

    // Starte den Upload-Prozess
    handleFileUpload(file, side);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-xl w-full shadow-lg overflow-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold mb-4">Bitte vervollständige dein Profil</h2>
        <p className="mb-4 text-[#14ad9f] font-medium">Folgende Bereiche fehlen:</p>
        <ul className="list-disc list-inside mb-4">
          {missingFields.map((field) => (
            <li key={field} className="text-red-600">{field}</li>
          ))}
        </ul>

        {/* QR-Code nur anzeigen, wenn Ausweisdokumente fehlen */}
        {showQRCode && (
          <div className="mb-4 flex justify-center items-center">
            <div className="flex flex-col items-center justify-center p-4">
              <p className="text-center text-lg font-semibold mb-4">Scannen Sie den QR-Code, um Dateien hochzuladen</p>
              {/* @ts-ignore */}
              <QRCode
                value={`${window.location.origin}/upload-from-phone?sessionId=${uid}`}
                size={220}
              />
            </div>
          </div>
        )}

        {/* Vorschau für Ausweis Vorderseite */}
        {identityFrontPreview ? (
          <div className="mb-4">
            <p className="text-green-700 mb-2">Vorschau Vorderseite:</p>
            <Image
              src={identityFrontPreview}
              alt="Vorderseite Vorschau"
              width={320} // Corresponds to max-w-xs
              height={180} // Example height, adjust as needed
              className="max-w-xs rounded mb-4"
              style={{ objectFit: "contain" }} />
          </div>
        ) : (
          !identityFrontUrl && (
            <div className="mb-4">
              <label htmlFor="identity-front-upload" className="block mb-2 font-semibold">
                Ausweis Vorderseite hochladen
              </label>
              <input
                id="identity-front-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "front")}
                className="border p-2 rounded w-full"
              />
            </div>
          )
        )}

        {/* Vorschau für Ausweis Rückseite */}
        {identityBackPreview ? (
          <div className="mb-4">
            <p className="text-green-700 mb-2">Vorschau Rückseite:</p>
            <Image
              src={identityBackPreview}
              alt="Rückseite Vorschau"
              width={320} // Corresponds to max-w-xs
              height={180} // Example height, adjust as needed
              className="max-w-xs rounded mb-4"
              style={{ objectFit: "contain" }} />
          </div>
        ) : (
          !identityBackUrl && (
            <div className="mb-4">
              <label htmlFor="identity-back-upload" className="block mb-2 font-semibold">
                Ausweis Rückseite hochladen
              </label>
              <input
                id="identity-back-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "back")}
                className="border p-2 rounded w-full"
              />
            </div>
          )
        )}

        {uploadError && (
          <p className="text-red-600 flex items-center gap-2 mb-4">
            <FiAlertCircle /> {uploadError}
          </p>
        )}
        {uploadSuccess && (
          <p className="text-green-600 flex items-center gap-2 mb-4">
            <FiCheckCircle /> Upload erfolgreich!
          </p>
        )}

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#14ad9f] text-white hover:bg-teal-700"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
