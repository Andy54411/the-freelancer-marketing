import { admin, db } from '@/firebase/server'; // Use centralized Firebase setup

// Firebase Admin is already initialized in @/firebase/server
// No need to initialize here - use centralized setup

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

  // Build-Zeit-Erkennung
  const isBuildTime =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL);

  // Fallback verwenden wenn Build-Zeit oder keine Datenbank verfügbar
  if (isBuildTime || !db) {
    if (isBuildTime) {
    } else {
    }
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
  // Fallback wenn keine Datenbank verfügbar
  if (!db) {
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
  const actualFeeRate = feeRate || (await getCurrentPlatformFeeRate());
  const platformFee = Math.floor(amount * actualFeeRate);
  const payoutAmount = amount - platformFee;

  return {
    platformFee,
    payoutAmount,
    feeRate: actualFeeRate,
  };
}
