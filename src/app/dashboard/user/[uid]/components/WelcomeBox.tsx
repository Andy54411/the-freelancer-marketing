// src/app/dashboard/user/[uid]/components/WelcomeBox.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { FiUser, FiEdit2 } from 'react-icons/fi';

interface WelcomeBoxProps {
  firstname: string;
  profilePictureUrl?: string | null;
  onProfilePictureClick: () => void;
}

export const WelcomeBox: React.FC<WelcomeBoxProps> = ({
  firstname,
  profilePictureUrl,
  onProfilePictureClick,
}) => {
  return (
    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-lg shadow-lg flex items-center justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Hallo, {firstname || 'Benutzer'}!</h1>
        <p className="mt-1 text-lg opacity-90">Willkommen zurück in deinem Dashboard.</p>
      </div>
      <div className="relative group cursor-pointer" onClick={onProfilePictureClick}>
        {profilePictureUrl ? (
          <Image
            src={profilePictureUrl}
            alt="Profilbild"
            width={80}
            height={80}
            className="rounded-full object-cover border-4 border-white/50 group-hover:border-white transition-all"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center border-4 border-white/50 group-hover:border-white transition-all">
            <FiUser className="w-10 h-10 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <FiEdit2 className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};
