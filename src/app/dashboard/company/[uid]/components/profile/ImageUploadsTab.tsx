'use client';

import React from 'react';
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
      {/* Persönliches Profilbild */}
      <ProfileImageUpload profile={profile} setProfile={setProfile} />

      {/* Firmen-Logo */}
      <LogoUpload profile={profile} setProfile={setProfile} />

      {/* Tipps für bessere Bilder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📸 Tipps für professionelle Bilder</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • <strong>Profilbild:</strong> Verwenden Sie ein aktuelles, professionelles Foto von
            sich
          </li>
          <li>
            • <strong>Logo:</strong> Hochauflösendes Firmen-Logo mit transparentem Hintergrund
            (PNG/SVG)
          </li>
          <li>
            • <strong>Beleuchtung:</strong> Gute Beleuchtung macht einen großen Unterschied
          </li>
          <li>
            • <strong>Hintergrund:</strong> Neutrale, nicht ablenkende Hintergründe verwenden
          </li>
          <li>
            • <strong>Qualität:</strong> Scharfe, hochauflösende Bilder für professionellen Eindruck
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUploadsTab;
