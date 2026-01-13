/**
 * Taskilo Photos API Routes
 * 
 * REST API für den Fotos-Speicher.
 * Separater Bereich von Drive - nur für Bilder.
 */

import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { photosService } from '../services/PhotosService';

const router: Router = Router();

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

// User ID aus Request holen
const getUserId = (req: Request): string => {
  const userId = req.headers['x-user-id'] as string || req.body?.userId;
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
    
    const result = await photosService.getPhotos(userId, albumId, { limit, offset, favoritesOnly });
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
    
    const { albumId, takenAt, latitude, longitude, camera, appDeviceId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Kein Foto hochgeladen' });
    }

    const photo = await photosService.uploadPhoto(
      userId,
      albumId || null,
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer,
      {
        takenAt: takenAt ? parseInt(takenAt) : undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        camera: camera || undefined,
        appDeviceId: appDeviceId || undefined,
      }
    );

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
    
    const { albumId } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Keine Fotos hochgeladen' });
    }

    const uploaded = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const photo = await photosService.uploadPhoto(
          userId,
          albumId || null,
          file.originalname,
          file.mimetype,
          file.buffer
        );
        uploaded.push(photo);
      } catch (err) {
        errors.push({ filename: file.originalname, error: (err as Error).message });
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

export default router;
