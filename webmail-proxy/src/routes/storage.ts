/**
 * Taskilo Photos Storage Routes
 * 
 * API-Endpunkte für Speicherverwaltung:
 * - Speicheranalyse
 * - Kategorien-Details
 * - Speicherplatz freigeben
 * - Plan-Upgrades
 */

import { Router, Request, Response } from 'express';
import { photosStorageService, STORAGE_PLANS } from '../services/PhotosStorageService';

const router: Router = Router();

// Helper: User-ID aus Request extrahieren
function getUserId(req: Request): string {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    throw new Error('x-user-id Header erforderlich');
  }
  return userId;
}

// ==================== STORAGE ANALYSIS ====================

/**
 * GET /storage/analysis
 * Detaillierte Speicheranalyse abrufen
 */
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const analysis = await photosStorageService.getStorageAnalysis(userId);
    res.json({ success: true, ...analysis });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /storage/plans
 * Verfügbare Speicherpläne abrufen
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const plans = await photosStorageService.getAvailablePlans(userId);
    res.json({ success: true, plans });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /storage/category/:category
 * Details zu einer Speicherkategorie abrufen
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { category } = req.params;
    const details = await photosStorageService.getCategoryStorageDetails(userId, category);
    res.json({ success: true, ...details });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== STORAGE CLEANUP ====================

/**
 * POST /storage/delete-photos
 * Mehrere Fotos löschen und Speicherplatz freigeben
 */
router.post('/delete-photos', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { photoIds } = req.body;
    
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, error: 'photoIds Array erforderlich' });
    }
    
    const result = await photosStorageService.deletePhotosAndFreeSpace(userId, photoIds);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /storage/delete-category
 * Alle Fotos einer Kategorie löschen
 */
router.post('/delete-category', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { category } = req.body;
    
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ success: false, error: 'category erforderlich' });
    }
    
    const result = await photosStorageService.deleteCategoryPhotos(userId, category);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /storage/empty-trash
 * Papierkorb endgültig leeren
 */
router.post('/empty-trash', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await photosStorageService.emptyTrash(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== PLAN MANAGEMENT ====================

/**
 * POST /storage/upgrade
 * Speicherplan upgraden
 */
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { plan } = req.body;
    
    if (!plan || !Object.keys(STORAGE_PLANS).includes(plan)) {
      return res.status(400).json({ 
        success: false, 
        error: `Ungültiger Plan. Verfügbare Pläne: ${Object.keys(STORAGE_PLANS).join(', ')}` 
      });
    }
    
    const result = await photosStorageService.upgradePlan(userId, plan);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /storage/pricing
 * Preisliste für Speicherpläne
 */
router.get('/pricing', async (_req: Request, res: Response) => {
  try {
    const pricing = Object.entries(STORAGE_PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      storage: plan.storage,
      formattedStorage: formatBytes(plan.storage),
      price: plan.price,
      priceFormatted: plan.price === 0 ? 'Kostenlos' : `${plan.price.toFixed(2)} € / Monat`,
    }));
    
    res.json({ success: true, plans: pricing });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// Helper Funktion
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export const storageRouter = router;
