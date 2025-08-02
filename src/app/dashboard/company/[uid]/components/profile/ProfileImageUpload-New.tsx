'use client';

import React, { useState } from 'react';
import { storage } from '@/firebase/clients';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FiCamera, FiLoader, FiTrash2, FiUser } from 'react-icons/fi';
import { toast } from 'sonner';
import Image from 'next/image';
import { EditableCompanyProfile } from './types';

interface ProfileImageUploadProps {
  profile: EditableCompanyProfile;
  setProfile: React.Dispatch<React.SetStateAction<EditableCompanyProfile | null>>;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ profile, setProfile }) => {
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleProfileImageUpload = async (file: File) => {
    if (!file || !profile) return;

    // Validierung der Datei
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur JPG, PNG und WebP Dateien sind erlaubt');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Datei zu groß. Maximum 5MB erlaubt');
      return;
    }

    setIsUploadingProfileImage(true);
    setUploadProgress(0);

    try {
      // Lösche das alte Profilbild falls vorhanden
      if (profile.photoURL && !profile.photoURL.includes('default-avatar')) {
        try {
          const oldImageRef = ref(storage, profile.photoURL);
          await deleteObject(oldImageRef);
        } catch (error) {
          console.warn('Altes Profilbild konnte nicht gelöscht werden:', error);
        }
      }

      // Upload des neuen Profilbilds
      const profileImageRef = ref(
        storage,
        `profile-images/${profile.uid}/${Date.now()}_${file.name}`
      );
      const uploadTask = uploadBytesResumable(profileImageRef, file);

      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        error => {
          console.error('Profilbild-Upload Fehler:', error);
          toast.error('Fehler beim Upload des Profilbilds');
          setIsUploadingProfileImage(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            setProfile(prev => (prev ? { ...prev, photoURL: downloadURL } : null));

            toast.success('Profilbild erfolgreich hochgeladen!');
          } catch (error) {
            console.error('Fehler beim Abrufen der Profilbild-URL:', error);
            toast.error('Fehler beim Speichern des Profilbilds');
          } finally {
            setIsUploadingProfileImage(false);
            setUploadProgress(0);
          }
        }
      );
    } catch (error) {
      console.error('Profilbild-Upload Fehler:', error);
      toast.error('Fehler beim Profilbild-Upload');
      setIsUploadingProfileImage(false);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!profile?.photoURL || profile.photoURL.includes('default-avatar')) return;

    try {
      const imageRef = ref(storage, profile.photoURL);
      await deleteObject(imageRef);

      setProfile(prev => (prev ? { ...prev, photoURL: '' } : null));

      toast.success('Profilbild entfernt');
    } catch (error) {
      console.error('Fehler beim Löschen des Profilbilds:', error);
      toast.error('Fehler beim Löschen des Profilbilds');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <FiUser className="w-5 h-5 mr-2 text-[#14ad9f]" />
        Persönliches Profilbild
      </h3>

      <div className="flex items-center space-x-6">
        {/* Profilbild Preview */}
        <div className="relative">
          {profile.photoURL ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-300">
              <Image
                src={profile.photoURL}
                alt="Profilbild"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <FiUser className="w-10 h-10 text-gray-400" />
            </div>
          )}

          {isUploadingProfileImage && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="text-center text-white">
                <FiLoader className="w-6 h-6 animate-spin mx-auto mb-2" />
                <div className="text-xs">{Math.round(uploadProgress)}%</div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-3">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleProfileImageUpload(file);
              }}
              className="hidden"
              id="profile-image-upload"
              disabled={isUploadingProfileImage}
            />
            <label
              htmlFor="profile-image-upload"
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium cursor-pointer transition-colors ${
                isUploadingProfileImage
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiCamera className="w-4 h-4 mr-2" />
              {isUploadingProfileImage ? 'Wird hochgeladen...' : 'Profilbild hochladen'}
            </label>
          </div>

          {profile.photoURL && !isUploadingProfileImage && (
            <button
              onClick={handleRemoveProfileImage}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              <FiTrash2 className="w-4 h-4 mr-1" />
              Profilbild entfernen
            </button>
          )}

          <div className="text-xs text-gray-500">
            Empfohlene Größe: 400x400px, max. 5MB
            <br />
            Unterstützte Formate: JPG, PNG, WebP
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageUpload;
