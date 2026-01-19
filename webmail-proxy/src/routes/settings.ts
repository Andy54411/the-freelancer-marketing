/**
 * Settings Routes - API-Endpoints für Webmail-Einstellungen
 * 
 * MONGODB-VERSION - Ersetzt SQLite-basierte Version
 * 
 * Endpoints:
 * GET  /api/settings/:email          - Einstellungen abrufen
 * PUT  /api/settings/:email          - Einstellungen speichern
 * POST /api/settings/:email/reset    - Auf Defaults zurücksetzen
 * 
 * Signaturen:
 * POST   /api/settings/:email/signatures          - Neue Signatur hinzufügen
 * PUT    /api/settings/:email/signatures/:sigId   - Signatur aktualisieren
 * DELETE /api/settings/:email/signatures/:sigId   - Signatur löschen
 */

import { Router, Request, Response } from 'express';
import settingsService from '../services/SettingsServiceMongo';
import type { WebmailSettings } from '../services/MongoDBService';

const router = Router();

/**
 * GET /api/settings/:email
 * Einstellungen für einen Benutzer abrufen
 */
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse fehlt',
      });
    }
    
    const settings = await settingsService.getSettings(email);
    
    if (!settings) {
      // Neue Einstellungen mit Defaults zurückgeben
      const defaults = settingsService.getDefaultSettings();
      return res.json({
        success: true,
        settings: {
          email: email.toLowerCase().trim(),
          ...defaults,
          createdAt: null,
          updatedAt: null,
        },
        isNew: true,
      });
    }
    
    res.json({
      success: true,
      settings,
      isNew: false,
    });
  } catch (error) {
    console.error('[Settings Route] Error getting settings:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Einstellungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * PUT /api/settings/:email
 * Einstellungen speichern oder aktualisieren
 */
router.put('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const settingsUpdate: Partial<WebmailSettings> = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse fehlt',
      });
    }
    
    // Validierung: Keine leeren Updates
    if (!settingsUpdate || Object.keys(settingsUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keine Einstellungen zum Speichern',
      });
    }
    
    const savedSettings = await settingsService.saveSettings(email, settingsUpdate);
    
    res.json({
      success: true,
      settings: savedSettings,
      message: 'Einstellungen gespeichert',
    });
  } catch (error) {
    console.error('[Settings Route] Error saving settings:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern der Einstellungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /api/settings/:email/reset
 * Einstellungen auf Defaults zurücksetzen
 */
router.post('/:email/reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse fehlt',
      });
    }
    
    // Alte Einstellungen löschen
    await settingsService.deleteSettings(email);
    
    // Neue Defaults speichern
    const defaults = settingsService.getDefaultSettings();
    const savedSettings = await settingsService.saveSettings(email, defaults);
    
    res.json({
      success: true,
      settings: savedSettings,
      message: 'Einstellungen zurückgesetzt',
    });
  } catch (error) {
    console.error('[Settings Route] Error resetting settings:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Zurücksetzen der Einstellungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ---- Signaturen-Endpoints ----

/**
 * POST /api/settings/:email/signatures
 * Neue Signatur hinzufügen
 */
router.post('/:email/signatures', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { name, content, isDefault } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse fehlt',
      });
    }
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Signaturname fehlt',
      });
    }
    
    const signature = await settingsService.addSignature(email, {
      name,
      content: content || '',
      isDefault: isDefault === true,
    });
    
    res.json({
      success: true,
      signature,
      message: 'Signatur hinzugefügt',
    });
  } catch (error) {
    console.error('[Settings Route] Error adding signature:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen der Signatur',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * PUT /api/settings/:email/signatures/:sigId
 * Signatur aktualisieren
 */
router.put('/:email/signatures/:sigId', async (req: Request, res: Response) => {
  try {
    const { email, sigId } = req.params;
    const updates = req.body;
    
    if (!email || !sigId) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse oder Signatur-ID fehlt',
      });
    }
    
    const signature = await settingsService.updateSignature(email, sigId, updates);
    
    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'Signatur nicht gefunden',
      });
    }
    
    res.json({
      success: true,
      signature,
      message: 'Signatur aktualisiert',
    });
  } catch (error) {
    console.error('[Settings Route] Error updating signature:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Signatur',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /api/settings/:email/signatures/:sigId
 * Signatur löschen
 */
router.delete('/:email/signatures/:sigId', async (req: Request, res: Response) => {
  try {
    const { email, sigId } = req.params;
    
    if (!email || !sigId) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse oder Signatur-ID fehlt',
      });
    }
    
    const deleted = await settingsService.deleteSignature(email, sigId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Signatur nicht gefunden',
      });
    }
    
    res.json({
      success: true,
      message: 'Signatur gelöscht',
    });
  } catch (error) {
    console.error('[Settings Route] Error deleting signature:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Signatur',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

export default router;
