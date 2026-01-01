'use client';

import React from 'react';
import { Info, Camera } from 'lucide-react';
import { EditableCompanyProfile } from './types';
import LogoUpload from './LogoUpload';
import ProfileImageUpload from './ProfileImageUpload-New';

interface ImageUploadsTabProps {
  profile: EditableCompanyProfile;
  setProfile: React.Dispatch<React.SetStateAction<EditableCompanyProfile | null>>;
}

const ImageUploadsTab: React.FC<ImageUploadsTabProps> = ({ profile, setProfile }) => {
  return (
    <div className="space-y-8">
      {/* Header mit Tooltip */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-100 rounded-lg">
          <Camera className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bilder & Logo</h3>
          <p className="text-sm text-gray-600">Laden Sie Ihr Profilbild und Firmen-Logo hoch</p>
        </div>
        
        {/* Tooltip mit Tipps */}
        <div className="relative group ml-auto">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50"
            aria-label="Bild-Tipps anzeigen"
          >
            <Info className="w-5 h-5" />
          </button>
          <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="absolute -top-1.5 right-4 w-3 h-3 bg-gray-900 rotate-45" />
            <p className="font-medium mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-teal-400" />
              Tipps für professionelle Bilder
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">-</span>
                <span><strong className="text-white">Profilbild:</strong> Aktuelles, professionelles Foto von sich</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">-</span>
                <span><strong className="text-white">Logo:</strong> Hochauflösend mit transparentem Hintergrund (PNG/SVG)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">-</span>
                <span><strong className="text-white">Beleuchtung:</strong> Gute Beleuchtung macht einen großen Unterschied</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">-</span>
                <span><strong className="text-white">Hintergrund:</strong> Neutrale, nicht ablenkende Hintergründe</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-400 mt-0.5">-</span>
                <span><strong className="text-white">Qualität:</strong> Scharfe, hochauflösende Bilder</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Persönliches Profilbild */}
      <ProfileImageUpload profile={profile} setProfile={setProfile} />

      {/* Firmen-Logo */}
      <LogoUpload profile={profile} setProfile={setProfile} />
    </div>
  );
};

export default ImageUploadsTab;
