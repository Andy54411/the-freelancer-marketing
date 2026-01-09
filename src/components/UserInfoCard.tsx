'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User as FiUser, ArrowRight, Star, Circle, MapPin, Globe, ShoppingCart, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface UserData {
  name?: string;
  avatarUrl?: string;
  profileImageUrl?: string;
  companyName?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profilePictureURL?: string;
  photoURL?: string;
  bannerUrl?: string;
  profileBannerImage?: string;
  step1?: any;
  step2?: any;
  step3?: any;
  step4?: any;
  step5?: any;
  skills?: string[];
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  [key: string]: any; // Für weitere dynamische Felder
}

interface CustomerStats {
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  region: string;
  languages: string[];
}

interface UserInfoCardProps {
  userId: string;
  userName: string; // Fallback nur
  userAvatarUrl?: string; // Fallback nur
  userRole?: 'provider' | 'customer';
  showReviews?: boolean;
  showSkills?: boolean;
  showLanguages?: boolean;
  showCustomerStats?: boolean;
  showLinkButton?: boolean;
  linkText?: string;
  linkHref?: string;
  isOnline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  showPresence?: boolean;
  className?: string;
  loading?: boolean;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  userId,
  userName: fallbackUserName,
  userAvatarUrl: fallbackAvatarUrl,
  userRole = 'customer',
  showReviews = false,
  showSkills = false,
  showLanguages = false,
  showCustomerStats = false,
  showLinkButton = false,
  linkText = 'Profil ansehen',
  linkHref,
  isOnline = false,
  size = 'md',
  layout = 'horizontal',
  showPresence = false,
  className = '',
  loading: initialLoading = false,
}) => {
  const [realUserName, setRealUserName] = useState<string>(fallbackUserName);
  const [realAvatarUrl, setRealAvatarUrl] = useState<string | null>(fallbackAvatarUrl || null);
  const [isOnlineStatus, setIsOnlineStatus] = useState<boolean>(isOnline);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [profileUrl, setProfileUrl] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [languages, setLanguages] = useState<Array<{ language: string; proficiency: string }>>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  // Lade Benutzerdaten mit Collection-Fallback
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId) return;

      setLoading(true);
      let userData: UserData | null = null;

      try {
        // 1. Zuerst in companies collection suchen
        const companyDocRef = doc(db, 'companies', userId);
        const companyDocSnap = await getDoc(companyDocRef);

        if (companyDocSnap.exists()) {
          userData = companyDocSnap.data() as UserData;
        } else {
          // 2. Fallback zu users collection
          const userDocRef = doc(db, 'users', userId);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            userData = userDocSnap.data() as UserData;
          }
        }

        if (userData) {
          // Prioritäre Namens-Auswahl basierend auf userRole
          let displayName = fallbackUserName;

          if (userRole === 'provider') {
            // Für Provider: companyName > displayName > name > firstName lastName
            displayName =
              userData.companyName ||
              userData.displayName ||
              userData.name ||
              (userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : '') ||
              fallbackUserName;
          } else {
            // Für Customer: displayName > name > firstName lastName > companyName
            displayName =
              userData.displayName ||
              userData.name ||
              (userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : '') ||
              userData.companyName ||
              fallbackUserName;
          }

          setRealUserName(displayName);

          // Avatar URL setzen - verschiedene Felder prüfen
          const avatarUrl =
            userData.profileImageUrl ||
            userData.profilePictureURL ||
            userData.step3?.profilePictureURL || // Profilbild aus step3
            userData.photoURL ||
            userData.avatarUrl ||
            userData.profileBannerImage ||
            userData.bannerUrl || // Für companies kann bannerUrl als Profilbild verwendet werden
            fallbackAvatarUrl;

          setRealAvatarUrl(avatarUrl || null);

          // Skills und Sprachen extrahieren
          if (userData.skills && Array.isArray(userData.skills)) {
            setSkills(userData.skills);
          }

          if (userData.languages && Array.isArray(userData.languages)) {
            setLanguages(userData.languages);
          }
        } else {
        }

        // 2. Lade Review-Daten für Provider
        if (userRole === 'provider') {
          const reviewsQuery = query(collection(db, `companies/${userId}/reviews`));
          const reviewsSnapshot = await getDocs(reviewsQuery);

          if (!reviewsSnapshot.empty) {
            const reviews = reviewsSnapshot.docs.map(doc => doc.data());
            const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
            const avgRating = totalRating / reviews.length;

            setReviewCount(reviews.length);
            setAverageRating(avgRating);
          }
        }

        // 3. Bestimme Profil-URL basierend auf Rolle
        if (userRole === 'provider') {
          setProfileUrl(`/profile/${userId}`);
        } else {
          // Kunden zur User-Profil-Seite verlinken
          setProfileUrl(`/user-profile/${userId}`);
        }

        // 4. Lade Kundenstatistiken wenn gewünscht
        if (userRole === 'customer' && showCustomerStats) {
          // Region und Sprachen aus userData
          const city = userData?.city || userData?.location?.city || userData?.step1?.city || '';
          const country = userData?.country || userData?.location?.country || '';
          const regionStr = [city, country].filter(Boolean).join(', ') || 'Nicht angegeben';
          
          let customerLanguages: string[] = [];
          if (userData?.languages && Array.isArray(userData.languages)) {
            customerLanguages = userData.languages.map((lang: { language?: string; name?: string } | string) =>
              typeof lang === 'string' ? lang : lang.language || lang.name || ''
            ).filter(Boolean);
          }
          if (customerLanguages.length === 0) {
            customerLanguages = ['Deutsch'];
          }

          // Aufträge laden
          const ordersQuery = query(
            collection(db, 'auftraege'),
            where('customerFirebaseUid', '==', userId)
          );
          const ordersSnapshot = await getDocs(ordersQuery);

          let totalOrders = 0;
          let completedOrders = 0;
          let totalValue = 0;

          ordersSnapshot.docs.forEach(orderDoc => {
            const order = orderDoc.data();
            totalOrders++;
            
            if (order.status === 'ABGESCHLOSSEN' || order.status === 'abgeschlossen' || order.status === 'completed') {
              completedOrders++;
            }

            const orderValue = order.totalAmountPaidByBuyer || order.totalPriceInCents || order.jobCalculatedPriceInCents || 0;
            totalValue += orderValue;
          });

          // Auch mit kundeId suchen (Legacy-Feld)
          const ordersQuery2 = query(
            collection(db, 'auftraege'),
            where('kundeId', '==', userId)
          );
          const ordersSnapshot2 = await getDocs(ordersQuery2);

          const existingIds = new Set(ordersSnapshot.docs.map(d => d.id));
          ordersSnapshot2.docs.forEach(orderDoc => {
            if (!existingIds.has(orderDoc.id)) {
              const order = orderDoc.data();
              totalOrders++;
              
              if (order.status === 'ABGESCHLOSSEN' || order.status === 'abgeschlossen' || order.status === 'completed') {
                completedOrders++;
              }

              const orderValue = order.totalAmountPaidByBuyer || order.totalPriceInCents || order.jobCalculatedPriceInCents || 0;
              totalValue += orderValue;
            }
          });

          const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders / 100 : 0;

          setCustomerStats({
            totalOrders,
            completedOrders,
            averageOrderValue,
            region: regionStr,
            languages: customerLanguages,
          });
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole, showCustomerStats]);

  // 4. Lade Online-Status (deaktiviert wegen fehlender API)
  useEffect(() => {
    if (showPresence && userId) {
      // TODO: userPresence API implementieren
      // const unsubscribe = userPresence.subscribeToUserStatus(userId, (status) => {
      //   setIsOnlineStatus(status.isOnline);
      // });
      // return () => unsubscribe();
      setIsOnlineStatus(isOnline);
    }
  }, [userId, showPresence, isOnline]);

  const sizeClasses = {
    sm: {
      avatar: 'w-12 h-12',
      container: 'p-3',
      text: 'text-xs',
      title: 'text-sm font-medium',
    },
    md: {
      avatar: 'w-16 h-16',
      container: 'p-4',
      text: 'text-sm',
      title: 'text-lg font-semibold',
    },
    lg: {
      avatar: 'w-20 h-20',
      container: 'p-6',
      text: 'text-base',
      title: 'text-xl font-bold',
    },
  };

  const currentSize = sizeClasses[size];

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white rounded-lg border border-gray-200 animate-pulse',
          currentSize.container,
          className
        )}
      >
        <div
          className={cn(
            'flex items-center',
            layout === 'vertical' ? 'flex-col space-y-3' : 'space-x-4'
          )}
        >
          <div className={cn('bg-gray-200 rounded-full', currentSize.avatar)} />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  const finalLinkHref = linkHref || profileUrl;

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow',
        currentSize.container,
        className
      )}
    >
      <div
        className={cn(
          'flex items-center',
          layout === 'vertical' ? 'flex-col space-y-3' : 'space-x-4'
        )}
      >
        {/* Avatar mit Online-Status */}
        <div className="relative">
          {realAvatarUrl ? (
            <Image
              src={realAvatarUrl}
              alt={realUserName}
              width={size === 'sm' ? 40 : size === 'md' ? 60 : 80}
              height={size === 'sm' ? 40 : size === 'md' ? 60 : 80}
              className={cn('rounded-full object-cover ring-2 ring-gray-100', currentSize.avatar)}
            />
          ) : (
            <div
              className={cn(
                'bg-linear-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center ring-2 ring-gray-100',
                currentSize.avatar
              )}
            >
              <FiUser
                size={size === 'sm' ? 20 : size === 'md' ? 28 : 36}
                className="text-gray-500"
              />
            </div>
          )}

          {showPresence && (
            <div className="absolute -bottom-0.5 -right-0.5">
              <Circle
                size={size === 'sm' ? 12 : 16}
                className={cn(
                  'fill-current border-2 border-white rounded-full',
                  isOnlineStatus ? 'text-green-500' : 'text-gray-400'
                )}
              />
            </div>
          )}
        </div>

        {/* Benutzer-Info */}
        <div className={cn('flex-1', layout === 'vertical' ? 'text-center' : '')}>
          <h3 className={cn('text-gray-900 truncate', currentSize.title)}>{realUserName}</h3>

          {showReviews && userRole === 'provider' && reviewCount > 0 && (
            <div className="flex items-center mt-1 space-x-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={size === 'sm' ? 12 : 14}
                    className={cn(
                      i < Math.floor(averageRating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
              <span className={cn('text-gray-600', currentSize.text)}>
                {averageRating.toFixed(1)} ({reviewCount})
              </span>
            </div>
          )}

          {showPresence && (
            <p
              className={cn(
                isOnlineStatus ? 'text-green-600' : 'text-gray-500',
                currentSize.text,
                'mt-1'
              )}
            >
              {isOnlineStatus ? 'Online' : 'Offline'}
            </p>
          )}

          {/* Skills anzeigen */}
          {showSkills && skills.length > 0 && (
            <div className="mt-2">
              <p className={cn('text-gray-600 text-xs mb-1')}>Skills:</p>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 3).map((skill, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 text-xs bg-[#14ad9f]/10 text-[#14ad9f] rounded-full"
                  >
                    {skill}
                  </span>
                ))}
                {skills.length > 3 && (
                  <span className="text-xs text-gray-500">+{skills.length - 3} weitere</span>
                )}
              </div>
            </div>
          )}

          {/* Sprachen anzeigen */}
          {showLanguages && languages.length > 0 && (
            <div className="mt-2">
              <p className={cn('text-gray-600 text-xs mb-1')}>Sprachen:</p>
              <div className="space-y-0.5">
                {languages.slice(0, 2).map((lang, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{lang.language}</span>
                    <span className="text-gray-500 text-xs">{lang.proficiency}</span>
                  </div>
                ))}
                {languages.length > 2 && (
                  <span className="text-xs text-gray-500">+{languages.length - 2} weitere</span>
                )}
              </div>
            </div>
          )}

          {/* Kundenstatistiken anzeigen */}
          {showCustomerStats && userRole === 'customer' && customerStats && (
            <div className="mt-3 space-y-2">
              {/* Region */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={14} className="text-gray-400" />
                <span>{customerStats.region}</span>
              </div>
              
              {/* Sprachen */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Globe size={14} className="text-gray-400" />
                <span>{customerStats.languages.join(', ')}</span>
              </div>

              {/* Statistiken Grid */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ShoppingCart size={12} className="text-teal-500" />
                    <span className="font-semibold text-gray-900">{customerStats.totalOrders}</span>
                  </div>
                  <span className="text-xs text-gray-500">Aufträge</span>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle size={12} className="text-green-500" />
                    <span className="font-semibold text-gray-900">{customerStats.completedOrders}</span>
                  </div>
                  <span className="text-xs text-gray-500">Abgeschl.</span>
                </div>
                
                <div className="text-center">
                  <span className="font-semibold text-gray-900 text-sm">
                    {customerStats.averageOrderValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-gray-500 block">Ø Wert</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Link-Button */}
        {showLinkButton && finalLinkHref && (
          <div className={cn(layout === 'vertical' ? 'w-full' : '')}>
            <Link
              href={finalLinkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-[#14ad9f] bg-[#14ad9f]/10 hover:bg-[#14ad9f]/20 rounded-md transition-colors"
            >
              {linkText}
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInfoCard;
