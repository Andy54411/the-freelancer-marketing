import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Firebase Admin Setup
let db: any = null;

// Nur initialisieren wenn nicht während Build-Zeit
const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production';

if (!isBuildTime) {
  try {
    if (!getApps().length) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      let projectId = process.env.FIREBASE_PROJECT_ID;
      
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        
        if (!projectId && serviceAccount.project_id) {
          projectId = serviceAccount.project_id;
        }
        
        if (serviceAccount.project_id && projectId) {
          initializeApp({
            credential: cert(serviceAccount),
            projectId: projectId,
          });
          db = getFirestore();
        }
      }
    } else {
      db = getFirestore();
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed in platform config util:', error);
    db = null;
  }
}

export interface PlatformFeeConfig {
  id: string;
  feeRate: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
}

/**
 * Lädt die aktuelle Plattformgebühr aus der Datenbank
 * @returns Promise<number> - Gebührensatz als Dezimalzahl (z.B. 0.045 für 4.5%)
 */
export async function getCurrentPlatformFeeRate(): Promise<number> {
  const defaultFeeRate = 0.045; // 4.5% Fallback
  
  // Während Build-Zeit oder ohne Datenbank: Fallback verwenden
  if (!db || typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    return defaultFeeRate;
  }

  try {
    const configDoc = await db.collection('platform_config').doc('fee_settings').get();
    
    if (configDoc.exists) {
      const config = configDoc.data() as PlatformFeeConfig;
      const feeRate = config.feeRate;
      
      if (typeof feeRate === 'number' && feeRate >= 0 && feeRate <= 0.2 && config.isActive) {
        return feeRate;
      } else {
        return defaultFeeRate;
      }
    } else {
      return defaultFeeRate;
    }
  } catch (error) {
    // Bei Verbindungsfehlern (wie während Build) stillen Fallback verwenden
    return defaultFeeRate;
  }
}

/**
 * Lädt die vollständige Plattformkonfiguration
 * @returns Promise<PlatformFeeConfig | null>
 */
export async function getPlatformConfig(): Promise<PlatformFeeConfig | null> {
  // Während Build-Zeit: null zurückgeben
  if (!db || typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    return null;
  }

  try {
    const configDoc = await db.collection('platform_config').doc('fee_settings').get();
    
    if (configDoc.exists) {
      return configDoc.data() as PlatformFeeConfig;
    } else {
      return null;
    }
  } catch (error) {
    // Bei Verbindungsfehlern null zurückgeben
    return null;
  }
}

/**
 * Berechnet Plattformgebühr und Auszahlungsbetrag
 * @param amount - Ursprungsbetrag in Cent
 * @param feeRate - Gebührensatz (optional, wird automatisch geladen)
 * @returns Promise<{platformFee: number, payoutAmount: number, feeRate: number}>
 */
export async function calculatePlatformFee(amount: number, feeRate?: number) {
  const actualFeeRate = feeRate || await getCurrentPlatformFeeRate();
  const platformFee = Math.floor(amount * actualFeeRate);
  const payoutAmount = amount - platformFee;
  
  return {
    platformFee,
    payoutAmount,
    feeRate: actualFeeRate
  };
}
