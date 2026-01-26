import { Router, Request, Response } from 'express';
import mongoDBService from '../services/MongoDBService';
import { z } from 'zod';
import { Resolver } from 'dns';
import { promisify } from 'util';

const dns = new Resolver();
const resolveTxt = promisify(dns.resolveTxt.bind(dns));
const resolveMx = promisify(dns.resolveMx.bind(dns));
const resolveCname = promisify(dns.resolveCname.bind(dns));

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
 * Hilfsfunktion: Überprüft DNS-Einträge
 */
async function verifyDnsRecords(domain: string, expectedRecords: any[]): Promise<{ verified: boolean; errors: string[] }> {
  const errors: string[] = [];
  let allVerified = true;

  for (const record of expectedRecords) {
    try {
      switch (record.type) {
        case 'TXT':
          const txtRecords = await resolveTxt(record.name);
          const txtValues = txtRecords.flat();
          const expectedValue = record.value;
          
          if (!txtValues.some(val => val.includes(expectedValue) || expectedValue.includes(val))) {
            errors.push(`TXT Record für ${record.name} nicht gefunden: Erwartet "${expectedValue}"`);
            allVerified = false;
          }
          break;

        case 'MX':
          const mxRecords = await resolveMx(record.name);
          const expectedMx = record.value.toLowerCase();
          
          // Prüfe ob Taskilo MX-Record existiert
          const taskiloMx = mxRecords.find(mx => 
            mx.exchange.toLowerCase().includes('taskilo') || 
            mx.exchange.toLowerCase() === expectedMx
          );
          
          if (!taskiloMx) {
            errors.push(`MX Record für ${record.name} nicht gefunden: Erwartet ${expectedMx}`);
            allVerified = false;
          }
          
          // Prüfe auf konkurrierende MX-Records (z.B. Google Mail)
          const googleMx = mxRecords.find(mx => 
            mx.exchange.toLowerCase().includes('google') ||
            mx.exchange.toLowerCase().includes('aspmx')
          );
          
          if (googleMx) {
            errors.push(`Konflikt: Google Mail MX-Record gefunden (${googleMx.exchange}). Bitte entfernen Sie diesen.`);
            allVerified = false;
          }
          break;

        case 'CNAME':
          try {
            const cnameRecords = await resolveCname(record.name);
            const expectedCname = record.value.toLowerCase();
            
            if (!cnameRecords.some(cname => cname.toLowerCase().includes(expectedCname) || expectedCname.includes(cname.toLowerCase()))) {
              errors.push(`CNAME Record für ${record.name} nicht gefunden: Erwartet ${expectedCname}`);
              allVerified = false;
            }
          } catch (err: any) {
            if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
              errors.push(`CNAME Record für ${record.name} nicht gefunden`);
              allVerified = false;
            } else {
              throw err;
            }
          }
          break;
      }
    } catch (err: any) {
      console.error(`DNS Check Error for ${record.type} ${record.name}:`, err);
      if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
        errors.push(`${record.type} Record für ${record.name} nicht gefunden (noch nicht propagiert)`);
        allVerified = false;
      } else {
        errors.push(`DNS-Abfrage-Fehler für ${record.type} ${record.name}: ${err.message}`);
        allVerified = false;
      }
    }
  }

  return { verified: allVerified, errors };
}

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

    const collection = mongoDBService.getCollection('webmail_dns_setup');
    const dnsConfig = await collection.findOne({ domain });

    if (!dnsConfig) {
      return res.status(404).json({
        success: false,
        error: 'DNS-Konfiguration nicht gefunden',
      });
    }

    // Echte DNS-Verifizierung
    const { verified, errors } = await verifyDnsRecords(domain, dnsConfig.dnsRecords);

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
      await collection.updateOne(
        { domain },
        {
          $set: {
            status: 'pending',
            updatedAt: new Date(),
            lastCheckErrors: errors,
          },
        }
      );

      return res.json({
        success: true,
        verified: false,
        message: 'DNS-Einträge noch nicht korrekt konfiguriert',
        errors,
      });
    }
  } catch (error) {
    console.error('DNS Verify Error:', error);
    return res.status(500).json({
      success: false,
      error: 'DNS-Verifizierung fehlgeschlagen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /api/dns/check-pending
 * Prüft alle pending DNS-Konfigurationen (für Cron-Job)
 */
router.get('/check-pending', async (req, res) => {
  try {
    const collection = mongoDBService.getCollection('webmail_dns_setup');
    
    // Finde alle pending DNS-Konfigurationen
    const pendingConfigs = await collection.find({ status: 'pending' }).toArray();
    
    console.log(`Checking ${pendingConfigs.length} pending DNS configurations...`);
    
    const results = [];
    
    for (const config of pendingConfigs) {
      try {
        const { verified, errors } = await verifyDnsRecords(config.domain, config.dnsRecords);
        
        if (verified) {
          // DNS verifiziert - Status updaten
          await collection.updateOne(
            { domain: config.domain },
            {
              $set: {
                status: 'verified',
                verifiedAt: new Date(),
                updatedAt: new Date(),
              },
            }
          );
          
          results.push({
            domain: config.domain,
            status: 'verified',
            message: 'DNS erfolgreich verifiziert',
          });
          
          // TODO: E-Mail-Benachrichtigung senden
          console.log(`✓ DNS verified for ${config.domain}`);
        } else {
          // Noch nicht verifiziert - Fehler speichern
          await collection.updateOne(
            { domain: config.domain },
            {
              $set: {
                updatedAt: new Date(),
                lastCheckErrors: errors,
                lastCheckedAt: new Date(),
              },
            }
          );
          
          results.push({
            domain: config.domain,
            status: 'pending',
            errors,
          });
          
          console.log(`✗ DNS not ready for ${config.domain}:`, errors);
        }
      } catch (err) {
        console.error(`Error checking DNS for ${config.domain}:`, err);
        results.push({
          domain: config.domain,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    
    return res.json({
      success: true,
      checked: pendingConfigs.length,
      results,
    });
  } catch (error) {
    console.error('Check Pending Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler beim Prüfen der DNS-Konfigurationen',
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
        lastCheckErrors: dnsConfig.lastCheckErrors,
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
