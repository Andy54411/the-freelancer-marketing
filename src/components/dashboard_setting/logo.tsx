'use client';

import React, { useEffect, useState } from 'react';
import {
  getStorage,
  ref,
  listAll,
  deleteObject,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/clients';
import { FiUpload, FiTrash2, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { UserDataForSettings } from '@/components/dashboard/SettingsComponent';
import { getAuth } from 'firebase/auth';

// ANPASSUNG: 'export' wurde hinzugefügt
export interface LogoFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string) => void;
}

const LogoForm: React.FC<LogoFormProps> = ({ formData, handleChange }) => {
  // DEBUGGING: console.log für initiale fileUrl

  const [fileUrl, setFileUrl] = useState<string | null>(formData?.step3?.profilePictureURL || null);
  // DEBUGGING: console.log für initialen projectImages (kann leer sein)

  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  const auth = getAuth();
  const user = auth.currentUser;
  const uid = user?.uid || '';

  useEffect(() => {
    if (!uid) return;
    const fetchProjectImagesFromFirestore = async () => {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        // DEBUGGING: console.log für projectImages aus Firestore

        setProjectImages(userData.projectImages || []);
      }
    };
    fetchProjectImagesFromFirestore();
  }, [uid]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uid) return;

    setUploadError(null);
    setUploadSuccess(false);

    const storageInstance = getStorage();
    const folderRef = ref(storageInstance, `profilePictures/${uid}`);

    try {
      const list = await listAll(folderRef);
      await Promise.all(list.items.map(item => deleteObject(item)));

      const fileRef = ref(storageInstance, `profilePictures/${uid}/profilePicture.jpg`);
      await uploadBytesResumable(fileRef, file);
      const url = await getDownloadURL(fileRef); // Dies sollte die korrekte Firebase Storage URL sein

      // DEBUGGING: console.log für URL nach Logo-Upload

      await updateDoc(doc(db, 'users', uid), {
        profilePictureURL: url,
        profilePictureFirebaseUrl: url, // Sicherstellen, dass dies auch aktualisiert wird
        'step3.profilePictureURL': url, // Sicherstellen, dass step3 auch aktualisiert wird
      });

      setFileUrl(url);
      handleChange('step3.profilePictureURL', url);
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', { detail: url }));
      setUploadSuccess(true);
    } catch (err: unknown) {

      let errorMessage = 'Fehler beim Hochladen des Logos.';
      if (err instanceof Error) {
        errorMessage = `Fehler beim Hochladen des Logos: ${err.message}`;
      }
      setUploadError(errorMessage);
    }
  };

  const handleProjectUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !uid) return;

    setUploadError(null);
    setUploadSuccess(false);

    // Validierung der Dateitypen
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = Array.from(files).filter(file => !allowedTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(file => file.name).join(', ');
      setUploadError(
        `Nicht unterstützte Dateitypen: ${invalidFileNames}. Nur JPEG, PNG, WebP und GIF sind erlaubt.`
      );
      return;
    }

    const storageInstance = getStorage();
    const folderRef = ref(storageInstance, `projectImages/${uid}`);

    try {
      const currentList = await listAll(folderRef);
      if (currentList.items.length + files.length > 5) {
        setUploadError('Maximal 5 Projektbilder erlaubt.');
        return;
      }

      setUploading(true);
      const uploads = Array.from(files).map(file => {
        const fileRef = ref(storageInstance, `projectImages/${uid}/${file.name}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        return new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            snapshot => {
              const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(Math.round(percent));
            },
            error => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref); // Dies sollte die korrekte Firebase Storage URL sein
              // DEBUGGING: console.log für einzelne Projektbild-URL

              resolve(url);
            }
          );
        });
      });

      const uploadedUrls = await Promise.all(uploads);
      const newProjectImagesUrls = [...projectImages, ...uploadedUrls];

      // DEBUGGING: console.log für alle Projektbild-URLs, die in Firestore gespeichert werden

      await updateDoc(doc(db, 'users', uid), {
        projectImages: newProjectImagesUrls,
      });

      setProjectImages(newProjectImagesUrls);
      setUploadSuccess(true);
    } catch (err: unknown) {

      let errorMessage = 'Fehler beim Hochladen von Projektbildern.';
      if (err instanceof Error) {
        errorMessage = `Fehler beim Hochladen von Projektbildern: ${err.message}`;
      }
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (url: string) => {
    if (!uid) return;
    setUploadError(null);
    setUploadSuccess(false);

    const storageInstance = getStorage();
    try {
      const path = new URL(url).pathname.split('/o/')[1].split('?')[0];
      const decodedPath = decodeURIComponent(path);
      const fileRef = ref(storageInstance, decodedPath);
      await deleteObject(fileRef);

      const updatedProjectImages = projectImages.filter(item => item !== url);

      // DEBUGGING: console.log für aktualisierte Projektbild-URLs nach dem Löschen

      await updateDoc(doc(db, 'users', uid), {
        projectImages: updatedProjectImages,
      });

      setProjectImages(updatedProjectImages);
      setUploadSuccess(true);
    } catch (err: unknown) {

      let errorMessage = 'Fehler beim Löschen des Bildes.';
      if (err instanceof Error) {
        errorMessage = `Fehler beim Löschen des Bildes: ${err.message}`;
      }
      setUploadError(errorMessage);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 space-y-6">
      {uploadError && (
        <p className="text-red-500 flex items-center gap-2">
          <FiAlertCircle /> {uploadError}
        </p>
      )}
      {uploadSuccess && (
        <p className="text-green-500 flex items-center gap-2">
          <FiCheckCircle /> Aktionen erfolgreich ausgeführt!
        </p>
      )}

      <div>
        <Label
          htmlFor="logo-upload"
          className="block mb-2 font-medium text-gray-900 dark:text-gray-200"
        >
          Logo hochladen
        </Label>
        <Input
          id="logo-upload"
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="w-full p-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
        {fileUrl && (
          <div className="mt-4">
            <img 
              src={fileUrl} 
              alt="Logo Preview" 
              className="max-w-xs max-h-32 object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoForm;
