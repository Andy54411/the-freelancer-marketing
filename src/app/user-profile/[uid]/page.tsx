'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  User,
  MapPin,
  Globe,
  ShoppingCart,
  CheckCircle,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserStats {
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  memberSince: string;
}

interface UserProfileData {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  city: string;
  country: string;
  region: string;
  languages: string[];
  createdAt: Date | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = typeof params?.uid === 'string' ? params.uid : '';

  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!userId) {
        setError('Keine User-ID angegeben');
        setLoading(false);
        return;
      }

      try {
        // 1. User-Daten laden
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
          setError('Benutzer nicht gefunden');
          setLoading(false);
          return;
        }

        const data = userDoc.data();
        
        // Namen extrahieren
        const displayName = data.displayName || 
          (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : '') ||
          data.name ||
          'Unbekannter Benutzer';

        // Sprachen extrahieren
        let languages: string[] = [];
        if (data.languages && Array.isArray(data.languages)) {
          languages = data.languages.map((lang: string | { language?: string; name?: string }) => 
            typeof lang === 'string' ? lang : lang.language || lang.name || ''
          ).filter(Boolean);
        }
        if (languages.length === 0) {
          languages = ['Deutsch']; // Standard
        }

        // Region/Stadt extrahieren
        const city = data.city || data.location?.city || data.step1?.city || '';
        const country = data.country || data.location?.country || 'Deutschland';
        const region = data.region || data.state || data.location?.region || '';

        // Erstellungsdatum
        let createdAt: Date | null = null;
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (typeof data.createdAt === 'string') {
            createdAt = new Date(data.createdAt);
          }
        }

        setUserData({
          displayName,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          avatarUrl: data.profilePictureURL || data.photoURL || data.avatarUrl || null,
          city,
          country,
          region,
          languages,
          createdAt,
        });

        // 2. Auftragsstatistiken laden
        const ordersQuery = query(
          collection(db, 'auftraege'),
          where('customerFirebaseUid', '==', userId)
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        let totalOrders = 0;
        let completedOrders = 0;
        let totalValue = 0;

        ordersSnapshot.docs.forEach(doc => {
          const order = doc.data();
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
        ordersSnapshot2.docs.forEach(doc => {
          if (!existingIds.has(doc.id)) {
            const order = doc.data();
            totalOrders++;
            
            if (order.status === 'ABGESCHLOSSEN' || order.status === 'abgeschlossen' || order.status === 'completed') {
              completedOrders++;
            }

            const orderValue = order.totalAmountPaidByBuyer || order.totalPriceInCents || order.jobCalculatedPriceInCents || 0;
            totalValue += orderValue;
          }
        });

        const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders / 100 : 0;

        setStats({
          totalOrders,
          completedOrders,
          averageOrderValue,
          memberSince: createdAt ? createdAt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : 'Unbekannt',
        });

      } catch (err) {
        console.error('Fehler beim Laden des Profils:', err);
        setError('Fehler beim Laden des Profils');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">{error || 'Benutzer nicht gefunden'}</h1>
          <Link href="/" className="text-teal-600 hover:underline mt-4 inline-block">
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-32 sm:h-40" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        {/* Profil-Karte */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Avatar und Name */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative">
                {userData.avatarUrl ? (
                  <Image
                    src={userData.avatarUrl}
                    alt={userData.displayName}
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-teal-100 flex items-center justify-center border-4 border-white shadow-lg">
                    <User className="w-16 h-16 text-teal-600" />
                  </div>
                )}
              </div>

              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {userData.displayName}
                </h1>
                
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-4 text-gray-600">
                  {(userData.city || userData.region) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{[userData.city, userData.region, userData.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  
                  {userData.languages.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>{userData.languages.join(', ')}</span>
                    </div>
                  )}

                  {stats?.memberSince && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Mitglied seit {stats.memberSince}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statistiken */}
            {stats && (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <ShoppingCart className="w-6 h-6 mx-auto text-teal-500 mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
                  <div className="text-sm text-gray-500">Aufträge erstellt</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stats.completedOrders}</div>
                  <div className="text-sm text-gray-500">Abgeschlossen</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.averageOrderValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </div>
                  <div className="text-sm text-gray-500">Durchschn. Auftragswert</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="w-6 h-6 mx-auto text-purple-500 mb-2 font-bold text-lg">%</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-500">Abschlussrate</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zurück-Button */}
        <div className="mt-6 mb-12">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
        </div>
      </div>
    </div>
  );
}
