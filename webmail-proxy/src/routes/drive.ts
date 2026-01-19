import { Router, Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
import driveService from '../services/DriveServiceMongo';
import { ThumbnailService } from '../services/ThumbnailService';

const router: Router = Router();

// Multer fuer File Uploads (in Memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max (wird im Service nochmal geprueft)
  },
});

// User ID aus Request holen (kommt vom Auth Middleware)
const getUserId = (req: Request): string => {
  const userId = req.headers['x-user-id'] as string || req.body?.userId;
  if (!userId) {
    throw new Error('User ID required');
  }
  return userId;
};

// ==================== STORAGE ====================

// GET /drive/storage - Speicherinfo abrufen
router.get('/storage', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const storage = await driveService.getStorageInfo(userId);
    res.json({ success: true, storage });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== FOLDERS ====================

// GET /drive/folders - Root-Inhalte oder alle Ordner
router.get('/folders', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contents = await driveService.getFolderContents(userId, null);
    res.json({ success: true, ...contents });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/folders/:id - Ordner-Details
router.get('/folders/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const folder = await driveService.getFolder(userId, req.params.id);
    if (!folder) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }
    res.json({ success: true, folder });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/folders/:id/contents - Ordner-Inhalte
router.get('/folders/:id/contents', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contents = await driveService.getFolderContents(userId, req.params.id);
    res.json({ success: true, ...contents });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /drive/folders - Neuen Ordner erstellen
router.post('/folders', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, parentId } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Folder name required' });
    }

    const folder = await driveService.createFolder(userId, name.trim(), parentId || null);
    res.json({ success: true, folder });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /drive/folders/:id - Ordner umbenennen/verschieben
router.patch('/folders/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, parentId } = req.body;
    
    let folder;
    if (name !== undefined) {
      folder = await driveService.renameFolder(userId, req.params.id, name.trim());
    }
    if (parentId !== undefined) {
      folder = await driveService.moveFolder(userId, req.params.id, parentId);
    }
    
    res.json({ success: true, folder });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /drive/folders/:id - Ordner loeschen (Soft Delete)
router.delete('/folders/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await driveService.deleteFolder(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== FILES ====================

// POST /drive/files/upload - Datei hochladen
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/files/upload', upload.single('file'), async (req: any, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || req.body?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }
    const { folderId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const file = await driveService.uploadFile(
      userId,
      folderId || null,
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer
    );

    res.json({ success: true, file });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/files/:id - Datei herunterladen
router.get('/files/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const result = await driveService.getFileBuffer(userId, req.params.id);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const { file, buffer } = result;
    
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/files/:id/thumbnail - Datei-Thumbnail (fuer Vorschau)
router.get('/files/:id/thumbnail', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const file = await driveService.getFile(userId, req.params.id);
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Generiere oder hole Thumbnail
    const thumbnail = await ThumbnailService.getThumbnail(
      file.id,
      file.storagePath,
      file.mimeType || 'application/octet-stream'
    );

    if (!thumbnail) {
      return res.status(404).json({ success: false, error: 'Thumbnail not available' });
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h Cache
    res.send(thumbnail);
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/files/:id/metadata - Datei-Metadaten
router.get('/files/:id/metadata', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const file = await driveService.getFile(userId, req.params.id);
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.json({ success: true, file });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /drive/files/:id - Datei umbenennen/verschieben
router.patch('/files/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, folderId } = req.body;
    
    let file;
    if (name !== undefined) {
      file = await driveService.renameFile(userId, req.params.id, name.trim());
    }
    if (folderId !== undefined) {
      file = await driveService.moveFile(userId, req.params.id, folderId);
    }
    
    res.json({ success: true, file });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /drive/files/:id - Datei loeschen (Soft Delete)
router.delete('/files/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await driveService.deleteFile(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== TRASH ====================

// GET /drive/trash - Papierkorb anzeigen
router.get('/trash', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const trash = await driveService.getTrash(userId);
    res.json({ success: true, ...trash });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /drive/trash/files/:id/restore - Datei wiederherstellen
router.post('/trash/files/:id/restore', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const file = await driveService.restoreFile(userId, req.params.id);
    res.json({ success: true, file });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /drive/trash/folders/:id/restore - Ordner wiederherstellen
router.post('/trash/folders/:id/restore', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const folder = await driveService.restoreFolder(userId, req.params.id);
    res.json({ success: true, folder });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /drive/trash/files/:id - Datei endgueltig loeschen
router.delete('/trash/files/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await driveService.permanentDeleteFile(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// DELETE /drive/trash/folders/:id - Ordner endgueltig loeschen
router.delete('/trash/folders/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    await driveService.permanentDeleteFolder(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// ==================== ADMIN ENDPOINTS ====================

// GET /drive/admin/users - Alle User (paginiert)
router.get('/admin/users', async (req: Request, res: Response) => {
  try {
    // TODO: Admin-Check hier einfuegen
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await driveService.getAllUsers(limit, offset);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/admin/users/:id - User-Details
router.get('/admin/users/:id', async (req: Request, res: Response) => {
  try {
    // TODO: Admin-Check hier einfuegen
    const user = await driveService.getOrCreateUser(req.params.id);
    const storage = await driveService.getStorageInfo(req.params.id);
    res.json({ success: true, user, storage });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// PATCH /drive/admin/users/:id/plan - Plan aendern
router.patch('/admin/users/:id/plan', async (req: Request, res: Response) => {
  try {
    // TODO: Admin-Check hier einfuegen
    const { plan } = req.body;
    if (!['free', 'plus', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }
    
    const user = await driveService.updateUserPlan(req.params.id, plan);
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// GET /drive/admin/stats - Gesamtstatistiken
router.get('/admin/stats', async (_req: Request, res: Response) => {
  try {
    // TODO: Admin-Check hier einfuegen
    const stats = await driveService.getAdminStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

// POST /drive/admin/cleanup - Alte Papierkorb-Eintraege loeschen
router.post('/admin/cleanup', async (req: Request, res: Response) => {
  try {
    // TODO: Admin-Check hier einfuegen
    const daysOld = parseInt(req.body.daysOld) || 30;
    const result = await driveService.cleanupOldTrash(daysOld);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export const driveRouter = router;
