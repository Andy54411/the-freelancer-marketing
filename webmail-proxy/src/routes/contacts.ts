/**
 * Taskilo Webmail Proxy - Contacts Routes
 * MongoDB-basierte Kontaktverwaltung
 */

import { Router, Request, Response } from 'express';
import { contactsServiceMongo, ContactSchema } from '../services/ContactsServiceMongo';
import { EmailService } from '../services/EmailService';
import { cardDAVService } from '../services/CardDAVService';
import { z } from 'zod';

const router: Router = Router();

// Auth Schema - Email ist immer erforderlich, Password optional (für Master-User)
const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
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
 * Alle Kontakte aus MongoDB abrufen
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email } = AuthSchema.parse(req.body);
    const result = await contactsServiceMongo.getContacts(email);

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
 * POST /contacts/master
 * Alle Kontakte abrufen (Master-User Route - identisch mit /)
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

    const result = await contactsServiceMongo.getContacts(email);

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
 * POST /contacts/create
 * Neuen Kontakt in MongoDB erstellen
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email, contact } = z.object({
      email: z.string().email(),
      password: z.string().optional(),
      contact: ContactSchema.omit({ uid: true }),
    }).parse(req.body);

    const newContact = await contactsServiceMongo.createContact(email, contact);

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
 * Kontakt in MongoDB aktualisieren
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    const { email, contact } = z.object({
      email: z.string().email(),
      password: z.string().optional(),
      contact: ContactSchema,
    }).parse(req.body);

    const contactId = contact.uid || contact._id;
    if (!contactId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID (uid or _id) is required',
      });
    }

    const updatedContact = await contactsServiceMongo.updateContact(email, contactId, contact);

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
 * Kontakt aus MongoDB löschen
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { email, contactUid } = z.object({
      email: z.string().email(),
      password: z.string().optional(),
      contactUid: z.string(),
    }).parse(req.body);

    await contactsServiceMongo.deleteContact(email, contactUid);

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
    const { email, contactUid } = z.object({
      email: z.string().email(),
      password: z.string().optional(),
      contactUid: z.string(),
    }).parse(req.body);

    const contact = await contactsServiceMongo.getContact(email, contactUid);

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
 * Kontakte suchen in MongoDB
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { email, query } = z.object({
      email: z.string().email(),
      password: z.string().optional(),
      query: z.string().min(1),
    }).parse(req.body);

    console.log(`[Contacts] Searching for "${query}" in contacts of ${email}`);
    const contacts = await contactsServiceMongo.searchContacts(email, query);
    console.log(`[Contacts] Found ${contacts.length} contacts`);

    res.json({
      success: true,
      contacts,
      total: contacts.length,
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
 * Kontakte suchen mit Master-User (identisch mit /search)
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

    console.log(`[Contacts/Master] Searching for "${query}" in contacts of ${email}`);
    const contacts = await contactsServiceMongo.searchContacts(email, query);
    console.log(`[Contacts/Master] Found ${contacts.length} contacts`);

    res.json({
      success: true,
      contacts,
      total: contacts.length,
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
 * POST /contacts/labels
 * Alle Labels abrufen
 */
router.post('/labels', async (req: Request, res: Response) => {
  try {
    const { email } = AuthSchema.parse(req.body);
    const labels = await contactsServiceMongo.getLabels(email);

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
 * POST /contacts/labels/create
 * Neues Label erstellen
 */
router.post('/labels/create', async (req: Request, res: Response) => {
  try {
    const { email, name, color } = z.object({
      email: z.string().email(),
      name: z.string().min(1),
      color: z.string().optional(),
    }).parse(req.body);

    const label = await contactsServiceMongo.createLabel(email, name, color);

    res.status(201).json({
      success: true,
      label,
    });
  } catch (error) {
    console.error('Error creating label:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create label',
    });
  }
});

/**
 * POST /contacts/labels/update
 * Label aktualisieren
 */
router.post('/labels/update', async (req: Request, res: Response) => {
  try {
    const { email, labelId, name, color } = z.object({
      email: z.string().email(),
      labelId: z.string(),
      name: z.string().min(1),
      color: z.string().optional(),
    }).parse(req.body);

    await contactsServiceMongo.updateLabel(email, labelId, { name, color });

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating label:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update label',
    });
  }
});

/**
 * POST /contacts/labels/delete
 * Label löschen
 */
router.post('/labels/delete', async (req: Request, res: Response) => {
  try {
    const { email, labelId } = z.object({
      email: z.string().email(),
      labelId: z.string(),
    }).parse(req.body);

    await contactsServiceMongo.deleteLabel(email, labelId);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting label:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete label',
    });
  }
});

/**
 * POST /contacts/by-label
 * Kontakte nach Label filtern
 */
router.post('/by-label', async (req: Request, res: Response) => {
  try {
    const { email, label } = z.object({
      email: z.string().email(),
      password: z.string().optional(),
      label: z.string(),
    }).parse(req.body);

    const contacts = await contactsServiceMongo.getContactsByLabel(email, label);

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

/**
 * POST /contacts/migrate-from-carddav
 * Migriert alle Kontakte von CardDAV (SOGo) nach MongoDB
 * Einmalige Migration - kann mehrfach aufgerufen werden (upsert)
 */
router.post('/migrate-from-carddav', async (req: Request, res: Response) => {
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    // CardDAV-Kontakte laden
    const { contacts: cardDavContacts, total: cardDavTotal } = await cardDAVService.getContacts(email, password);

    const migratedCount = { created: 0, updated: 0, skipped: 0 };

    for (const cardDavContact of cardDavContacts) {
      // Prüfe ob bereits in MongoDB
      const existingInMongo = await contactsServiceMongo.getContact(email, cardDavContact.uid);
      
      if (existingInMongo) {
        migratedCount.skipped++;
        continue;
      }

      // Erstelle in MongoDB
      await contactsServiceMongo.createContact(email, {
        firstName: cardDavContact.firstName,
        lastName: cardDavContact.lastName,
        displayName: cardDavContact.displayName || 
          `${cardDavContact.firstName || ''} ${cardDavContact.lastName || ''}`.trim() ||
          'Unbenannt',
        nickname: cardDavContact.nickname,
        company: cardDavContact.company,
        jobTitle: cardDavContact.jobTitle,
        department: cardDavContact.department,
        emails: cardDavContact.emails || [],
        phones: cardDavContact.phones || [],
        addresses: cardDavContact.addresses || [],
        websites: cardDavContact.websites || [],
        birthday: cardDavContact.birthday,
        notes: cardDavContact.notes,
        photo: cardDavContact.photo,
        labels: cardDavContact.labels || [],
        source: 'carddav-migration',
        contactCount: 0,
      });

      migratedCount.created++;
    }

    res.json({
      success: true,
      message: `Migration abgeschlossen`,
      cardDavTotal,
      migratedCount,
    });
  } catch (error) {
    console.error('Error migrating contacts from CardDAV:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to migrate contacts',
    });
  }
});

/**
 * POST /contacts/import-from-emails
 * Importiert alle Kontakte aus E-Mail-Headern (INBOX + Sent) nach MongoDB
 * Extrahiert E-Mail-Adressen aus gesendeten und empfangenen E-Mails
 */
router.post('/import-from-emails', async (req: Request, res: Response) => {
  try {
    const { email, password, limit = 500 } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      limit: z.number().optional().default(500),
    }).parse(req.body);

    const emailService = new EmailService({ email, password });

    const contactMap = new Map<string, { email: string; name: string; lastContacted: string; contactCount: number }>();

    // Lade aus INBOX
    try {
      const inbox = await emailService.getMessages('INBOX', { page: 1, limit });
      for (const msg of inbox.messages) {
        for (const from of msg.from) {
          if (from.address && from.address !== email) {
            const key = from.address.toLowerCase();
            const existing = contactMap.get(key);
            if (existing) {
              existing.contactCount++;
              if (new Date(msg.date) > new Date(existing.lastContacted)) {
                existing.lastContacted = msg.date.toISOString();
                if (from.name) existing.name = from.name;
              }
            } else {
              contactMap.set(key, {
                email: from.address,
                name: from.name || '',
                lastContacted: msg.date.toISOString(),
                contactCount: 1,
              });
            }
          }
        }
      }
    } catch {
      // INBOX errors - continue with Sent
    }

    // Lade aus Sent
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
            } else {
              contactMap.set(key, {
                email: recipient.address,
                name: recipient.name || '',
                lastContacted: msg.date.toISOString(),
                contactCount: 1,
              });
            }
          }
        }
      }
    } catch {
      // Sent folder errors - continue
    }

    // Speichere in MongoDB (upsert)
    const importCount = { created: 0, updated: 0, skipped: 0 };

    for (const [emailAddr, data] of contactMap) {
      // Prüfe ob E-Mail bereits in MongoDB existiert
      const searchResult = await contactsServiceMongo.searchContacts(email, emailAddr);
      const existingContact = searchResult.find(c => 
        c.emails?.some(e => e.value.toLowerCase() === emailAddr)
      );

      if (existingContact) {
        // Aktualisiere contactCount und lastContacted
        await contactsServiceMongo.updateContact(email, existingContact.uid || String(existingContact._id), {
          contactCount: (existingContact.contactCount || 0) + data.contactCount,
          lastContacted: new Date(data.lastContacted),
        });
        importCount.updated++;
      } else {
        // Erstelle neuen Kontakt
        const nameParts = data.name.split(' ');
        await contactsServiceMongo.createContact(email, {
          firstName: nameParts[0] || undefined,
          lastName: nameParts.slice(1).join(' ') || undefined,
          displayName: data.name || emailAddr.split('@')[0],
          emails: [{ value: emailAddr, label: 'E-Mail' }],
          phones: [],
          addresses: [],
          websites: [],
          labels: [],
          source: 'email-header',
          contactCount: data.contactCount,
          lastContacted: new Date(data.lastContacted),
        });
        importCount.created++;
      }
    }

    res.json({
      success: true,
      message: 'E-Mail-Kontakte importiert',
      emailsScanned: contactMap.size,
      importCount,
    });
  } catch (error) {
    console.error('Error importing contacts from emails:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import contacts from emails',
    });
  }
});

export default router;
