import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de:3001';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const GetContactsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  limit: z.number().default(500),
  source: z.enum(['all', 'carddav', 'emails']).default('all'),
});

interface Contact {
  uid: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  emails: { value: string; label: string }[];
  phones: { value: string; label: string }[];
  source: 'carddav' | 'email';
  lastContacted?: string;
  contactCount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, limit, source } = GetContactsSchema.parse(body);

    const allContacts: Contact[] = [];
    const seenEmails = new Set<string>();

    // 1. Kontakte aus MongoDB laden
    if (source === 'all' || source === 'carddav') {
      try {
        const mongoResponse = await fetch(`${WEBMAIL_PROXY_URL}/api/contacts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': WEBMAIL_API_KEY,
          },
          body: JSON.stringify({ email, password }),
        });

        if (mongoResponse.ok) {
          const mongoData = await mongoResponse.json();
          for (const contact of mongoData.contacts || []) {
            const c: Contact = {
              uid: contact.uid,
              firstName: contact.firstName,
              lastName: contact.lastName,
              displayName: contact.displayName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
              emails: contact.emails || [],
              phones: contact.phones || [],
              source: 'carddav', // Behalte für Kompatibilität
            };
            allContacts.push(c);
            // Track emails to avoid duplicates
            for (const e of c.emails) {
              seenEmails.add(e.value.toLowerCase());
            }
          }
        }
      } catch {
        // Kontakt-Fehler sollten die gesamte Anfrage nicht blockieren
      }
    }

    // 2. E-Mail-Kontakte laden (aus E-Mail-Headern)
    if (source === 'all' || source === 'emails') {
      try {
        const emailsResponse = await fetch(`${WEBMAIL_PROXY_URL}/api/contacts/from-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': WEBMAIL_API_KEY,
          },
          body: JSON.stringify({ email, password, limit }),
        });

        if (emailsResponse.ok) {
          const emailsData = await emailsResponse.json();
          for (const contact of emailsData.contacts || []) {
            const emailLower = contact.email?.toLowerCase();
            // Skip if already in CardDAV
            if (emailLower && seenEmails.has(emailLower)) {
              continue;
            }
            
            const c: Contact = {
              uid: `email-${emailLower}`,
              displayName: contact.name || contact.email,
              emails: [{ value: contact.email, label: 'E-Mail' }],
              phones: [],
              source: 'email',
              lastContacted: contact.lastContacted,
              contactCount: contact.contactCount,
            };
            allContacts.push(c);
            if (emailLower) {
              seenEmails.add(emailLower);
            }
          }
        }
      } catch {
        // Email contact errors should not break the entire request
      }
    }

    // Sort: CardDAV first, then by displayName
    allContacts.sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'carddav' ? -1 : 1;
      }
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

    return NextResponse.json({
      success: true,
      contacts: allContacts,
      total: allContacts.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch contacts';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
