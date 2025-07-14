// src/components/CustomerInfoCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User as FiUser } from 'lucide-react';

interface CustomerInfoCardProps {
  customerName: string;
  customerId: string;
  customerAvatarUrl?: string;
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customerName,
  customerId,
  customerAvatarUrl,
}) => {
  return (
    <div className="col-span-full md:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col items-center text-center">
      <Image
        src={customerAvatarUrl || '/default-avatar.png'}
        alt={`Profilbild von ${customerName}`}
        width={80}
        height={80}
        className="rounded-full object-cover mb-3 border-2 border-white shadow-sm"
      />
      <h3 className="text-lg font-semibold text-gray-800">{customerName}</h3>
      <p className="text-sm text-gray-600 mb-3">Kunde</p>
      <Link
        href={`/dashboard/user/${customerId}/profile`} // Annahme: Es gibt eine Kundenprofilseite
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#14ad9f] hover:bg-[#129a8f] transition-colors"
      >
        <FiUser className="mr-2" /> Kundenprofil ansehen
      </Link>
    </div>
  );
};

export default CustomerInfoCard;
