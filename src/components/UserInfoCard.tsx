import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User as FiUser, ArrowRight, Star, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { userPresence } from '@/lib/userPresence';

interface UserInfoCardProps {
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  userRole: 'customer' | 'provider';
  className?: string;
}

interface UserPresence {
  isOnline: boolean;
  lastSeen: any; // Can be Firebase Timestamp, Date, string, or number
  status: string;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  userId,
  userName,
  userAvatarUrl,
  userRole,
  className,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [lastSeen, setLastSeen] = useState<any>(null);
  const [status, setStatus] = useState<string>('offline');

  // A company/provider might have a public-facing profile, a customer usually does not.
  const profileLink = userRole === 'provider' ? `/profile/${userId}` : null;
  const roleDisplay = userRole === 'customer' ? 'Kunde' : 'Anbieter';

  // Online Status Tracking
  useEffect(() => {
    if (!userId) return;

    // Initialisiere Presence Listening
    const unsubscribe = userPresence.getUserPresence(userId, presence => {
      if (presence) {
        setIsOnline(presence.isOnline);
        setLastSeen(presence.lastSeen);
        setStatus(presence.status || 'offline');
      } else {
        setIsOnline(false);
        setLastSeen(null);
        setStatus('offline');
      }
    });

    // Cleanup function
    return unsubscribe;
  }, [userId]);

  // Helper-Funktion für "Zuletzt gesehen" Text mit robuster Date-Behandlung
  const getLastSeenText = (lastSeen: any, isOnline: boolean) => {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';

    try {
      const now = new Date();
      let lastSeenDate: Date;

      // Firebase Timestamp Objekt erkennen und konvertieren
      if (lastSeen && typeof lastSeen === 'object' && lastSeen.toDate) {
        lastSeenDate = lastSeen.toDate();
      } else if (lastSeen && typeof lastSeen === 'object' && typeof lastSeen.seconds === 'number') {
        // Firebase server timestamp format
        lastSeenDate = new Date(lastSeen.seconds * 1000);
      } else if (typeof lastSeen === 'string') {
        lastSeenDate = new Date(lastSeen);
      } else if (lastSeen instanceof Date) {
        lastSeenDate = lastSeen;
      } else if (typeof lastSeen === 'number') {
        lastSeenDate = new Date(lastSeen);
      } else {
        console.warn('Unknown lastSeen format:', lastSeen);
        return 'Offline';
      }

      // Validiere das resultierende Date-Objekt
      if (isNaN(lastSeenDate.getTime())) {
        console.warn('Invalid date created from lastSeen:', lastSeen);
        return 'Offline';
      }

      const diffMs = now.getTime() - lastSeenDate.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 5) return 'Gerade online gewesen';
      if (diffMinutes < 60) return `vor ${diffMinutes} Min. online`;
      if (diffHours < 24) return `vor ${diffHours}h online`;
      if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''} online`;
      return 'Lange nicht online';
    } catch (error) {
      console.error('Error in getLastSeenText:', error, 'lastSeen:', lastSeen);
      return 'Offline';
    }
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200',
        'max-w-sm mx-auto',
        className
      )}
    >
      {/* Header mit Avatar und Info */}
      <div className="flex items-center gap-4 mb-4">
        {/* Avatar */}
        <div className="relative">
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt={`Profilbild von ${userName}`}
              width={60}
              height={60}
              className="rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="w-15 h-15 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center ring-2 ring-gray-100">
              <FiUser size={28} className="text-gray-500" />
            </div>
          )}

          {/* Online-Status Indicator */}
          <div
            className={cn(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center',
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            )}
          >
            <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-white' : 'bg-gray-200')} />
          </div>
        </div>

        {/* Benutzer Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">{userName}</h3>

          {/* Role und Bewertung */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                userRole === 'provider'
                  ? 'bg-[#14ad9f] bg-opacity-10 text-[#14ad9f]'
                  : 'bg-blue-100 text-blue-800'
              )}
            >
              {roleDisplay}
            </span>
            {userRole === 'provider' && (
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">4.8</span>
              </div>
            )}
          </div>

          {/* Online-Status Text */}
          <div className="flex items-center gap-1">
            <Circle
              size={8}
              className={cn('fill-current', isOnline ? 'text-green-500' : 'text-gray-400')}
            />
            <span
              className={cn('text-xs', isOnline ? 'text-green-600 font-medium' : 'text-gray-500')}
            >
              {getLastSeenText(lastSeen, isOnline)}
            </span>
          </div>
        </div>
      </div>

      {/* Profil Link für Provider */}
      {profileLink && (
        <Link
          href={profileLink}
          className="group w-full bg-[#14ad9f] hover:bg-[#129488] text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
        >
          <span>Profil anzeigen</span>
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform duration-200"
          />
        </Link>
      )}

      {/* Alternative für Kunden */}
      {!profileLink && (
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <span className="text-sm text-gray-600">Auftraggeber</span>
        </div>
      )}
    </div>
  );
};

export default UserInfoCard;
