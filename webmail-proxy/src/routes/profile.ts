/**
 * Profile Routes - API für Webmail-Profilverwaltung
 * 
 * MONGODB-VERSION - Ersetzt SQLite-basierte Version
 * 
 * Endpoints:
 * GET  /api/profile/:email         - Profil abrufen
 * POST /api/profile/sync           - Company-Daten synchronisieren, Telefon zurückgeben
 * POST /api/profile/avatar         - Avatar-Bild hochladen
 * GET  /api/profile/avatar/:email  - Avatar-Bild abrufen
 */

import { Router, Request, Response } from 'express';
import profileService from '../services/ProfileServiceMongo';
import { driveServiceMongo } from '../services/DriveServiceMongo';
import { photosServiceMongo } from '../services/PhotosServiceMongo';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Avatar-Verzeichnis auf Hetzner
const AVATAR_DIR = '/opt/taskilo/avatars';

// Verzeichnis erstellen falls nicht vorhanden
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  console.log('[Profile] Avatar-Verzeichnis erstellt:', AVATAR_DIR);
}

/**
 * GET /profile/:email
 * Profil anhand der E-Mail-Adresse abrufen
 */
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    const profile = await profileService.getProfile(email);

    if (!profile) {
      // Flutter App Kompatibilität: Leeres Profil statt 404
      // So kann die App damit umgehen ohne Fehler zu werfen
      return res.json({
        success: true,
        profile: {
          email: email,
          firstName: null,
          lastName: null,
          phone: null,
          phoneVerified: false,
          hasCompany: false,
          companyId: null,
          createdAt: null,
        },
      });
    }

    // Sensible Daten nicht vollständig zurückgeben
    res.json({
      success: true,
      profile: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        phoneVerified: profile.phoneVerified,
        hasCompany: !!profile.companyId,
        companyId: profile.companyId,
        createdAt: profile.createdAt,
      },
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Profils',
    });
  }
});

/**
 * POST /profile/sync
 * Company-Daten aus Firebase synchronisieren
 * Gibt die verifizierte Telefonnummer zurück
 * 
 * Body:
 * {
 *   email: "user@taskilo.de",
 *   companyId: "LSeyPKLSCXTnyQd48Vuc6JLx7nH2",
 *   companyData: {
 *     companyName: "Mietkoch Andy",
 *     address: "Siedlung am Wald 6",
 *     city: "Sellin",
 *     postalCode: "18586",
 *     country: "DE",
 *     vatId: "DE123456789",
 *     taxNumber: "1234567890",
 *     iban: "LT703250024720869498",
 *     bic: "CJKSDAWHJFAE",
 *     bankName: "COM",
 *     industry: "Hotel & Gastronomie",
 *     legalForm: "Einzelunternehmen",
 *     // ... weitere Felder
 *   }
 * }
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { email, companyId, companyData } = req.body;

    // Validierung
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse ist erforderlich',
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company-ID ist erforderlich',
      });
    }

    if (!email.toLowerCase().endsWith('@taskilo.de')) {
      return res.status(400).json({
        success: false,
        error: 'Nur @taskilo.de E-Mail-Adressen können synchronisiert werden',
      });
    }

    // Synchronisation durchführen
    const result = await profileService.syncCompanyData({
      email,
      companyId,
      companyData: companyData || {},
    });

    // Bei fehlendem Profil (bestehende Konten vor ProfileService) trotzdem Erfolg zurückgeben
    // Aber ohne verifizierte Telefonnummer - es gibt einfach keine
    if (!result.success && result.error?.includes('nicht gefunden')) {
      console.log(`[Profile] Kein Profil für ${email} - bestehendes Konto ohne verifizierte Telefonnummer`);
      return res.json({
        success: true,
        message: 'Konto existiert, aber keine verifizierte Telefonnummer vorhanden',
        phone: null,
        phoneVerified: false,
        profileMissing: true,
      });
    }

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    console.log(`[Profile] Sync completed for ${email} -> Company ${companyId}`);
    console.log(`[Profile] Returning verified phone: ${result.phone}`);

    res.json({
      success: true,
      message: 'Synchronisation erfolgreich',
      phone: result.phone,
      phoneVerified: result.phoneVerified,
    });
  } catch (error) {
    console.error('[Profile] Error syncing profile:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Synchronisation',
    });
  }
});

/**
 * GET /profile/by-company/:companyId
 * Profil anhand der Company-ID abrufen
 */
router.get('/by-company/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company-ID ist erforderlich',
      });
    }

    const profile = await profileService.getProfileByCompanyId(companyId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Kein Profil mit dieser Company-ID gefunden',
      });
    }

    res.json({
      success: true,
      profile: {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        phoneVerified: profile.phoneVerified,
        companyId: profile.companyId,
        companyName: profile.companyName,
        companyAddress: profile.companyAddress,
        companyCity: profile.companyCity,
        companyPostalCode: profile.companyPostalCode,
        companyCountry: profile.companyCountry,
        companyVatId: profile.companyVatId,
        companyTaxNumber: profile.companyTaxNumber,
        companyIban: profile.companyIban,
        companyBic: profile.companyBic,
        companyBankName: profile.companyBankName,
        companyIndustry: profile.companyIndustry,
        companyLegalForm: profile.companyLegalForm,
        companySyncedAt: profile.companySyncedAt,
        accountStatus: profile.accountStatus,
        suspended: profile.suspended,
        blocked: profile.blocked,
      },
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile by company:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Profils',
    });
  }
});

/**
 * POST /profile/avatar
 * Avatar-Bild hochladen (Base64)
 * 
 * Body:
 * {
 *   email: "user@taskilo.de",
 *   image: "data:image/jpeg;base64,/9j/4AAQ..."
 * }
 */
router.post('/avatar', async (req: Request, res: Response) => {
  try {
    const { email, image } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    if (!image || !image.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiges Bildformat. Bitte Base64-kodiertes Bild senden.',
      });
    }

    // Base64-Daten extrahieren
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiges Base64-Format',
      });
    }

    const extension = matches[1]; // jpeg, png, webp, etc.
    const base64Data = matches[2];
    
    // Nur erlaubte Formate
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    if (!allowedFormats.includes(extension.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Nicht unterstütztes Bildformat. Erlaubt: JPEG, PNG, WebP, GIF',
      });
    }

    // Maximale Größe prüfen (5 MB)
    const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (sizeInBytes > maxSize) {
      return res.status(400).json({
        success: false,
        error: 'Bild zu groß. Maximale Größe: 5 MB',
      });
    }

    // Dateiname: email-hash.extension
    const emailHash = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${emailHash}.${extension}`;
    const filepath = path.join(AVATAR_DIR, filename);

    // Altes Bild löschen (falls anderes Format)
    const existingFiles = fs.readdirSync(AVATAR_DIR).filter(f => f.startsWith(emailHash));
    for (const file of existingFiles) {
      fs.unlinkSync(path.join(AVATAR_DIR, file));
    }

    // Neues Bild speichern
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);

    // Avatar-URL im Profil speichern
    const avatarUrl = `/api/profile/avatar/${encodeURIComponent(email.toLowerCase())}`;
    await profileService.updateProfile(email, { avatarUrl });

    console.log(`[Profile] Avatar gespeichert für ${email}: ${filename} (${Math.round(sizeInBytes / 1024)} KB)`);

    res.json({
      success: true,
      avatarUrl,
      size: sizeInBytes,
    });
  } catch (error) {
    console.error('[Profile] Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Avatars',
    });
  }
});

/**
 * GET /profile/avatar/:email
 * Avatar-Bild abrufen
 */
router.get('/avatar/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    // Datei suchen (mit beliebiger Extension)
    const emailHash = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const files = fs.readdirSync(AVATAR_DIR).filter(f => f.startsWith(emailHash));

    if (files.length === 0) {
      // Kein Avatar vorhanden - 204 No Content
      return res.status(204).send();
    }

    const filename = files[0];
    const filepath = path.join(AVATAR_DIR, filename);
    const extension = path.extname(filename).slice(1).toLowerCase();

    // MIME-Type bestimmen
    const mimeTypes: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'jpg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
    };

    const mimeType = mimeTypes[extension] || 'image/jpeg';

    // Caching-Header setzen (1 Tag)
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400',
      'ETag': `"${emailHash}"`,
    });

    // Bild senden
    const imageBuffer = fs.readFileSync(filepath);
    res.send(imageBuffer);
  } catch (error) {
    console.error('[Profile] Error fetching avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Avatars',
    });
  }
});

/**
 * DELETE /profile/avatar/:email
 * Avatar-Bild löschen
 */
router.delete('/avatar/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    // Datei suchen und löschen
    const emailHash = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const files = fs.readdirSync(AVATAR_DIR).filter(f => f.startsWith(emailHash));

    for (const file of files) {
      fs.unlinkSync(path.join(AVATAR_DIR, file));
    }

    // Avatar-URL im Profil löschen
    await profileService.updateProfile(email, { avatarUrl: '' });

    console.log(`[Profile] Avatar gelöscht für ${email}`);

    res.json({
      success: true,
      message: 'Avatar wurde gelöscht',
    });
  } catch (error) {
    console.error('[Profile] Error deleting avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Avatars',
    });
  }
});

/**
 * GET /profile/storage/:email
 * Speichernutzung für einen Benutzer abrufen
 * Berechnet echten Speicherverbrauch aus Drive + Fotos + E-Mails
 */
router.get('/storage/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    // Standard: 100 GB Speicher
    const totalBytes = 100 * 1024 * 1024 * 1024; // 100 GB
    
    // Echte Speichernutzung aus Drive, Fotos und E-Mails berechnen
    let driveUsed = 0;
    let photosUsed = 0;
    let emailsUsed = 0;
    
    // Drive-Speicher abrufen
    try {
      const driveInfo = await driveServiceMongo.getStorageInfo(email);
      driveUsed = driveInfo.used || 0;
    } catch (driveError) {
      console.warn('[Profile] Could not fetch drive storage for', email, driveError);
    }
    
    // Fotos-Speicher abrufen
    try {
      const photosInfo = await photosServiceMongo.getStorageInfo(email);
      photosUsed = photosInfo.used || 0;
    } catch (photosError) {
      console.warn('[Profile] Could not fetch photos storage for', email, photosError);
    }
    
    // E-Mail-Speicher (TODO: Mailcow API für echte Werte)
    // Für jetzt schätzen wir basierend auf Postfachgröße
    emailsUsed = 0;
    
    // Gesamtspeicher berechnen
    const usedBytes = driveUsed + photosUsed + emailsUsed;
    const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
    const usedGB = usedBytes / (1024 * 1024 * 1024);
    const totalGB = totalBytes / (1024 * 1024 * 1024);

    res.json({
      success: true,
      data: {
        usedBytes,
        totalBytes,
        usedPercent: Math.round(usedPercent * 100) / 100,
        usedGB: Math.round(usedGB * 100) / 100,
        totalGB,
        breakdown: {
          drive: driveUsed,
          photos: photosUsed,
          emails: emailsUsed,
          driveFormatted: formatBytes(driveUsed),
          photosFormatted: formatBytes(photosUsed),
          emailsFormatted: formatBytes(emailsUsed),
        },
      },
    });
  } catch (error) {
    console.error('[Profile] Error fetching storage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Speichernutzung',
    });
  }
});

// Hilfsfunktion zum Formatieren von Bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /profile/linked-accounts/:email
 * Verknüpfte Konten für einen Benutzer abrufen
 */
router.get('/linked-accounts/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    // Verknüpfte Konten aus Profil laden
    const profile = await profileService.getProfile(email);
    
    // Linked Accounts aus Profil oder leere Liste
    const linkedAccounts = profile?.linkedAccounts || [];

    res.json({
      success: true,
      data: linkedAccounts,
    });
  } catch (error) {
    console.error('[Profile] Error fetching linked accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der verknüpften Konten',
    });
  }
});

/**
 * POST /profile/linked-accounts/:email
 * Verknüpftes Konto hinzufügen
 */
router.post('/linked-accounts/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { linkedEmail, name } = req.body;

    if (!email || !email.includes('@') || !linkedEmail || !linkedEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige E-Mail-Adresse',
      });
    }

    // Profil laden
    const profile = await profileService.getProfile(email);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profil nicht gefunden',
      });
    }

    // Verknüpftes Konto hinzufügen
    const linkedAccounts = profile.linkedAccounts || [];
    
    // Prüfen ob bereits verknüpft
    if (linkedAccounts.some((a: { email: string }) => a.email === linkedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Konto bereits verknüpft',
      });
    }

    linkedAccounts.push({
      email: linkedEmail,
      name: name || linkedEmail.split('@')[0],
      addedAt: new Date().toISOString(),
    });

    await profileService.updateProfile(email, { linkedAccounts });

    res.json({
      success: true,
      data: linkedAccounts,
    });
  } catch (error) {
    console.error('[Profile] Error adding linked account:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen des verknüpften Kontos',
    });
  }
});

export default router;
