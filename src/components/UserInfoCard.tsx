import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User as FiUser } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserInfoCardProps {
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  userRole: 'Kunde' | 'Anbieter';
  className?: string;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  userId,
  userName,
  userAvatarUrl,
  userRole,
  className,
}) => {
  // A company/provider might have a public-facing profile, a customer usually does not.
  const profileLink = userRole === 'Anbieter' ? `/dashboard/company/${userId}` : null;

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-gray-50 rounded-md', className)}>
      {userAvatarUrl ? (
        <Image
          src={userAvatarUrl}
          alt={`${userName} Avatar`}
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <FiUser size={24} className="text-gray-500" />
        </div>
      )}
      <div>
        <p className="font-semibold text-gray-800">{userName}</p>
        <p className="text-sm text-gray-600">{userRole}</p>
        {profileLink && (
          <Link href={profileLink} className="text-[#14ad9f] text-sm hover:underline mt-1 block">
            Profil anzeigen
          </Link>
        )}
      </div>
    </div>
  );
};

export default UserInfoCard;
