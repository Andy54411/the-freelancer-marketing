// 🎯 TASKILO ADVERTISING FIREBASE SERVICE
// Firestore Integration für Multi-Platform Advertising Data

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import {
  AdvertisingPlatform,
  PlatformConnection,
  UnifiedCampaign,
  UnifiedAnalytics,
  PlatformCredentials,
} from '@/types/advertising';

export class AdvertisingFirebaseService {
  // Collection References
  private readonly PLATFORM_CONNECTIONS = 'platform_connections';
  private readonly CAMPAIGNS = 'advertising_campaigns';
  private readonly ANALYTICS_HISTORY = 'analytics_history';
  private readonly PLATFORM_CREDENTIALS = 'platform_credentials';

  /**
   * 🔗 Platform-Verbindungen in Firestore speichern/laden
   */
  async savePlatformConnection(companyId: string, connection: PlatformConnection): Promise<void> {
    const docRef = doc(db, this.PLATFORM_CONNECTIONS, `${companyId}_${connection.platform}`);

    await setDoc(docRef, {
      ...connection,
      companyId,
      lastUpdated: Timestamp.now(),
    });
  }

  async getPlatformConnection(
    companyId: string,
    platform: AdvertisingPlatform
  ): Promise<PlatformConnection | null> {
    const docRef = doc(db, this.PLATFORM_CONNECTIONS, `${companyId}_${platform}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        platform: data.platform,
        status: data.status,
        lastConnected: data.lastConnected,
        error: data.error,
        accountInfo: data.accountInfo,
      };
    }

    return null;
  }

  async getAllPlatformConnections(companyId: string): Promise<PlatformConnection[]> {
    const q = query(collection(db, this.PLATFORM_CONNECTIONS), where('companyId', '==', companyId));

    const querySnapshot = await getDocs(q);
    const connections: PlatformConnection[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      connections.push({
        platform: data.platform,
        status: data.status,
        lastConnected: data.lastConnected,
        error: data.error,
        accountInfo: data.accountInfo,
      });
    });

    return connections;
  }

  /**
   * 🔑 Platform-Credentials sicher speichern (verschlüsselt)
   */
  async savePlatformCredentials(
    companyId: string,
    platform: AdvertisingPlatform,
    credentials: PlatformCredentials['credentials']
  ): Promise<void> {
    const docRef = doc(db, this.PLATFORM_CREDENTIALS, `${companyId}_${platform}`);

    // In production: Credentials verschlüsseln
    await setDoc(docRef, {
      companyId,
      platform,
      credentials: credentials, // TODO: Encrypt in production
      lastUpdated: Timestamp.now(),
    });
  }

  async getPlatformCredentials(
    companyId: string,
    platform: AdvertisingPlatform
  ): Promise<PlatformCredentials['credentials'] | null> {
    const docRef = doc(db, this.PLATFORM_CREDENTIALS, `${companyId}_${platform}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.credentials; // TODO: Decrypt in production
    }

    return null;
  }

  /**
   * 🎯 Campaign-Data cachen
   */
  async saveCampaigns(
    companyId: string,
    platform: AdvertisingPlatform,
    campaigns: UnifiedCampaign[]
  ): Promise<void> {
    const docRef = doc(db, this.CAMPAIGNS, `${companyId}_${platform}`);

    await setDoc(docRef, {
      companyId,
      platform,
      campaigns,
      lastSync: Timestamp.now(),
      campaignCount: campaigns.length,
    });
  }

  async getCachedCampaigns(
    companyId: string,
    platform: AdvertisingPlatform
  ): Promise<UnifiedCampaign[]> {
    const docRef = doc(db, this.CAMPAIGNS, `${companyId}_${platform}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.campaigns || [];
    }

    return [];
  }

  async getAllCachedCampaigns(companyId: string): Promise<UnifiedCampaign[]> {
    const q = query(collection(db, this.CAMPAIGNS), where('companyId', '==', companyId));

    const querySnapshot = await getDocs(q);
    const allCampaigns: UnifiedCampaign[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.campaigns) {
        allCampaigns.push(...data.campaigns);
      }
    });

    return allCampaigns;
  }

  /**
   * 📊 Analytics-History speichern
   */
  async saveAnalyticsSnapshot(
    companyId: string,
    analytics: UnifiedAnalytics,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<void> {
    const docRef = await addDoc(collection(db, this.ANALYTICS_HISTORY), {
      companyId,
      analytics,
      dateRange,
      timestamp: Timestamp.now(),
      date: new Date().toISOString().split('T')[0],
    });
  }

  async getAnalyticsHistory(
    companyId: string,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      analytics: UnifiedAnalytics;
      dateRange?: { startDate: string; endDate: string };
    }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, this.ANALYTICS_HISTORY),
      where('companyId', '==', companyId),
      where('timestamp', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('timestamp', 'desc'),
      limit(days)
    );

    const querySnapshot = await getDocs(q);
    const history: Array<{
      date: string;
      analytics: UnifiedAnalytics;
      dateRange?: { startDate: string; endDate: string };
    }> = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      history.push({
        date: data.date,
        analytics: data.analytics,
        dateRange: data.dateRange,
      });
    });

    return history;
  }

  /**
   * 🔄 Cache-Management
   */
  async getCacheAge(companyId: string, platform: AdvertisingPlatform): Promise<number> {
    const docRef = doc(db, this.CAMPAIGNS, `${companyId}_${platform}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const lastSync = data.lastSync?.toDate();
      if (lastSync) {
        return Date.now() - lastSync.getTime();
      }
    }

    return Infinity; // No cache
  }

  async isCacheValid(
    companyId: string,
    platform: AdvertisingPlatform,
    maxAgeMs: number = 30 * 60 * 1000 // 30 minutes
  ): Promise<boolean> {
    const age = await this.getCacheAge(companyId, platform);
    return age < maxAgeMs;
  }

  /**
   * 🧹 Cleanup alte Daten
   */
  async cleanupOldAnalytics(days: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const q = query(
      collection(db, this.ANALYTICS_HISTORY),
      where('timestamp', '<', Timestamp.fromDate(cutoffDate))
    );

    const querySnapshot = await getDocs(q);

    // In production: Batch delete für bessere Performance
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }

  /**
   * 📈 Performance-Statistiken
   */
  async getPerformanceStats(companyId: string): Promise<{
    totalCampaigns: number;
    activePlatforms: number;
    lastSyncTimes: Record<AdvertisingPlatform, Date | null>;
    cacheStatus: Record<AdvertisingPlatform, boolean>;
  }> {
    const platforms: AdvertisingPlatform[] = [
      'google-ads',
      'linkedin',
      'meta',
      'taboola',
      'outbrain',
    ];

    const stats = {
      totalCampaigns: 0,
      activePlatforms: 0,
      lastSyncTimes: {} as Record<AdvertisingPlatform, Date | null>,
      cacheStatus: {} as Record<AdvertisingPlatform, boolean>,
    };

    for (const platform of platforms) {
      // Campaign count
      const campaigns = await this.getCachedCampaigns(companyId, platform);
      stats.totalCampaigns += campaigns.length;

      if (campaigns.length > 0) {
        stats.activePlatforms++;
      }

      // Last sync time
      const docRef = doc(db, this.CAMPAIGNS, `${companyId}_${platform}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        stats.lastSyncTimes[platform] = data.lastSync?.toDate() || null;
      } else {
        stats.lastSyncTimes[platform] = null;
      }

      // Cache status
      stats.cacheStatus[platform] = await this.isCacheValid(companyId, platform);
    }

    return stats;
  }
}

// Singleton Export
export const advertisingFirebaseService = new AdvertisingFirebaseService();
