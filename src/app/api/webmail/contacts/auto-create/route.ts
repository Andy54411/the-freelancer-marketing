import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de:3001';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const AutoCreateContactSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
  })),
});

/**
 * POST /api/webmail/contacts/auto-create
 * Erstellt Kontakte automatisch, wenn sie noch nicht existieren
 * Wird nach dem Senden einer E-Mail aufgerufen
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, recipients } = AutoCreateContactSchema.parse(body);

    const results: Array<{ email: string; created: boolean; error?: string }> = [];

    // Zuerst alle existierenden Kontakte laden
    let existingEmails = new Set<string>();
    try {
      const contactsResponse = await fetch(`${WEBMAIL_PROXY_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        for (const contact of contactsData.contacts || []) {
          for (const e of contact.emails || []) {
            existingEmails.add(e.value.toLowerCase());
          }
        }
      }
    } catch {
      // Bei Fehler trotzdem versuchen, Kontakte zu erstellen
    }

    // Jeden Empfänger prüfen und ggf. erstellen
    for (const recipient of recipients) {
      const recipientEmailLower = recipient.email.toLowerCase();
      
      // Eigene E-Mail-Adresse überspringen
      if (recipientEmailLower === email.toLowerCase()) {
        results.push({ email: recipient.email, created: false });
        continue;
      }

      // Prüfen ob Kontakt bereits existiert
      if (existingEmails.has(recipientEmailLower)) {
        results.push({ email: recipient.email, created: false });
        continue;
      }

      // Kontakt erstellen
      try {
        // Name in Vor- und Nachname aufteilen
        const nameParts = (recipient.name || recipient.email.split('@')[0]).split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const createResponse = await fetch(`${WEBMAIL_PROXY_URL}/api/contacts/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': WEBMAIL_API_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            contact: {
              firstName,
              lastName,
              displayName: recipient.name || recipient.email.split('@')[0],
              emails: [{ value: recipient.email, label: 'Privat' }],
            },
          }),
        });

        if (createResponse.ok) {
          results.push({ email: recipient.email, created: true });
          existingEmails.add(recipientEmailLower);
        } else {
          const errorData = await createResponse.json().catch(() => ({}));
          results.push({ 
            email: recipient.email, 
            created: false, 
            error: errorData.error || 'Fehler beim Erstellen' 
          });
        }
      } catch (error) {
        results.push({ 
          email: recipient.email, 
          created: false, 
          error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
      }
    }

    const createdCount = results.filter(r => r.created).length;

    return NextResponse.json({
      success: true,
      results,
      createdCount,
      message: createdCount > 0 
        ? `${createdCount} neue Kontakte erstellt` 
        : 'Keine neuen Kontakte erstellt',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fehler beim Auto-Create';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
