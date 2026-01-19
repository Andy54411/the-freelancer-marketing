import { Router, Request, Response } from 'express';
import mongoDBService from '../services/MongoDBService';

const router = Router();

/**
 * E2E Key Registry Routes
 * =======================
 * Verwaltet öffentliche Schlüssel für E2E-Verschlüsselung
 * 
 * WICHTIG: Hier werden NUR öffentliche Schlüssel gespeichert!
 * Private Schlüssel bleiben auf dem Gerät des Nutzers.
 */

interface E2EPublicKeyRecord {
  email: string;
  publicKey: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/chat/keys
 * Listet alle registrierten öffentlichen Schlüssel
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const collection = mongoDBService.getCollection('e2e_public_keys');
    
    const keys = await collection.find({}).toArray();
    
    res.json({
      success: true,
      keys: keys.map((k) => ({
        email: k.email,
        publicKey: k.publicKey,
        deviceId: k.deviceId,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Schlüssel:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /api/chat/keys
 * Registriert oder aktualisiert einen öffentlichen Schlüssel
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, publicKey, deviceId = 'default' } = req.body;
    
    if (!email || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail und öffentlicher Schlüssel sind erforderlich',
      });
    }
    
    const collection = mongoDBService.getCollection('e2e_public_keys');
    
    const now = new Date().toISOString();
    
    // Upsert - Erstellen oder Aktualisieren
    await collection.updateOne(
      { email, deviceId },
      {
        $set: {
          email,
          publicKey,
          deviceId,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Öffentlicher Schlüssel registriert',
    });
  } catch (error) {
    console.error('Fehler beim Registrieren des Schlüssels:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /api/chat/keys/:email
 * Holt den öffentlichen Schlüssel eines Nutzers
 */
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    const collection = mongoDBService.getCollection('e2e_public_keys');
    
    const keyRecord = await collection.findOne({ email });
    
    if (!keyRecord) {
      return res.status(404).json({
        success: false,
        error: 'Öffentlicher Schlüssel nicht gefunden',
      });
    }
    
    res.json({
      success: true,
      email: keyRecord.email,
      publicKey: keyRecord.publicKey,
      deviceId: keyRecord.deviceId,
      createdAt: keyRecord.createdAt,
      updatedAt: keyRecord.updatedAt,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Schlüssels:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /api/chat/keys/:email
 * Löscht den öffentlichen Schlüssel eines Nutzers
 */
router.delete('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    const collection = mongoDBService.getCollection('e2e_public_keys');
    
    const result = await collection.deleteMany({ email });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Öffentlicher Schlüssel nicht gefunden',
      });
    }
    
    res.json({
      success: true,
      message: 'Öffentlicher Schlüssel gelöscht',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Schlüssels:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /api/chat/keys/batch
 * Holt die öffentlichen Schlüssel mehrerer Nutzer
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;
    
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Liste ist erforderlich',
      });
    }
    
    const collection = mongoDBService.getCollection('e2e_public_keys');
    
    const keyRecords = await collection
      .find({ email: { $in: emails } })
      .toArray();
    
    const keys: { [email: string]: string } = {};
    for (const record of keyRecords) {
      keys[record.email] = record.publicKey;
    }
    
    res.json({
      success: true,
      keys,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Schlüssel:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

export default router;
