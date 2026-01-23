/**
 * Taskilo Webmail Proxy - Contacts Routes
 * CardDAV-basierte Kontaktverwaltung über SOGo/Mailcow
 */

import { Router, Request, Response } from 'express';
import CardDAVService, { ContactSchema } from '../services/CardDAVService';
import { EmailService } from '../services/EmailService';
import { z } from 'zod';

const router: Router = Router();
const cardDAVService = new CardDAVService();

// Auth Schema
const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Legacy Contact interface (from email headers)
interface EmailContact {
  id: string;
  email: string;
  name: string;
  lastContacted: string;
  contactCount: number;
  source: 'sent' | 'received' | 'both';
}

/**
 * POST /contacts
 * Alle Kontakte aus CardDAV abrufen
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password } = AuthSchema.parse(req.body);
    const result = await cardDAVService.getContacts(email, password);

    res.json({
      success: true,
      contacts: result.contacts,
      total: result.total,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch contacts',
    });
  }
});

/**
 * POST /contacts/create
 * Neuen Kontakt in CardDAV erstellen
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email, password, contact } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      contact: ContactSchema.omit({ uid: true }),
    }).parse(req.body);

    const newContact = await cardDAVService.createContact(email, password, contact);

    res.status(201).json({
      success: true,
      contact: newContact,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create contact',
    });
  }
});

/**
 * POST /contacts/update
 * Kontakt in CardDAV aktualisieren
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    const { email, password, contact } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      contact: ContactSchema,
    }).parse(req.body);

    const updatedContact = await cardDAVService.updateContact(email, password, contact);

    res.json({
      success: true,
      contact: updatedContact,
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update contact',
    });
  }
});

/**
 * POST /contacts/delete
 * Kontakt aus CardDAV löschen
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { email, password, contactUid } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      contactUid: z.string(),
    }).parse(req.body);

    await cardDAVService.deleteContact(email, password, contactUid);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete contact',
    });
  }
});

/**
 * POST /contacts/get
 * Einzelnen Kontakt abrufen
 */
router.post('/get', async (req: Request, res: Response) => {
  try {
    const { email, password, contactUid } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      contactUid: z.string(),
    }).parse(req.body);

    const contact = await cardDAVService.getContact(email, password, contactUid);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    res.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch contact',
    });
  }
});

/**
 * POST /contacts/search
 * Kontakte suchen (CardDAV + Email-Header kombiniert)
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { email, password, query } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      query: z.string().min(1),
    }).parse(req.body);

    // Search in CardDAV first
    const carddavContacts = await cardDAVService.searchContacts(email, password, query);

    res.json({
      success: true,
      contacts: carddavContacts,
      total: carddavContacts.length,
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search contacts',
    });
  }
});

/**
 * POST /contacts/search/master
 * Kontakte suchen mit Master-User (kein Passwort erforderlich)
 */
router.post('/search/master', async (req: Request, res: Response) => {
  try {
    const { email, query } = z.object({
      email: z.string().email(),
      query: z.string().min(1),
    }).parse(req.body);

    // Nur für Taskilo-E-Mails erlaubt
    if (!email.endsWith('@taskilo.de')) {
      return res.status(403).json({
        success: false,
        error: 'Master User Zugriff nur für Taskilo E-Mails erlaubt',
      });
    }

    // Master-Passwort aus Umgebungsvariablen
    const masterPassword = process.env.MASTER_PASSWORD;
    if (!masterPassword) {
      return res.status(500).json({
        success: false,
        error: 'Master-Passwort nicht konfiguriert',
      });
    }

    // Suche mit Master-Passwort
    const carddavContacts = await cardDAVService.searchContacts(email, masterPassword, query);

    res.json({
      success: true,
      contacts: carddavContacts,
      total: carddavContacts.length,
    });
  } catch (error) {
    console.error('Error searching contacts (master):', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search contacts',
    });
  }
});

/**
 * POST /contacts/master
 * Alle Kontakte mit Master-User abrufen
 */
router.post('/master', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({
      email: z.string().email(),
    }).parse(req.body);

    // Nur für Taskilo-E-Mails erlaubt
    if (!email.endsWith('@taskilo.de')) {
      return res.status(403).json({
        success: false,
        error: 'Master User Zugriff nur für Taskilo E-Mails erlaubt',
      });
    }

    // Master-Passwort aus Umgebungsvariablen
    const masterPassword = process.env.MASTER_PASSWORD;
    if (!masterPassword) {
      return res.status(500).json({
        success: false,
        error: 'Master-Passwort nicht konfiguriert',
      });
    }

    const result = await cardDAVService.getContacts(email, masterPassword);

    res.json({
      success: true,
      contacts: result.contacts,
      total: result.total,
    });
  } catch (error) {
    console.error('Error fetching contacts (master):', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch contacts',
    });
  }
});

/**
 * POST /contacts/labels
 * Alle Labels abrufen
 */
router.post('/labels', async (req: Request, res: Response) => {
  try {
    const { email, password } = AuthSchema.parse(req.body);
    const labels = await cardDAVService.getLabels(email, password);

    res.json({
      success: true,
      labels,
    });
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch labels',
    });
  }
});

/**
 * POST /contacts/by-label
 * Kontakte nach Label filtern
 */
router.post('/by-label', async (req: Request, res: Response) => {
  try {
    const { email, password, label } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      label: z.string(),
    }).parse(req.body);

    const contacts = await cardDAVService.getContactsByLabel(email, password, label);

    res.json({
      success: true,
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('Error fetching contacts by label:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch contacts by label',
    });
  }
});

/**
 * POST /contacts/from-emails
 * Legacy: Kontakte aus E-Mail-Headern extrahieren
 */
router.post('/from-emails', async (req: Request, res: Response) => {
  try {
    const { email, password, limit } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      limit: z.number().optional().default(500),
    }).parse(req.body);

    const emailService = new EmailService({ email, password });
    const contactMap = new Map<string, EmailContact>();

    // Fetch from INBOX
    const inbox = await emailService.getMessages('INBOX', { page: 1, limit });
    for (const msg of inbox.messages) {
      for (const from of msg.from) {
        if (from.address && from.address !== email) {
          const key = from.address.toLowerCase();
          const existing = contactMap.get(key);
          if (existing) {
            existing.contactCount++;
            existing.source = existing.source === 'sent' ? 'both' : 'received';
            if (new Date(msg.date) > new Date(existing.lastContacted)) {
              existing.lastContacted = msg.date.toISOString();
              if (from.name) existing.name = from.name;
            }
          } else {
            contactMap.set(key, {
              id: key,
              email: from.address,
              name: from.name || '',
              lastContacted: msg.date.toISOString(),
              contactCount: 1,
              source: 'received',
            });
          }
        }
      }
    }

    // Fetch from Sent
    try {
      const sent = await emailService.getMessages('Sent', { page: 1, limit });
      for (const msg of sent.messages) {
        const recipients = [...(msg.to || []), ...(msg.cc || [])];
        for (const recipient of recipients) {
          if (recipient.address && recipient.address !== email) {
            const key = recipient.address.toLowerCase();
            const existing = contactMap.get(key);
            if (existing) {
              existing.contactCount++;
              existing.source = existing.source === 'received' ? 'both' : 'sent';
            } else {
              contactMap.set(key, {
                id: key,
                email: recipient.address,
                name: recipient.name || '',
                lastContacted: msg.date.toISOString(),
                contactCount: 1,
                source: 'sent',
              });
            }
          }
        }
      }
    } catch {
      // Ignore sent folder errors
    }

    const contacts = Array.from(contactMap.values())
      .sort((a, b) => b.contactCount - a.contactCount);

    res.json({
      success: true,
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('Error fetching email contacts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch email contacts',
    });
  }
});

export default router;
