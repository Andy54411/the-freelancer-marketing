'use client';

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
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
      const storage = getStorage();
      const storageReference = storageRef(
        storage,
        `profilePictures/${profile.uid}/${Date.now()}_${file.name}`
      );

      // Löschen des alten Profilbilds falls vorhanden
      if (
        profile.photoURL &&
        profile.photoURL !== '/default-avatar.png' &&
        profile.photoURL.includes('firebase')
      ) {
        try {
          const oldImageRef = storageRef(storage, profile.photoURL);
          await deleteObject(oldImageRef);
        } catch (error) {

        }
      }

      const uploadTask = uploadBytesResumable(storageReference, file);

      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        error => {

          toast.error('Fehler beim Upload des Profilbilds');
          setIsUploadingProfileImage(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Update Profile State
            setProfile(prev => (prev ? { ...prev, photoURL: downloadURL } : null));

            // Update in Firestore
            const userRef = doc(db, 'users', profile.uid);
            await updateDoc(userRef, {
              profilePictureURL: downloadURL,
              photoURL: downloadURL,
            });

            toast.success('Profilbild erfolgreich hochgeladen!');
            setIsUploadingProfileImage(false);
            setUploadProgress(0);
          } catch (error) {

            toast.error('Fehler beim Speichern des Profilbilds');
            setIsUploadingProfileImage(false);
          }
        }
      );
    } catch (error) {

      toast.error('Fehler beim Upload');
      setIsUploadingProfileImage(false);
    }
  };

  const handleProfileImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleProfileImageUpload(file);
    }
  };

  const removeProfileImage = async () => {
    if (!profile) return;

    try {
      // Update Profile State
      setProfile(prev => (prev ? { ...prev, photoURL: '/default-avatar.png' } : null));

      // Update in Firestore
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        profilePictureURL: '/default-avatar.png',
        photoURL: '/default-avatar.png',
      });

      toast.success('Profilbild entfernt');
    } catch (error) {

      toast.error('Fehler beim Entfernen des Profilbilds');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-4">Profilbild</label>
      <div className="flex items-center gap-6">
        {/* Aktuelles Profilbild */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
            {profile.photoURL && profile.photoURL !== '/default-avatar.png' ? (
              <Image
                src={profile.photoURL}
                alt="Profilbild"
                width={96}
                height={96}
                className="w-24 h-24 object-cover"
              />
            ) : (
              <FiUser size={32} className="text-gray-400" />
            )}
          </div>
          {isUploadingProfileImage && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="text-white text-xs font-medium">{Math.round(uploadProgress)}%</div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <div className="flex gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] cursor-pointer transition-colors disabled:opacity-50">
              {isUploadingProfileImage ? (
                <FiLoader className="animate-spin" size={16} />
              ) : (
                <FiCamera size={16} />
              )}
              <span>{isUploadingProfileImage ? 'Wird hochgeladen...' : 'Neues Bild wählen'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageSelect}
                disabled={isUploadingProfileImage}
                className="hidden"
              />
            </label>

            {profile.photoURL && profile.photoURL !== '/default-avatar.png' && (
              <button
                onClick={removeProfileImage}
                disabled={isUploadingProfileImage}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <FiTrash2 size={16} />
                Entfernen
              </button>
            )}
          </div>

          {isUploadingProfileImage && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#14ad9f] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Empfohlen: Quadratisches Bild, mindestens 400x400px, max. 5MB
            <br />
            Unterstützte Formate: JPG, PNG, WebP
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageUpload;
