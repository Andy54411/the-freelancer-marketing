'use client';

import React, { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/clients';
import { FiUploadCloud, FiLoader } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Modal from './Modal'; // Re-using the generic Modal component

interface ProfilePictureUploadModalProps {
  currentUser: User;
  onClose: () => void;
  onSuccess: (newUrl: string) => void;
}

const ProfilePictureUploadModal: React.FC<ProfilePictureUploadModalProps> = ({
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreview(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !currentUser) return;

    setUploading(true);
    const toastId = toast.loading('Lade Profilbild hoch...');

    try {
      // Use a more specific and unique file name
      const fileName = `profile_picture_${Date.now()}`;
      const fileRef = storageRef(storage, `profilePictures/${currentUser.uid}/${fileName}`);

      // Upload file
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      // Update Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        profilePictureURL: downloadURL,
        profilePictureFirebaseUrl: downloadURL,
      });

      toast.success('Profilbild erfolgreich aktualisiert!', { id: toastId });
      onSuccess(downloadURL);
      onClose();
    } catch {
      toast.error('Fehler beim Hochladen des Bildes.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title="Profilbild hochladen" onClose={onClose}>
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400'}`}
        >
          <input {...getInputProps()} />
          <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? 'Bild hier ablegen...'
              : 'Bild hierher ziehen oder klicken, um es auszuwählen.'}
          </p>
        </div>

        {preview && (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 mb-2">Vorschau:</p>
            <Image
              src={preview}
              alt="Profilbild Vorschau"
              width={128}
              height={128}
              className="rounded-full object-cover mx-auto border-4 border-white shadow-md"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Abbrechen
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Wird hochgeladen...
              </>
            ) : (
              'Hochladen & Speichern'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfilePictureUploadModal;
