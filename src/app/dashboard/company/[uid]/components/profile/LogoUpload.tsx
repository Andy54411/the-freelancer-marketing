'use client';

import React, { useState } from 'react';
import { storage } from '@/firebase/clients';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FiUpload, FiLoader, FiTrash2, FiBriefcase } from 'react-icons/fi';
import { toast } from 'sonner';
import Image from 'next/image';
import { EditableCompanyProfile } from './types';

interface LogoUploadProps {
  profile: EditableCompanyProfile;
  setProfile: React.Dispatch<React.SetStateAction<EditableCompanyProfile | null>>;
}

const LogoUpload: React.FC<LogoUploadProps> = ({ profile, setProfile }) => {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleLogoUpload = async (file: File) => {
    if (!file || !profile) return;

    // Validierung der Datei
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur JPG, PNG, WebP und SVG Dateien sind erlaubt');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Datei zu groß. Maximum 5MB erlaubt');
      return;
    }

    setIsUploadingLogo(true);
    setUploadProgress(0);

    try {
      // Lösche das alte Logo falls vorhanden
      if (profile.companyLogo) {
        try {
          const oldLogoRef = ref(storage, profile.companyLogo);
          await deleteObject(oldLogoRef);
        } catch (error) {

        }
      }

      // Upload des neuen Logos
      const logoRef = ref(storage, `company-logos/${profile.uid}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(logoRef, file);

      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        error => {

          toast.error('Fehler beim Upload des Logos');
          setIsUploadingLogo(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            setProfile(prev => (prev ? { ...prev, companyLogo: downloadURL } : null));

            toast.success('Firmen-Logo erfolgreich hochgeladen!');
          } catch (error) {

            toast.error('Fehler beim Speichern des Logos');
          } finally {
            setIsUploadingLogo(false);
            setUploadProgress(0);
          }
        }
      );
    } catch (error) {

      toast.error('Fehler beim Logo-Upload');
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!profile?.companyLogo) return;

    try {
      const logoRef = ref(storage, profile.companyLogo);
      await deleteObject(logoRef);

      setProfile(prev => (prev ? { ...prev, companyLogo: '' } : null));

      toast.success('Firmen-Logo entfernt');
    } catch (error) {

      toast.error('Fehler beim Löschen des Logos');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <FiBriefcase className="w-5 h-5 mr-2 text-[#14ad9f]" />
        Firmen-Logo
      </h3>

      <div className="flex items-center space-x-6">
        {/* Logo Preview */}
        <div className="relative">
          {profile.companyLogo ? (
            <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300 bg-white p-2">
              <Image
                src={profile.companyLogo}
                alt="Firmen-Logo"
                width={88}
                height={88}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <FiBriefcase className="w-8 h-8 text-gray-400" />
            </div>
          )}

          {isUploadingLogo && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
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
                if (file) handleLogoUpload(file);
              }}
              className="hidden"
              id="logo-upload"
              disabled={isUploadingLogo}
            />
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium cursor-pointer transition-colors ${
                isUploadingLogo
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiUpload className="w-4 h-4 mr-2" />
              {isUploadingLogo ? 'Wird hochgeladen...' : 'Logo hochladen'}
            </label>
          </div>

          {profile.companyLogo && !isUploadingLogo && (
            <button
              onClick={handleRemoveLogo}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              <FiTrash2 className="w-4 h-4 mr-1" />
              Logo entfernen
            </button>
          )}

          <div className="text-xs text-gray-500">
            Empfohlene Größe: 200x200px, max. 5MB
            <br />
            Unterstützte Formate: JPG, PNG, WebP, SVG
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoUpload;
