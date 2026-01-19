/**
 * Profile Routes - API für Webmail-Profilverwaltung
 * 
 * MONGODB-VERSION - Ersetzt SQLite-basierte Version
 * 
 * Endpoints:
 * GET  /api/profile/:email     - Profil abrufen
 * POST /api/profile/sync       - Company-Daten synchronisieren, Telefon zurückgeben
 */

import { Router, Request, Response } from 'express';
import profileService from '../services/ProfileServiceMongo';

const router = Router();

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
      return res.status(404).json({
        success: false,
        error: 'Profil nicht gefunden',
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

export default router;
