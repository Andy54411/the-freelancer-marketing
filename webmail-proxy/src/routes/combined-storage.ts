/**
 * Combined Storage Routes
 * 
 * API-Endpunkte für kombinierte Speicherübersicht:
 * - Drive Speicher
 * - Photos Speicher
 * - E-Mail Speicher (via Mailbox-Größe)
 * 
 * WICHTIG: Alle Apps teilen sich EINEN gemeinsamen Speicher!
 * Das Limit gilt für Drive + Fotos + E-Mails zusammen.
 */

import { Router, Request, Response } from 'express';
import driveService from '../services/DriveServiceMongo';
import { photosStorageServiceMongo as photosStorageService } from '../services/PhotosStorageServiceMongo';

const router: Router = Router();

// GEMEINSAMES Speicherlimit für alle Dienste (in Bytes)
// Entspricht den Abo-Plänen in /webmail/settings
const SHARED_STORAGE_LIMITS: Record<string, number> = {
  free: 15 * 1024 * 1024 * 1024,      // 15 GB
  basic: 100 * 1024 * 1024 * 1024,    // 100 GB - 1,99€/Monat
  standard: 200 * 1024 * 1024 * 1024, // 200 GB - 2,99€/Monat
  pro: 2 * 1024 * 1024 * 1024 * 1024, // 2 TB - 9,99€/Monat
};

interface StorageService {
  name: string;
  used: number;
  usedFormatted: string;
  color: string;
  icon: string;
}

interface CombinedStorage {
  totalUsed: number;
  totalLimit: number;
  usedPercent: number;
  totalUsedFormatted: string;
  totalLimitFormatted: string;
  services: StorageService[];
  canFreeUp: number;
  canFreeUpFormatted: string;
  plan: string;
}

// Helper: Bytes formatieren
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

/**
 * GET /combined-storage
 * Kombinierte Speicherübersicht für alle Dienste
 * ALLE APPS TEILEN SICH EINEN GEMEINSAMEN SPEICHER!
 * 
 * Headers:
 * - x-user-id: E-Mail Adresse
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'x-user-id Header erforderlich' });
    }

    // Alle Speicher parallel abrufen
    const [driveInfo, photosAnalysis] = await Promise.all([
      driveService.getStorageInfo(userId).catch(() => null),
      photosStorageService.getStorageAnalysis(userId).catch(() => null),
    ]);

    // Plan ermitteln (höchster Plan von allen Services)
    const drivePlan = driveInfo?.plan || 'free';
    const photosPlan = photosAnalysis?.plan || 'free';
    const planPriority = { free: 0, plus: 1, pro: 2, business: 3 };
    const effectivePlan = planPriority[photosPlan as keyof typeof planPriority] > planPriority[drivePlan as keyof typeof planPriority] 
      ? photosPlan 
      : drivePlan;

    // GEMEINSAMES Limit für alle Dienste
    const totalLimit = SHARED_STORAGE_LIMITS[effectivePlan as keyof typeof SHARED_STORAGE_LIMITS] || SHARED_STORAGE_LIMITS.free;

    // Services zusammenstellen (nur used, kein separates limit mehr)
    const services: StorageService[] = [];
    
    const driveUsed = driveInfo?.used || 0;
    const photosUsed = photosAnalysis?.totalUsed || 0;
    const emailUsed = 0; // Wird später via Mailcow API implementiert

    // Drive
    services.push({
      name: 'Drive',
      used: driveUsed,
      usedFormatted: formatBytes(driveUsed),
      color: '#4285f4', // Blau
      icon: 'hard-drive',
    });

    // Photos
    services.push({
      name: 'Fotos',
      used: photosUsed,
      usedFormatted: formatBytes(photosUsed),
      color: '#34a853', // Grün
      icon: 'camera',
    });

    // E-Mails
    services.push({
      name: 'E-Mails',
      used: emailUsed,
      usedFormatted: formatBytes(emailUsed),
      color: '#fbbc04', // Gelb
      icon: 'mail',
    });

    // Gesamt berechnen (alle Services zusammen)
    const totalUsed = driveUsed + photosUsed + emailUsed;
    const usedPercent = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;

    // Möglicher freizugebender Speicher
    const canFreeUp = (photosAnalysis?.largeFiles?.reduce((sum, f) => sum + f.size, 0) || 0) +
                      (photosAnalysis?.screenshots?.reduce((sum, f) => sum + f.size, 0) || 0);

    const response: CombinedStorage = {
      totalUsed,
      totalLimit,
      usedPercent,
      totalUsedFormatted: formatBytes(totalUsed),
      totalLimitFormatted: formatBytes(totalLimit),
      services,
      canFreeUp,
      canFreeUpFormatted: formatBytes(canFreeUp),
      plan: effectivePlan,
    };

    res.json({ success: true, ...response });
  } catch (error) {
    console.error('[CombinedStorage] Fehler:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /combined-storage/simple
 * Einfache Speicherübersicht (schneller)
 * ALLE APPS TEILEN SICH EINEN GEMEINSAMEN SPEICHER!
 */
router.get('/simple', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'x-user-id Header erforderlich' });
    }

    // Drive und Photos parallel abrufen
    const [driveInfo, photosAnalysis] = await Promise.all([
      driveService.getStorageInfo(userId).catch(() => null),
      photosStorageService.getStorageAnalysis(userId).catch(() => null),
    ]);

    // Plan ermitteln
    const drivePlan = driveInfo?.plan || 'free';
    const photosPlan = photosAnalysis?.plan || 'free';
    const planPriority = { free: 0, plus: 1, pro: 2, business: 3 };
    const effectivePlan = planPriority[photosPlan as keyof typeof planPriority] > planPriority[drivePlan as keyof typeof planPriority] 
      ? photosPlan 
      : drivePlan;

    // GEMEINSAMES Limit
    const totalLimit = SHARED_STORAGE_LIMITS[effectivePlan as keyof typeof SHARED_STORAGE_LIMITS] || SHARED_STORAGE_LIMITS.free;

    const driveUsed = driveInfo?.used || 0;
    const photosUsed = photosAnalysis?.totalUsed || 0;
    const emailUsed = 0;

    const services: StorageService[] = [
      {
        name: 'Drive',
        used: driveUsed,
        usedFormatted: formatBytes(driveUsed),
        color: '#4285f4',
        icon: 'hard-drive',
      },
      {
        name: 'Fotos',
        used: photosUsed,
        usedFormatted: formatBytes(photosUsed),
        color: '#34a853',
        icon: 'camera',
      },
      {
        name: 'E-Mails',
        used: emailUsed,
        usedFormatted: formatBytes(emailUsed),
        color: '#fbbc04',
        icon: 'mail',
      },
    ];

    const totalUsed = driveUsed + photosUsed + emailUsed;
    const usedPercent = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
    
    const canFreeUp = (photosAnalysis?.largeFiles?.reduce((sum, f) => sum + f.size, 0) || 0) +
                      (photosAnalysis?.screenshots?.reduce((sum, f) => sum + f.size, 0) || 0);

    res.json({ 
      success: true, 
      totalUsed,
      totalLimit,
      usedPercent,
      totalUsedFormatted: formatBytes(totalUsed),
      totalLimitFormatted: formatBytes(totalLimit),
      services,
      canFreeUp,
      canFreeUpFormatted: formatBytes(canFreeUp),
      plan: effectivePlan,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export const combinedStorageRouter = router;
