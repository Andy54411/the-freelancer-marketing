/**
 * Newsletter Routes - Hetzner SQLite Backend
 * 
 * Alle Newsletter-Endpunkte:
 * - POST /newsletter/subscribe - Neue Anmeldung
 * - GET /newsletter/confirm - Bestätigung via Link
 * - POST /newsletter/confirm - Programmatische Bestätigung
 * - POST /newsletter/unsubscribe - Abmeldung
 * - GET /newsletter/subscribers - Liste (Admin)
 * - POST /newsletter/subscribers - Hinzufügen (Admin)
 * - PATCH /newsletter/subscribers/:id - Aktualisieren (Admin)
 * - DELETE /newsletter/subscribers/:id - Löschen (Admin)
 * - GET /newsletter/campaigns - Liste
 * - POST /newsletter/campaigns - Erstellen
 * - GET /newsletter/campaigns/:id - Details
 * - PATCH /newsletter/campaigns/:id - Aktualisieren
 * - DELETE /newsletter/campaigns/:id - Löschen
 * - POST /newsletter/campaigns/:id/send - Versenden
 * - GET /newsletter/templates - Liste
 * - POST /newsletter/templates - Erstellen
 * - PUT /newsletter/templates/:id - Aktualisieren
 * - DELETE /newsletter/templates/:id - Löschen
 * - GET /newsletter/analytics - Statistiken
 * - GET /newsletter/settings - Einstellungen
 * - PATCH /newsletter/settings - Aktualisieren
 * - POST /newsletter/track/open - Öffnung tracken
 * - POST /newsletter/track/click - Klick tracken
 */

import { Router, Request, Response } from 'express';
import { newsletterService } from '../services/NewsletterService';

const router = Router();

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * POST /newsletter/subscribe
 * Öffentlicher Endpunkt für Newsletter-Anmeldung
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, source, tags } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'E-Mail ist erforderlich' });
    }

    // E-Mail Validierung
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Ungültige E-Mail-Adresse' });
    }

    const result = await newsletterService.addSubscriber({
      email,
      firstName,
      lastName,
      source: source || 'website',
      tags: tags || [],
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: result.requiresConfirmation
        ? 'Bitte bestätigen Sie Ihre Anmeldung über den Link in der Bestätigungs-E-Mail.'
        : 'Erfolgreich angemeldet!',
      requiresConfirmation: result.requiresConfirmation,
    });
  } catch (error) {
    console.error('[Newsletter] Subscribe error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * GET /newsletter/confirm
 * Bestätigung via E-Mail-Link (Redirect)
 */
router.get('/confirm', async (req: Request, res: Response) => {
  try {
    const { id, token, email } = req.query;

    if (id && token) {
      const result = await newsletterService.confirmSubscription(id as string, token as string);
      
      if (result.success) {
        return res.redirect('https://taskilo.de/newsletter/confirmed');
      } else {
        return res.redirect(`https://taskilo.de/newsletter/error?message=${encodeURIComponent(result.error || 'Bestätigung fehlgeschlagen')}`);
      }
    }

    if (email && token) {
      const subscriber = newsletterService.getSubscriberByEmail(email as string);
      if (subscriber) {
        const result = await newsletterService.confirmSubscription(subscriber.id, token as string);
        if (result.success) {
          return res.redirect('https://taskilo.de/newsletter/confirmed');
        }
      }
      return res.redirect('https://taskilo.de/newsletter/error?message=Abonnent+nicht+gefunden');
    }

    res.status(400).json({ success: false, error: 'ID/Token oder Email/Token erforderlich' });
  } catch (error) {
    console.error('[Newsletter] Confirm error:', error);
    res.redirect('https://taskilo.de/newsletter/error?message=Interner+Fehler');
  }
});

/**
 * POST /newsletter/confirm
 * Programmatische Bestätigung
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { id, token, email } = req.body;

    if (id && token) {
      const result = await newsletterService.confirmSubscription(id, token);
      return res.json(result);
    }

    if (email && token) {
      const subscriber = newsletterService.getSubscriberByEmail(email);
      if (!subscriber) {
        return res.status(404).json({ success: false, error: 'Abonnent nicht gefunden' });
      }
      const result = await newsletterService.confirmSubscription(subscriber.id, token);
      return res.json(result);
    }

    res.status(400).json({ success: false, error: 'ID/Token oder Email/Token erforderlich' });
  } catch (error) {
    console.error('[Newsletter] Confirm error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * POST /newsletter/unsubscribe
 * Abmeldung vom Newsletter
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email, token, reason } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'E-Mail ist erforderlich' });
    }

    const result = await newsletterService.unsubscribe(email, token, reason);
    res.json(result);
  } catch (error) {
    console.error('[Newsletter] Unsubscribe error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * GET /newsletter/unsubscribe
 * Abmeldung via Link
 */
router.get('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.query;

    if (!email) {
      return res.redirect('https://taskilo.de/newsletter/error?message=E-Mail+fehlt');
    }

    const result = await newsletterService.unsubscribe(email as string, token as string);
    
    if (result.success) {
      res.redirect('https://taskilo.de/newsletter/unsubscribed');
    } else {
      res.redirect(`https://taskilo.de/newsletter/error?message=${encodeURIComponent(result.error || 'Fehler')}`);
    }
  } catch (error) {
    console.error('[Newsletter] Unsubscribe error:', error);
    res.redirect('https://taskilo.de/newsletter/error?message=Interner+Fehler');
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Subscribers
// ============================================================================

/**
 * GET /newsletter/subscribers
 * Liste aller Subscribers
 */
router.get('/subscribers', (req: Request, res: Response) => {
  try {
    const { status, search, limit, offset } = req.query;

    const subscribers = newsletterService.getSubscribers({
      status: status as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    const counts = newsletterService.getSubscriberCount();

    res.json({
      success: true,
      subscribers,
      total: subscribers.length,
      stats: counts,
    });
  } catch (error) {
    console.error('[Newsletter] Get subscribers error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * POST /newsletter/subscribers
 * Subscriber manuell hinzufügen (Admin)
 */
router.post('/subscribers', async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, source, tags } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'E-Mail ist erforderlich' });
    }

    const result = await newsletterService.addSubscriber({
      email,
      firstName,
      lastName,
      source: source || 'manual',
      tags: tags || [],
    });

    res.json(result);
  } catch (error) {
    console.error('[Newsletter] Add subscriber error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * PATCH /newsletter/subscribers/:id
 * Subscriber aktualisieren
 */
router.patch('/subscribers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, tags, status } = req.body;

    newsletterService.updateSubscriber(id, { firstName, lastName, tags, status });

    res.json({ success: true, message: 'Abonnent aktualisiert' });
  } catch (error) {
    console.error('[Newsletter] Update subscriber error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * DELETE /newsletter/subscribers/:id
 * Subscriber löschen (DSGVO)
 */
router.delete('/subscribers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    newsletterService.deleteSubscriber(id);

    res.json({ success: true, message: 'Abonnent gelöscht (DSGVO-konform)' });
  } catch (error) {
    console.error('[Newsletter] Delete subscriber error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Campaigns
// ============================================================================

/**
 * GET /newsletter/campaigns
 * Liste aller Kampagnen
 */
router.get('/campaigns', (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const campaigns = newsletterService.getCampaigns(status as string);

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('[Newsletter] Get campaigns error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * POST /newsletter/campaigns
 * Neue Kampagne erstellen
 */
router.post('/campaigns', (req: Request, res: Response) => {
  try {
    const {
      name, subject, previewText, fromName, fromEmail, replyTo,
      htmlContent, textContent, templateId, recipientType, recipientTags,
    } = req.body;

    if (!name || !subject || !fromName || !fromEmail || !htmlContent) {
      return res.status(400).json({ success: false, error: 'Pflichtfelder fehlen' });
    }

    const id = newsletterService.createCampaign({
      name, subject, previewText, fromName, fromEmail, replyTo,
      htmlContent, textContent, templateId, recipientType, recipientTags,
    });

    res.json({ success: true, campaignId: id });
  } catch (error) {
    console.error('[Newsletter] Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * GET /newsletter/campaigns/:id
 * Kampagne Details
 */
router.get('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = newsletterService.getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Kampagne nicht gefunden' });
    }

    res.json({ success: true, campaign });
  } catch (error) {
    console.error('[Newsletter] Get campaign error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * PATCH /newsletter/campaigns/:id
 * Kampagne aktualisieren
 */
router.patch('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    newsletterService.updateCampaign(id, req.body);

    res.json({ success: true, message: 'Kampagne aktualisiert' });
  } catch (error) {
    console.error('[Newsletter] Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * DELETE /newsletter/campaigns/:id
 * Kampagne löschen
 */
router.delete('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    newsletterService.deleteCampaign(id);

    res.json({ success: true, message: 'Kampagne gelöscht' });
  } catch (error) {
    console.error('[Newsletter] Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * POST /newsletter/campaigns/:id/send
 * Kampagne versenden
 */
router.post('/campaigns/:id/send', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await newsletterService.sendCampaign(id);

    res.json(result);
  } catch (error) {
    console.error('[Newsletter] Send campaign error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Templates
// ============================================================================

/**
 * GET /newsletter/templates
 * Liste aller Templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const templates = newsletterService.getTemplates(category as string);

    res.json({ success: true, templates });
  } catch (error) {
    console.error('[Newsletter] Get templates error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * POST /newsletter/templates
 * Neues Template erstellen
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, description, category, htmlContent, textContent, isDefault } = req.body;

    if (!name || !htmlContent) {
      return res.status(400).json({ success: false, error: 'Name und HTML-Inhalt erforderlich' });
    }

    const id = newsletterService.createTemplate({
      name, description, category, htmlContent, textContent, isDefault,
    });

    res.json({ success: true, templateId: id });
  } catch (error) {
    console.error('[Newsletter] Create template error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * GET /newsletter/templates/:id
 * Template Details
 */
router.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = newsletterService.getTemplateById(id);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template nicht gefunden' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('[Newsletter] Get template error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * PUT /newsletter/templates/:id
 * Template aktualisieren
 */
router.put('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, htmlContent, textContent, isDefault } = req.body;

    const existingTemplate = newsletterService.getTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ success: false, error: 'Template nicht gefunden' });
    }

    newsletterService.updateTemplate(id, {
      name,
      description,
      category,
      htmlContent,
      textContent,
      isDefault,
    });

    res.json({ success: true, message: 'Template aktualisiert' });
  } catch (error) {
    console.error('[Newsletter] Update template error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * DELETE /newsletter/templates/:id
 * Template löschen
 */
router.delete('/templates/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    newsletterService.deleteTemplate(id);

    res.json({ success: true, message: 'Template gelöscht' });
  } catch (error) {
    console.error('[Newsletter] Delete template error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS - Analytics & Settings
// ============================================================================

/**
 * GET /newsletter/analytics
 * Statistiken abrufen
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;
    const analytics = newsletterService.getAnalytics(campaignId as string);

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('[Newsletter] Get analytics error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * GET /newsletter/settings
 * Einstellungen abrufen
 */
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = newsletterService.getSettings();

    res.json({ success: true, settings });
  } catch (error) {
    console.error('[Newsletter] Get settings error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

/**
 * PATCH /newsletter/settings
 * Einstellungen aktualisieren
 */
router.patch('/settings', (req: Request, res: Response) => {
  try {
    newsletterService.updateSettings(req.body);

    res.json({ success: true, message: 'Einstellungen aktualisiert' });
  } catch (error) {
    console.error('[Newsletter] Update settings error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

// ============================================================================
// TRACKING ENDPOINTS
// ============================================================================

/**
 * GET /newsletter/track/open/:campaignId/:subscriberId
 * Öffnung tracken (Tracking-Pixel)
 */
router.get('/track/open/:campaignId/:subscriberId', (req: Request, res: Response) => {
  try {
    const { campaignId, subscriberId } = req.params;

    newsletterService.trackOpen(
      campaignId,
      subscriberId,
      req.ip || req.headers['x-forwarded-for'] as string,
      req.headers['user-agent']
    );

    // 1x1 transparent GIF
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(pixel);
  } catch (error) {
    console.error('[Newsletter] Track open error:', error);
    // Still return the pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

/**
 * GET /newsletter/track/click/:campaignId/:subscriberId
 * Klick tracken und weiterleiten
 */
router.get('/track/click/:campaignId/:subscriberId', (req: Request, res: Response) => {
  try {
    const { campaignId, subscriberId } = req.params;
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL fehlt' });
    }

    newsletterService.trackClick(
      campaignId,
      subscriberId,
      url as string,
      req.ip || req.headers['x-forwarded-for'] as string,
      req.headers['user-agent']
    );

    res.redirect(url as string);
  } catch (error) {
    console.error('[Newsletter] Track click error:', error);
    const { url } = req.query;
    if (url) {
      res.redirect(url as string);
    } else {
      res.redirect('https://taskilo.de');
    }
  }
});

// ============================================================================
// CLEANUP ENDPOINT
// ============================================================================

/**
 * POST /newsletter/cleanup
 * Abgelaufene pending Subscriptions löschen
 */
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const { hoursOld } = req.body;
    const deleted = newsletterService.cleanupExpiredPending(hoursOld || 48);

    res.json({ success: true, deletedCount: deleted });
  } catch (error) {
    console.error('[Newsletter] Cleanup error:', error);
    res.status(500).json({ success: false, error: 'Interner Server-Fehler' });
  }
});

export default router;
