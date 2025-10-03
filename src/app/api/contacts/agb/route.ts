// src/app/api/contacts/agb/route.ts
import { NextResponse } from 'next/server';

// AGB-specific contact information
interface AGBContact {
  section: string;
  purpose: string;
  email: string;
  description: string;
}

// Contacts organized by AGB sections
const AGB_CONTACTS: AGBContact[] = [
  {
    section: '§ 1 Geltungsbereich',
    purpose: 'Allgemeine Informationen',
    email: 'info@taskilo.de',
    description: 'Für erste Kontaktaufnahme und allgemeine Informationen zur Plattform',
  },
  {
    section: '§ 3 Registrierung',
    purpose: 'Account & Registrierung',
    email: 'support@taskilo.de',
    description: 'Für Fragen zur Registrierung, Kontoverifikation und Zugangsdaten',
  },
  {
    section: '§ 5 Gebühren & Zahlungen',
    purpose: 'Rechnungsfragen',
    email: 'billing@taskilo.de',
    description: 'Für Fragen zu Rechnungen, Zahlungen, Gebühren und Abrechnungen',
  },
  {
    section: '§ 6 Geistiges Eigentum',
    purpose: 'Rechtliche Angelegenheiten',
    email: 'legal@taskilo.de',
    description: 'Für Markenrechte, Urheberrecht und andere rechtliche Fragen',
  },
  {
    section: '§ 8 Streitbeilegung',
    purpose: 'Beschwerden & Mediation',
    email: 'disputes@taskilo.de',
    description: 'Für Beschwerden, Streitbeilegung und Mediation zwischen Parteien',
  },
  {
    section: '§ 8 Streitbeilegung - Support',
    purpose: 'Allgemeine Beschwerden',
    email: 'support@taskilo.de',
    description: 'Für allgemeine Beschwerden über Plattform oder Services',
  },
  {
    section: '§ 11 Datenschutz',
    purpose: 'Datenschutzanfragen',
    email: 'privacy@taskilo.de',
    description: 'Für DSGVO-Anfragen, Datenschutz und Datenverarbeitung',
  },
  {
    section: 'Technischer Support',
    purpose: 'Technische Probleme',
    email: 'tech@taskilo.de',
    description: 'Für technische Probleme, Bugs und Plattform-spezifische Fragen',
  },
  {
    section: 'Geschäftsentwicklung',
    purpose: 'B2B & Partnerschaften',
    email: 'business@taskilo.de',
    description: 'Für Partnerschaftsanfragen, B2B-Kooperationen und Geschäftsentwicklung',
  },
  {
    section: 'Medien & Presse',
    purpose: 'Presseanfragen',
    email: 'press@taskilo.de',
    description: 'Für Presseanfragen, Medienanfragen und PR-Kooperationen',
  },
];

// GET /api/contacts/agb - Get AGB-specific contact mapping
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const section = url.searchParams.get('section');
    const format = url.searchParams.get('format');

    let contacts = AGB_CONTACTS;

    // Filter by specific AGB section if requested
    if (section) {
      contacts = contacts.filter(contact =>
        contact.section.toLowerCase().includes(section.toLowerCase())
      );
    }

    // Return simple email mapping format
    if (format === 'mapping') {
      const emailMapping = contacts.reduce(
        (acc, contact) => {
          acc[contact.section] = contact.email;
          return acc;
        },
        {} as Record<string, string>
      );

      return NextResponse.json({
        success: true,
        mapping: emailMapping,
        total: Object.keys(emailMapping).length,
      });
    }

    // Return contact information for AGB integration
    if (format === 'integration') {
      const integrationData = {
        contactBlock: {
          primaryContact: 'legal@taskilo.de',
          supportContact: 'support@taskilo.de',
          technicalContact: 'tech@taskilo.de',
          privacyContact: 'privacy@taskilo.de',
          businessContact: 'business@taskilo.de',
          billingContact: 'billing@taskilo.de',
          disputesContact: 'disputes@taskilo.de',
          pressContact: 'press@taskilo.de',
          infoContact: 'info@taskilo.de',
        },
        sectionMapping: contacts.reduce(
          (acc, contact) => {
            acc[contact.section] = {
              email: contact.email,
              purpose: contact.purpose,
              description: contact.description,
            };
            return acc;
          },
          {} as Record<string, any>
        ),
      };

      return NextResponse.json({
        success: true,
        integration: integrationData,
        metadata: {
          domain: '@taskilo.de',
          totalContacts: contacts.length,
          lastUpdated: '2025-07-22T00:00:00Z',
        },
      });
    }

    // Return full contact information
    return NextResponse.json({
      success: true,
      total: contacts.length,
      contacts: contacts,
      availableFormats: ['mapping', 'integration'],
      usage: {
        mapping: 'Get simple section -> email mapping',
        integration: 'Get structured data for AGB integration',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve AGB contact information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/contacts/agb - Update AGB with email addresses
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, section, email } = body;

    if (action === 'validate') {
      // Validate if email follows Taskilo domain pattern
      const isValidTaskiloEmail = email && email.endsWith('@taskilo.de');
      const existsInContacts = AGB_CONTACTS.some(contact => contact.email === email);

      return NextResponse.json({
        success: true,
        validation: {
          isValidTaskiloEmail,
          existsInContacts,
          email,
          recommendations: AGB_CONTACTS.filter(contact =>
            contact.section.toLowerCase().includes(section?.toLowerCase() || '')
          ),
        },
      });
    }

    if (action === 'suggest') {
      // Suggest appropriate email for AGB section
      const suggestions = AGB_CONTACTS.filter(contact =>
        contact.section.toLowerCase().includes(section?.toLowerCase() || '')
      );

      return NextResponse.json({
        success: true,
        suggestions:
          suggestions.length > 0
            ? suggestions
            : [
                {
                  section: 'Fallback',
                  purpose: 'Allgemeine Anfragen',
                  email: 'legal@taskilo.de',
                  description: 'Fallback-Kontakt für nicht kategorisierte AGB-Anfragen',
                },
              ],
        section,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
        message: 'Supported actions: validate, suggest',
        providedAction: action,
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process AGB contact request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
