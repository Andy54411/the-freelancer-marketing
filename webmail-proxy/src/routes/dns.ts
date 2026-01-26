import { Router, Request, Response } from 'express';
import mongoDBService from '../services/MongoDBService';
import { z } from 'zod';

const router: Router = Router();

// Zod-Schema für DNS-Konfiguration
const dnsSetupSchema = z.object({
  domain: z.string().min(1),
  userId: z.string().min(1),
  companyName: z.string().min(1),
  dnsRecords: z.array(z.object({
    type: z.enum(['TXT', 'MX', 'CNAME', 'A', 'AAAA']),
    name: z.string(),
    value: z.string(),
    ttl: z.string().optional(),
    priority: z.string().optional(),
  })),
  selectedHost: z.string().optional(),
  status: z.enum(['pending', 'verified', 'failed']).default('pending'),
});

/**
 * POST /api/dns/setup
 * Speichert DNS-Konfiguration für eine Domain
 */
router.post('/setup', async (req, res) => {
  try {
    const validation = dnsSetupSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Daten',
        details: validation.error.errors,
      });
    }

    const data = validation.data;
    const collection = mongoDBService.getCollection('webmail_dns_setup');

    // Prüfen ob Domain bereits existiert
    const existing = await collection.findOne({ domain: data.domain });
    
    if (existing) {
      // Update
      await collection.updateOne(
        { domain: data.domain },
        {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Insert
      await collection.insertOne({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        verifiedAt: null,
      });
    }

    return res.json({
      success: true,
      message: 'DNS-Konfiguration gespeichert',
    });
  } catch (error) {
    console.error('DNS Setup Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /api/dns/verify
 * Verifiziert DNS-Einträge für eine Domain
 */
router.post('/verify', async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain erforderlich',
      });
    }

    // TODO: Echte DNS-Abfrage implementieren
    // Für jetzt: Simuliere Verifizierung
    const collection = mongoDBService.getCollection('webmail_dns_setup');

    const dnsConfig = await collection.findOne({ domain });

    if (!dnsConfig) {
      return res.status(404).json({
        success: false,
        error: 'DNS-Konfiguration nicht gefunden',
      });
    }

    // Simuliere DNS-Check (in Produktion: echte DNS-Abfrage mit dns.promises.resolve())
    const verified = true; // TODO: Echte Verifizierung

    if (verified) {
      await collection.updateOne(
        { domain },
        {
          $set: {
            status: 'verified',
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      return res.json({
        success: true,
        verified: true,
        message: 'Domain erfolgreich verifiziert',
      });
    } else {
      return res.json({
        success: true,
        verified: false,
        message: 'DNS-Einträge noch nicht korrekt konfiguriert',
      });
    }
  } catch (error) {
    console.error('DNS Verify Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /api/dns/status/:domain
 * Prüft den Status der DNS-Konfiguration
 */
router.get('/status/:domain', async (req, res) => {
  try {
    const { domain } = req.params;

    const collection = mongoDBService.getCollection('webmail_dns_setup');

    const dnsConfig = await collection.findOne({ domain });

    if (!dnsConfig) {
      return res.status(404).json({
        success: false,
        error: 'DNS-Konfiguration nicht gefunden',
      });
    }

    return res.json({
      success: true,
      data: {
        domain: dnsConfig.domain,
        status: dnsConfig.status,
        createdAt: dnsConfig.createdAt,
        verifiedAt: dnsConfig.verifiedAt,
        records: dnsConfig.dnsRecords,
      },
    });
  } catch (error) {
    console.error('DNS Status Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Interner Serverfehler',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

export default router;
