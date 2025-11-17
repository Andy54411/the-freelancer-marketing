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
    <div className="bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl rounded-2xl p-6 flex items-center justify-between hover:shadow-3xl transition-all duration-300">
      <div className="flex-1">
        <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-[#14ad9f] to-teal-600 bg-clip-text text-transparent">
          Hallo, {firstname || 'Benutzer'}!
        </h1>
        <p className="mt-1 text-lg text-gray-700 font-medium">
          Willkommen zurück in deinem Dashboard.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Verwalten Sie Ihre Aufträge und entdecken Sie neue Services.
        </p>
      </div>
      <div className="relative group cursor-pointer ml-6" onClick={onProfilePictureClick}>
        {profilePictureUrl ? (
          <Image
            src={profilePictureUrl}
            alt="Profilbild"
            width={70}
            height={70}
            className="rounded-full object-cover border-3 border-gradient-to-r from-[#14ad9f] to-teal-600 group-hover:scale-105 transition-all duration-300 shadow-lg"
          />
        ) : (
          <div className="w-[70px] h-[70px] rounded-full bg-linear-to-r from-[#14ad9f] to-teal-600 flex items-center justify-center group-hover:scale-105 transition-all duration-300 shadow-lg">
            <FiUser className="w-8 h-8 text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <FiEdit2 className="w-4 h-4 text-white" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-linear-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
          <FiEdit2 className="w-2.5 h-2.5 text-white" />
        </div>
      </div>
    </div>
  );
};
