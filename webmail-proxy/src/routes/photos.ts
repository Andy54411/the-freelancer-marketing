/**
 * Taskilo Photos API Routes
 * 
 * REST API für den Fotos-Speicher.
 * Separater Bereich von Drive - nur für Bilder.
 */

import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { photosService, Photo } from '../services/PhotosService';
import { ExifService } from '../services/ExifService';
import { wsService } from '../services/WebSocketService';

const router: Router = Router();

// KI-API URL
const KI_API_URL = process.env.KI_API_URL || 'http://taskilo-ki:8000';

/**
 * Klassifiziert Fotos im Hintergrund über die Taskilo-KI
 * Läuft async ohne auf Response zu warten
 * Sendet Realtime-Updates über WebSocket
 */
async function classifyPhotosInBackground(userId: string, photos: Photo[]): Promise<void> {
  for (const photo of photos) {
    try {
      // Foto-Datei laden
      const photoFile = await photosService.getPhotoFile(userId, photo.id);
      if (!photoFile) continue;
      
      // An KI senden
      const base64 = photoFile.buffer.toString('base64');
      
      const response = await fetch(`${KI_API_URL}/api/v1/photos/photo/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          filename: photo.originalFilename,
          extract_embedding: false,
        }),
      });
      
      if (!response.ok) {
        console.warn(`[Photos] KI-Klassifizierung fehlgeschlagen für ${photo.id}: ${response.status}`);
        continue;
      }
      
      const result = await response.json() as {
        primary_category: string;
        primary_category_display: string;
        primary_confidence: number;
        detected_categories: Array<{ category: string; display_name: string; confidence: number }>;
        detected_objects: Array<{ object: string; confidence: number }>;
        metadata_categories: string[];
        image_hash?: string; // Hash für KI-Feedback Tracking
      };
      
      // Kategorie in DB speichern (inkl. imageHash für späteres Feedback)
      await photosService.updateAiCategories(userId, photo.id, {
        primaryCategory: result.primary_category,
        primaryCategoryDisplay: result.primary_category_display,
        primaryConfidence: result.primary_confidence,
        detectedCategories: result.detected_categories,
        detectedObjects: result.detected_objects,
        metadataCategories: result.metadata_categories,
        classifiedAt: Date.now(),
        imageHash: result.image_hash,
      });
      
      console.log(`[Photos] Klassifiziert: ${photo.originalFilename} → ${result.primary_category_display}`);
      
      // REALTIME: WebSocket-Benachrichtigung senden für Foto-Update
      console.log(`[Photos] WebSocket: Sende photo_classified Event für ${photo.id} an ${userId}`);
      wsService.notifyPhotoClassified(userId, {
        id: photo.id,
        primaryCategory: result.primary_category,
        primaryCategoryDisplay: result.primary_category_display,
        primaryConfidence: result.primary_confidence,
      });
      
      // REALTIME: Kategorien-Liste aktualisieren (neue Kategorie könnte entstanden sein)
      wsService.notifyCategoriesChanged(userId, 'updated', {
        key: result.primary_category,
        display: result.primary_category_display,
        group: 'ki',
      });
      
    } catch (error) {
      console.warn(`[Photos] KI-Klassifizierung Fehler für ${photo.id}:`, (error as Error).message);
    }
  }
}

/**
 * Ermittelt Ortsnamen für Fotos mit GPS-Daten im Hintergrund
 * Sendet Realtime-Updates über WebSocket
 */
async function resolveLocationNamesInBackground(userId: string, photos: Photo[]): Promise<void> {
  for (const photo of photos) {
    try {
      // Nur wenn GPS-Daten vorhanden und noch kein Ortsname
      if (!photo.latitude || !photo.longitude || photo.locationName) continue;
      
      const locationName = await ExifService.reverseGeocode(photo.latitude, photo.longitude);
      
      if (locationName) {
        await photosService.correctPhotoMetadata(userId, photo.id, { locationName });
        console.log(`[Photos] Ortsname aufgelöst: ${photo.originalFilename} → ${locationName}`);
        
        // REALTIME: WebSocket-Benachrichtigung senden
        wsService.notifyPhotoUpdate(userId, photo.id, { locationName });
      }
    } catch (error) {
      console.warn(`[Photos] Ortsname-Auflösung Fehler für ${photo.id}:`, (error as Error).message);
    }
  }
}

// Multer für Photo Uploads (in Memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max pro Foto
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

// User ID aus Request holen (Header, Body oder Query)
const getUserId = (req: Request): string => {
  const userId = req.headers['x-user-id'] as string || req.body?.userId || req.query?.userId as string;
  if (!userId) {
    throw new Error('User ID required');
  }
  return userId;
};

// ==================== STORAGE ====================

// GET /photos/storage - Foto-Speicherinfo abrufen
router.get('/storage', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const storage = await photosService.getStorageInfo(userId);
    res.json({ success: true, storage });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== ERINNERUNGEN ====================

// GET /photos/memories - Erinnerungen (Fotos von vor X Jahren)
router.get('/memories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await photosService.getMemories(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== KATEGORIEN AUS DATENBANK ====================

// GET /photos/db-categories - Kategorien aus der Datenbank (inkl. manuell zugewiesener)
router.get('/db-categories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    // Kategorien aus DB (KI + manuell)
    const sceneCategories = await photosService.getCategoriesFromDb(userId);
    
    // Zeit-Kategorien (Jahre, Monate)
    const timeCategories = await photosService.getTimeCategories(userId);
    
    // Kombinieren
    const allCategories = [
      ...sceneCategories,
      ...timeCategories,
    ];
    
    res.json({ 
      success: true, 
      categories: allCategories,
      source: 'database',
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== ORTE / LOCATIONS ====================

// GET /photos/locations - Fotos nach Orten gruppiert
router.get('/locations', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await photosService.getPhotosByLocation(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/locations/geocode - Startet Geocoding für Fotos ohne Ortsnamen
router.get('/locations/geocode', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { GeocodingService } = await import('../services/GeocodingService');
    
    // Hole Fotos die Geocoding brauchen
    const photos = await photosService.getPhotosNeedingGeocoding(userId, 20);
    
    if (photos.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Alle Fotos haben bereits Ortsnamen',
        geocoded: 0 
      });
    }

    let geocodedCount = 0;
    
    for (const photo of photos) {
      if (photo.latitude && photo.longitude) {
        const locationInfo = await GeocodingService.reverseGeocode(
          photo.latitude, 
          photo.longitude
        );
        
        if (locationInfo) {
          await photosService.updateLocationName(userId, photo.id, locationInfo.locationName);
          geocodedCount++;
        }
      }
    }

    res.json({ 
      success: true, 
      message: `${geocodedCount} Fotos mit Ortsnamen aktualisiert`,
      geocoded: geocodedCount,
      remaining: photos.length - geocodedCount 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== ALBUMS ====================

// GET /photos/albums - Alle Alben abrufen
router.get('/albums', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const albums = await photosService.getAlbums(userId);
    res.json({ success: true, albums });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/albums/:id - Album-Details
router.get('/albums/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const album = await photosService.getAlbum(userId, req.params.id);
    if (!album) {
      return res.status(404).json({ success: false, error: 'Album nicht gefunden' });
    }
    res.json({ success: true, album });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/albums/:id/contents - Album-Inhalte mit Fotos
router.get('/albums/:id/contents', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const contents = await photosService.getAlbumContents(userId, req.params.id, limit, offset);
    res.json({ success: true, ...contents });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/albums - Neues Album erstellen
router.post('/albums', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Album-Name erforderlich' });
    }

    const album = await photosService.createAlbum(userId, name.trim(), description || null);
    res.json({ success: true, album });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /photos/albums/:id - Album umbenennen
router.patch('/albums/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Album-Name erforderlich' });
    }

    const album = await photosService.renameAlbum(userId, req.params.id, name.trim());
    if (!album) {
      return res.status(404).json({ success: false, error: 'Album nicht gefunden oder kann nicht umbenannt werden' });
    }
    res.json({ success: true, album });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /photos/albums/:id - Album löschen
router.delete('/albums/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const success = await photosService.deleteAlbum(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Album nicht gefunden oder kann nicht gelöscht werden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== PHOTOS ====================

// GET /photos - Alle Fotos abrufen (oder gefiltert)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const albumId = req.query.albumId as string || null;
    const favoritesOnly = req.query.favorites === 'true';
    const category = req.query.category as string || undefined;
    
    const result = await photosService.getPhotos(userId, albumId, { limit, offset, favoritesOnly, category });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/favorites - Nur Favoriten
router.get('/favorites', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await photosService.getPhotos(userId, null, { limit, offset, favoritesOnly: true });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/upload - Foto hochladen
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/upload', upload.single('photo'), async (req: any, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID erforderlich' });
    }
    
    const { albumId, appDeviceId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Kein Foto hochgeladen' });
    }

    // EXIF-Metadaten automatisch aus dem Bild extrahieren (async für bessere Format-Unterstützung)
    const exifData = await ExifService.extractMetadataAsync(req.file.buffer);
    console.log(`[Photos] EXIF für ${req.file.originalname}:`, exifData);

    const photo = await photosService.uploadPhoto(
      userId,
      albumId || null,
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer,
      {
        width: exifData.width,
        height: exifData.height,
        takenAt: exifData.takenAt,
        latitude: exifData.latitude,
        longitude: exifData.longitude,
        camera: exifData.camera,
        appDeviceId: appDeviceId || undefined,
      }
    );

    // KI-Klassifizierung und Ortsname im Hintergrund
    classifyPhotosInBackground(userId, [photo]);
    if (exifData.latitude && exifData.longitude) {
      resolveLocationNamesInBackground(userId, [photo]);
    }

    res.json({ success: true, photo });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/upload-multiple - Mehrere Fotos hochladen
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/upload-multiple', upload.array('photos', 50), async (req: any, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID erforderlich' });
    }
    
    const { albumId, appDeviceId } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Keine Fotos hochgeladen' });
    }

    const uploaded = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // EXIF-Metadaten automatisch aus dem Bild extrahieren (async für bessere Format-Unterstützung)
        const exifData = await ExifService.extractMetadataAsync(file.buffer);
        console.log(`[Photos] EXIF für ${file.originalname}:`, exifData);
        
        const photo = await photosService.uploadPhoto(
          userId,
          albumId || null,
          file.originalname,
          file.mimetype,
          file.buffer,
          {
            width: exifData.width,
            height: exifData.height,
            takenAt: exifData.takenAt,
            latitude: exifData.latitude,
            longitude: exifData.longitude,
            camera: exifData.camera,
            appDeviceId: appDeviceId || undefined,
          }
        );
        uploaded.push(photo);
      } catch (err) {
        errors.push({ filename: file.originalname, error: (err as Error).message });
      }
    }

    // KI-Klassifizierung im Hintergrund für alle Fotos starten
    if (uploaded.length > 0) {
      classifyPhotosInBackground(userId, uploaded);
      // Ortsnamen für Fotos mit GPS-Daten auflösen
      const photosWithGps = uploaded.filter(p => p.latitude && p.longitude);
      if (photosWithGps.length > 0) {
        resolveLocationNamesInBackground(userId, photosWithGps);
      }
    }

    res.json({ 
      success: true, 
      uploaded: uploaded.length,
      failed: errors.length,
      photos: uploaded,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== BENUTZERDEFINIERTE KATEGORIEN ====================
// WICHTIG: Diese Routes müssen VOR /:id Routes definiert werden!

/**
 * GET /custom-categories - Alle benutzerdefinierten Kategorien abrufen
 */
router.get('/custom-categories', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID erforderlich' });
    }
    
    const categories = await photosService.getCustomCategories(userId);
    
    res.json({ success: true, categories });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /custom-categories - Neue benutzerdefinierte Kategorie erstellen
 */
router.post('/custom-categories', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID erforderlich' });
    }
    
    const { display, group } = req.body;
    
    if (!display || typeof display !== 'string' || display.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Kategorie-Name erforderlich' });
    }
    
    const category = await photosService.createCustomCategory(
      userId, 
      display.trim(), 
      group || 'spezial'
    );
    
    console.log(`[Photos] Benutzerdefinierte Kategorie erstellt: ${category.display} (${category.key})`);
    
    // REALTIME: WebSocket-Benachrichtigung senden
    wsService.notifyCategoriesChanged(userId, 'created', {
      key: category.key,
      display: category.display,
      group: category.group,
    });
    
    // KI INFORMIEREN: Neue Kategorie bei KI registrieren (im Hintergrund)
    (async () => {
      try {
        const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
        const registerResponse = await fetch(`${kiApiUrl}/api/v1/photos/categories/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: category.key,
            display: category.display,
            group: category.group,
          }),
        });
        
        if (registerResponse.ok) {
          console.log(`[Photos] KI: Kategorie '${category.display}' registriert`);
        } else {
          console.warn(`[Photos] KI: Kategorie-Registrierung fehlgeschlagen: ${registerResponse.status}`);
        }
      } catch (kiError) {
        console.warn(`[Photos] KI nicht erreichbar für Kategorie-Registrierung:`, (kiError as Error).message);
      }
    })();
    
    res.json({ success: true, category });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /custom-categories/:id - Benutzerdefinierte Kategorie löschen
 */
router.delete('/custom-categories/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User ID erforderlich' });
    }
    
    const { id } = req.params;
    const deleted = await photosService.deleteCustomCategory(userId, id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Kategorie nicht gefunden' });
    }
    
    // REALTIME: WebSocket-Benachrichtigung senden
    wsService.notifyCategoriesChanged(userId, 'deleted', { key: id, display: '', group: '' });
    
    // KI INFORMIEREN: Kategorie bei KI entfernen (im Hintergrund)
    (async () => {
      try {
        const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
        const deleteResponse = await fetch(`${kiApiUrl}/api/v1/photos/categories/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        
        if (deleteResponse.ok) {
          console.log(`[Photos] KI: Kategorie '${id}' entfernt`);
        } else {
          console.warn(`[Photos] KI: Kategorie-Löschung fehlgeschlagen: ${deleteResponse.status}`);
        }
      } catch (kiError) {
        console.warn(`[Photos] KI nicht erreichbar für Kategorie-Löschung:`, (kiError as Error).message);
      }
    })();
    
    res.json({ success: true, deleted: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/:id - Foto-Details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const photo = await photosService.getPhoto(userId, req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    res.json({ success: true, photo });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/:id/download - Foto-Datei herunterladen
router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await photosService.getPhotoFile(userId, req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
      'Content-Length': result.buffer.length.toString(),
    });
    res.send(result.buffer);
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/:id/view - Foto anzeigen (inline)
router.get('/:id/view', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await photosService.getPhotoFile(userId, req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(result.filename)}"`,
      'Content-Length': result.buffer.length.toString(),
      'Cache-Control': 'private, max-age=86400', // 1 Tag Cache
    });
    res.send(result.buffer);
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/:id/favorite - Favorit umschalten
router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const photo = await photosService.toggleFavorite(userId, req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    res.json({ success: true, photo });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /photos/:id/move - Foto in anderes Album verschieben
router.patch('/:id/move', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { albumId } = req.body;
    
    const photo = await photosService.moveToAlbum(userId, req.params.id, albumId || null);
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    res.json({ success: true, photo });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /photos/:id/ai-categories - KI-Kategorien speichern
router.patch('/:id/ai-categories', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { 
      primaryCategory,
      primaryCategoryDisplay,
      primaryConfidence,
      detectedCategories,
      detectedObjects,
      metadataCategories,
    } = req.body;
    
    const photo = await photosService.updateAiCategories(userId, req.params.id, {
      primaryCategory,
      primaryCategoryDisplay,
      primaryConfidence,
      detectedCategories,
      detectedObjects,
      metadataCategories,
      classifiedAt: Date.now(),
    });
    
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    res.json({ success: true, photo });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /photos/:id/correct - Manuelle Korrektur von Kategorie/Ort
router.patch('/:id/correct', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { category, categoryDisplay, locationName, latitude, longitude } = req.body;
    const photoId = req.params.id;
    
    // Alte Kategorie vor der Korrektur speichern (für KI-Lernen)
    const oldPhoto = await photosService.getPhoto(userId, photoId);
    const originalCategory = oldPhoto?.primaryCategory;
    
    const photo = await photosService.correctPhotoMetadata(userId, photoId, {
      category,
      categoryDisplay,
      locationName,
      latitude,
      longitude,
    });
    
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    
    // REALTIME: WebSocket-Benachrichtigung senden
    wsService.notifyPhotoUpdate(userId, photoId, {
      primaryCategory: category,
      primaryCategoryDisplay: categoryDisplay,
      locationName,
    });
    
    // REALTIME: Kategorien-Liste aktualisieren (Zähler haben sich geändert)
    if (category) {
      wsService.notifyCategoriesChanged(userId, 'updated', {
        key: category,
        display: categoryDisplay || category,
        group: 'user_corrected',
      });
    }
    
    // KI SOFORT-LERNEN: Im Hintergrund (async) - blockiert Response nicht
    if (category && category !== originalCategory) {
      (async () => {
        try {
          const photoFile = await photosService.getPhotoFile(userId, photoId);
          if (!photoFile) {
            console.warn(`[Photos] KI-Lernen: Foto nicht gefunden für ${photoId}`);
            return;
          }
          
          const base64Image = photoFile.buffer.toString('base64');
          const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
          
          const learnResponse = await fetch(`${kiApiUrl}/api/v1/photos/photo/learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_base64: base64Image,
              category: category,
              source: 'user_correction',
            }),
          });
          
          if (learnResponse.ok) {
            const result = await learnResponse.json() as { success: boolean; stats?: object };
            console.log(`[Photos] KI GELERNT: ${originalCategory || 'unbekannt'} → ${category} (${photoId})`);
          } else {
            console.warn(`[Photos] KI-Lernen fehlgeschlagen: ${learnResponse.status}`);
          }
        } catch (kiError) {
          console.warn(`[Photos] KI nicht erreichbar:`, (kiError as Error).message);
        }
      })();
    }
    
    res.json({ success: true, photo });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/batch-correct - Batch-Korrektur mehrerer Fotos
router.post('/batch-correct', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { photoIds, category, categoryDisplay, locationName } = req.body;
    
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, error: 'photoIds Array erforderlich' });
    }
    
    const result = await photosService.batchCorrectMetadata(userId, photoIds, {
      category,
      categoryDisplay,
      locationName,
    });
    
    // REALTIME: WebSocket-Benachrichtigung für jedes korrigierte Foto
    for (const photoId of photoIds) {
      wsService.notifyPhotoUpdate(userId, photoId, {
        primaryCategory: category,
        primaryCategoryDisplay: categoryDisplay,
        locationName,
      });
    }
    
    // REALTIME: Kategorien-Liste aktualisieren (Zähler haben sich geändert)
    if (category) {
      wsService.notifyCategoriesChanged(userId, 'updated', {
        key: category,
        display: categoryDisplay || category,
        group: 'user_corrected',
      });
    }
    
    // KI BATCH-LERNEN: Im Hintergrund für alle Fotos
    if (category) {
      (async () => {
        const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
        let learnedCount = 0;
        
        for (const photoId of photoIds) {
          try {
            const photoFile = await photosService.getPhotoFile(userId, photoId);
            if (!photoFile) continue;
            
            const base64Image = photoFile.buffer.toString('base64');
            
            const learnResponse = await fetch(`${kiApiUrl}/api/v1/photos/photo/learn`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_base64: base64Image,
                category: category,
                source: 'user_correction',
              }),
            });
            
            if (learnResponse.ok) {
              learnedCount++;
            }
          } catch {
            // Einzelne Fehler ignorieren
          }
        }
        
        if (learnedCount > 0) {
          console.log(`[Photos] KI BATCH GELERNT: ${learnedCount}/${photoIds.length} Fotos → ${category}`);
        }
      })();
    }
    
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/reclassify-all - Alle unklassifizierten Fotos nachträglich klassifizieren
router.post('/reclassify-all', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { force } = req.body; // Auch bereits klassifizierte Fotos neu klassifizieren?
    
    // Alle Fotos ohne KI-Kategorie holen
    const result = await photosService.getPhotos(userId, null, { limit: 1000 });
    const photosToClassify = force 
      ? result.photos 
      : result.photos.filter(p => !p.primaryCategory);
    
    if (photosToClassify.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Alle Fotos sind bereits klassifiziert',
        classified: 0 
      });
    }
    
    // Im Hintergrund klassifizieren
    classifyPhotosInBackground(userId, photosToClassify);
    
    // Ortsnamen auflösen für Fotos mit GPS aber ohne Ortsname
    const photosForLocationResolve = photosToClassify.filter(p => 
      p.latitude && p.longitude && !p.locationName
    );
    if (photosForLocationResolve.length > 0) {
      resolveLocationNamesInBackground(userId, photosForLocationResolve);
    }
    
    res.json({ 
      success: true, 
      message: `${photosToClassify.length} Fotos werden im Hintergrund klassifiziert`,
      classifying: photosToClassify.length,
      resolvingLocations: photosForLocationResolve.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/seed-knn - Alle bestehenden Fotos mit Kategorien an KI zum Lernen senden
router.post('/seed-knn', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { categories } = req.body; // Optional: Nur bestimmte Kategorien
    
    // Alle Fotos mit Kategorien holen (außer "unbekannt")
    const result = await photosService.getPhotos(userId, null, { limit: 1000 });
    let photosToSeed = result.photos.filter(p => 
      p.primaryCategory && 
      p.primaryCategory !== 'unbekannt' &&
      p.primaryCategory !== ''
    );
    
    // Optional: Nur bestimmte Kategorien
    if (categories && Array.isArray(categories) && categories.length > 0) {
      photosToSeed = photosToSeed.filter(p => categories.includes(p.primaryCategory));
    }
    
    if (photosToSeed.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Keine Fotos zum Lernen gefunden',
        seeded: 0 
      });
    }
    
    // Kategorien-Übersicht
    const categoryCount: Record<string, number> = {};
    for (const photo of photosToSeed) {
      const cat = photo.primaryCategory || 'unknown';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
    
    console.log(`[Photos] KI-Seed gestartet: ${photosToSeed.length} Fotos`, categoryCount);
    
    // Im Hintergrund an KI senden
    const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
    let seededCount = 0;
    let failedCount = 0;
    
    // Async im Hintergrund - Response sofort senden
    (async () => {
      for (const photo of photosToSeed) {
        try {
          const photoFile = await photosService.getPhotoFile(userId, photo.id);
          if (!photoFile) {
            failedCount++;
            continue;
          }
          
          const base64Image = photoFile.buffer.toString('base64');
          
          const learnResponse = await fetch(`${kiApiUrl}/api/v1/photos/photo/learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_base64: base64Image,
              category: photo.primaryCategory,
              source: 'seed',
            }),
          });
          
          if (learnResponse.ok) {
            seededCount++;
          } else {
            failedCount++;
          }
          
          // Kurze Pause um KI nicht zu überlasten
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch {
          failedCount++;
        }
      }
      
      console.log(`[Photos] KI-Seed abgeschlossen: ${seededCount}/${photosToSeed.length} gelernt`);
    })();
    
    res.json({ 
      success: true, 
      message: `${photosToSeed.length} Fotos werden im Hintergrund an KI gesendet`,
      seeding: photosToSeed.length,
      categories: categoryCount,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/reextract-exif - EXIF-Daten für alle Fotos neu extrahieren
router.post('/reextract-exif', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { force } = req.body; // Auch Fotos mit bereits vorhandenen Daten?
    
    // Alle Fotos holen
    const result = await photosService.getPhotos(userId, null, { limit: 1000 });
    
    // Filter: nur Fotos ohne EXIF-Daten (oder alle wenn force=true)
    const photosToProcess = force 
      ? result.photos 
      : result.photos.filter(p => !p.takenAt && !p.latitude);
    
    if (photosToProcess.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Alle Fotos haben bereits EXIF-Daten',
        processed: 0 
      });
    }
    
    let processed = 0;
    let withGps = 0;
    let withDate = 0;
    
    for (const photo of photosToProcess) {
      try {
        const photoFile = await photosService.getPhotoFile(userId, photo.id);
        if (!photoFile) continue;
        
        const exifData = await ExifService.extractMetadataAsync(photoFile.buffer);
        console.log(`[Photos] Re-EXIF für ${photo.originalFilename}:`, exifData);
        
        // Update in DB wenn Daten gefunden
        const updates: {
          latitude?: number;
          longitude?: number;
        } = {};
        
        if (exifData.latitude && exifData.longitude) {
          updates.latitude = exifData.latitude;
          updates.longitude = exifData.longitude;
          withGps++;
        }
        
        if (exifData.takenAt) {
          withDate++;
        }
        
        // Speichere GPS-Daten (takenAt kann nicht direkt upgedated werden, TODO)
        if (Object.keys(updates).length > 0) {
          await photosService.correctPhotoMetadata(userId, photo.id, updates);
        }
        
        processed++;
      } catch (error) {
        console.warn(`[Photos] Re-EXIF Fehler für ${photo.id}:`, (error as Error).message);
      }
    }
    
    // Ortsnamen für Fotos mit neuen GPS-Daten auflösen
    if (withGps > 0) {
      const photosWithNewGps = result.photos.filter(p => 
        photosToProcess.some(pp => pp.id === p.id) && !p.locationName
      );
      resolveLocationNamesInBackground(userId, photosWithNewGps);
    }
    
    res.json({ 
      success: true, 
      message: `${processed} Fotos verarbeitet`,
      processed,
      withGps,
      withDate,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/:id/exif - Debug: EXIF-Daten eines Fotos anzeigen
router.get('/:id/exif', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const photoFile = await photosService.getPhotoFile(userId, req.params.id);
    
    if (!photoFile) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    
    const exifData = await ExifService.getFullExifData(photoFile.buffer);
    const metadata = await ExifService.extractMetadataAsync(photoFile.buffer);
    
    res.json({ 
      success: true, 
      filename: photoFile.filename,
      parsedMetadata: metadata,
      rawExif: exifData,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /photos/:id - Foto löschen
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const success = await photosService.deletePhoto(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Foto nicht gefunden' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== APP SYNC ====================

// GET /photos/sync - Fotos für App-Sync abrufen
router.get('/sync/changes', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const since = parseInt(req.query.since as string) || 0;
    
    const photos = await photosService.getPhotosForSync(userId, since);
    res.json({ success: true, photos, syncedAt: Date.now() });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/sync/complete - Sync abgeschlossen markieren
router.post('/sync/complete', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await photosService.updateSyncTimestamp(userId);
    res.json({ success: true, syncedAt: Date.now() });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== KI TRAINING FEEDBACK ====================

// POST /photos/ki-feedback - Korrektur an KI senden für Training
router.post('/ki-feedback', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { photoId, originalCategory, correctedCategory } = req.body;
    
    if (!photoId || !correctedCategory) {
      return res.status(400).json({ success: false, error: 'photoId und correctedCategory erforderlich' });
    }
    
    const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
    
    // Lade das Foto für Sofort-Lernen
    const photoFile = await photosService.getPhotoFile(userId, photoId);
    
    if (!photoFile) {
      console.warn(`[Photos] Foto nicht gefunden für ${photoId} - KI-Lernen übersprungen`);
      return res.json({ 
        success: true, 
        message: 'Foto nicht gefunden, KI-Lernen übersprungen', 
        kiPending: true 
      });
    }
    
    // SOFORT-LERNEN: Bild + korrekte Kategorie an KI senden
    try {
      const base64Image = photoFile.buffer.toString('base64');
      
      const learnResponse = await fetch(`${kiApiUrl}/api/v1/photos/photo/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64Image,
          category: correctedCategory,
          source: 'user_correction',
        }),
      });
      
      if (learnResponse.ok) {
        const result = await learnResponse.json() as { success: boolean; message?: string; stats?: object };
        console.log(`[Photos] KI hat gelernt: ${correctedCategory} (${originalCategory} → ${correctedCategory})`);
        res.json({ 
          success: true, 
          message: 'KI hat sofort gelernt!', 
          learned: true,
          stats: result.stats,
        });
      } else {
        const errorText = await learnResponse.text();
        console.warn('[Photos] KI-Lernen fehlgeschlagen:', learnResponse.status, errorText);
        
        // Fallback: Altes Feedback-System
        const imageHash = await photosService.getImageHash(userId, photoId);
        if (imageHash) {
          await fetch(`${kiApiUrl}/api/v1/photos/photo/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_hash: imageHash,
              feedback_type: 'correct',
              new_category: correctedCategory,
            }),
          });
        }
        
        res.json({ success: true, message: 'Feedback gespeichert für späteres Training', kiPending: true });
      }
    } catch (kiError) {
      console.warn('[Photos] KI nicht erreichbar:', (kiError as Error).message);
      res.json({ success: true, message: 'Lokale Korrektur gespeichert, KI offline', kiPending: true });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /photos/ki-feedback/batch - Batch-Feedback an KI senden
router.post('/ki-feedback/batch', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { corrections } = req.body;
    
    if (!corrections || !Array.isArray(corrections) || corrections.length === 0) {
      return res.status(400).json({ success: false, error: 'corrections Array erforderlich' });
    }
    
    const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
    let successCount = 0;
    let failCount = 0;
    
    // Jede Korrektur einzeln an KI senden (KI-API erwartet einzelne Requests)
    for (const correction of corrections) {
      try {
        const imageHash = await photosService.getImageHash(userId, correction.photoId);
        
        if (!imageHash) {
          console.warn(`[Photos] Kein image_hash für Foto ${correction.photoId} - übersprungen`);
          failCount++;
          continue;
        }
        
        const response = await fetch(`${kiApiUrl}/api/v1/photos/photo/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_hash: imageHash,
            feedback_type: 'correct',
            new_category: correction.correctedCategory,
          }),
        });
        
        if (response.ok) {
          successCount++;
          console.log(`[Photos] KI-Feedback gesendet: ${correction.originalCategory} → ${correction.correctedCategory}`);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `${successCount} von ${corrections.length} Korrekturen an KI gesendet`,
      successCount,
      failCount,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /photos/ki-categories - Alle verfügbaren KI-Kategorien abrufen
router.get('/ki-categories', async (_req: Request, res: Response) => {
  try {
    // Kategorien aus der KI-API abrufen oder lokale Fallback-Liste
    const kiApiUrl = process.env.KI_API_URL || 'http://taskilo-ki:8000';
    
    try {
      const response = await fetch(`${kiApiUrl}/api/v1/photos/categories`);
      if (response.ok) {
        const result = await response.json() as { categories: unknown[] };
        return res.json({ success: true, categories: result.categories, source: 'ki' });
      }
    } catch {
      // Fallback zu lokaler Liste
    }
    
    // Lokale Fallback-Kategorien (synchronisiert mit photoCategories.ts)
    const localCategories = [
      // Orte/Szenen
      { key: 'strand', display: 'Strand & Meer', group: 'orte' },
      { key: 'berge', display: 'Berge', group: 'orte' },
      { key: 'wald', display: 'Wald & Natur', group: 'orte' },
      { key: 'stadt', display: 'Stadt', group: 'orte' },
      { key: 'zuhause', display: 'Zuhause', group: 'orte' },
      { key: 'buero', display: 'Büro & Arbeit', group: 'orte' },
      { key: 'restaurant', display: 'Restaurant & Café', group: 'orte' },
      // Ereignisse
      { key: 'geburtstag', display: 'Geburtstage', group: 'ereignisse' },
      { key: 'hochzeit', display: 'Hochzeiten', group: 'ereignisse' },
      { key: 'weihnachten', display: 'Weihnachten', group: 'ereignisse' },
      { key: 'konzert', display: 'Konzerte & Events', group: 'ereignisse' },
      { key: 'sport', display: 'Sport', group: 'ereignisse' },
      { key: 'reise', display: 'Reisen', group: 'ereignisse' },
      // Objekte
      { key: 'essen', display: 'Essen & Trinken', group: 'objekte' },
      { key: 'tier', display: 'Tiere', group: 'objekte' },
      { key: 'hund', display: 'Hunde', group: 'objekte' },
      { key: 'katze', display: 'Katzen', group: 'objekte' },
      { key: 'auto', display: 'Autos & Fahrzeuge', group: 'objekte' },
      { key: 'dokument', display: 'Dokumente', group: 'objekte' },
      // Personen
      { key: 'selfie', display: 'Selfies', group: 'personen' },
      { key: 'gruppenfoto', display: 'Gruppenfotos', group: 'personen' },
      { key: 'portrait', display: 'Portraits', group: 'personen' },
      // Spezial
      { key: 'screenshot', display: 'Screenshots', group: 'spezial' },
      { key: 'kunst', display: 'Kunst', group: 'spezial' },
      { key: 'natur', display: 'Natur', group: 'spezial' },
      { key: 'sonnenuntergang', display: 'Sonnenuntergänge', group: 'spezial' },
    ];
    
    res.json({ success: true, categories: localCategories, source: 'local' });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;
