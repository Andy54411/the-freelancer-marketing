/**
 * Custom Domains API Router
 * ==========================
 * 
 * API-Endpunkte für Custom Domain Management auf Hetzner.
 * 
 * Endpunkte:
 * - POST   /api/domains/check   - Domain-Existenz prüfen (für Registrierung)
 * - GET    /api/domains         - Eigene Domains auflisten
 * - POST   /api/domains         - Neue Domain hinzufügen
 * - GET    /api/domains/:id     - Domain-Details abrufen
 * - DELETE /api/domains/:id     - Domain löschen
 * - POST   /api/domains/:id/verify   - Domain verifizieren
 * - POST   /api/domains/:id/activate - Domain aktivieren
 * - GET    /api/domains/:id/mailboxes - Mailboxen auflisten
 * - POST   /api/domains/:id/mailboxes - Mailbox erstellen
 */

import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import customDomainService, { AddDomainSchema, CreateMailboxSchema } from '../services/CustomDomainService';

const router: RouterType = Router();

// Auth-Header validieren und E-Mail extrahieren
function getAuthEmail(req: Request): string | null {
  const email = req.headers['x-user-email'] as string;
  if (!email || !z.string().email().safeParse(email).success) {
    return null;
  }
  return email;
}

// ============================================
// DOMAIN CHECK (ÖFFENTLICH für Registrierung)
// ============================================

/**
 * POST /api/domains/check
 * Prüft ob eine Domain bereits registriert ist
 * KEINE Authentifizierung erforderlich (für Registrierungsprozess)
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Domain erforderlich',
      });
    }

    const result = await customDomainService.checkDomainExists(domain);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================
// DOMAIN CRUD
// ============================================

/**
 * GET /api/domains
 * Alle Domains des Benutzers auflisten
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    const result = await customDomainService.getUserDomains(email);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/domains
 * Neue Domain hinzufügen
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    const validation = AddDomainSchema.safeParse({
      email,
      domain: req.body.domain,
      dnsProvider: req.body.dnsProvider || 'external',
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validierungsfehler',
        details: validation.error.errors,
      });
    }

    const result = await customDomainService.addDomain(
      email,
      validation.data.domain,
      validation.data.dnsProvider
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/domains/:id
 * Domain-Details abrufen
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    const result = await customDomainService.getDomain(req.params.id);
    
    if (!result.success || !result.data) {
      return res.status(404).json(result);
    }

    // Eigentümerschaft prüfen
    if (result.data.email !== email) {
      return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    }

    // DNS-Anweisungen hinzufügen
    const dnsInstructions = customDomainService.getDNSInstructions(
      result.data.domain,
      result.data.verificationCode
    );

    return res.json({
      success: true,
      data: {
        ...result.data,
        dnsInstructions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/domains/:id
 * Domain löschen
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    const result = await customDomainService.deleteDomain(req.params.id, email);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================
// DOMAIN ACTIONS
// ============================================

/**
 * POST /api/domains/:id/verify
 * Domain-Besitz verifizieren
 */
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    // Eigentümerschaft prüfen
    const domain = await customDomainService.getDomain(req.params.id);
    if (!domain.success || !domain.data) {
      return res.status(404).json({ success: false, error: 'Domain nicht gefunden' });
    }
    if (domain.data.email !== email) {
      return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    }

    const result = await customDomainService.verifyDomain(req.params.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/domains/:id/activate
 * Domain aktivieren (Mailcow + DNS)
 */
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    // Eigentümerschaft prüfen
    const domain = await customDomainService.getDomain(req.params.id);
    if (!domain.success || !domain.data) {
      return res.status(404).json({ success: false, error: 'Domain nicht gefunden' });
    }
    if (domain.data.email !== email) {
      return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    }

    const useHetznerDNS = req.body.useHetznerDNS === true;
    const result = await customDomainService.activateDomain(req.params.id, useHetznerDNS);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================
// MAILBOXES
// ============================================

/**
 * GET /api/domains/:id/mailboxes
 * Mailboxen einer Domain auflisten
 */
router.get('/:id/mailboxes', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    // Eigentümerschaft prüfen
    const domain = await customDomainService.getDomain(req.params.id);
    if (!domain.success || !domain.data) {
      return res.status(404).json({ success: false, error: 'Domain nicht gefunden' });
    }
    if (domain.data.email !== email) {
      return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    }

    const result = await customDomainService.getDomainMailboxes(req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/domains/:id/mailboxes
 * Neue Mailbox erstellen
 */
router.post('/:id/mailboxes', async (req: Request, res: Response) => {
  try {
    const email = getAuthEmail(req);
    if (!email) {
      return res.status(401).json({ success: false, error: 'Nicht authentifiziert' });
    }

    // Eigentümerschaft prüfen
    const domain = await customDomainService.getDomain(req.params.id);
    if (!domain.success || !domain.data) {
      return res.status(404).json({ success: false, error: 'Domain nicht gefunden' });
    }
    if (domain.data.email !== email) {
      return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    }

    const validation = CreateMailboxSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validierungsfehler',
        details: validation.error.errors,
      });
    }

    const result = await customDomainService.createMailbox(
      req.params.id,
      validation.data.localPart,
      validation.data.name,
      validation.data.password,
      validation.data.quotaMB,
      validation.data.active
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverfehler',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export const domainsRouter: RouterType = router;
export default router;
