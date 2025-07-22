// src/app/api/contacts/route.ts
import { NextResponse } from 'next/server';

// Taskilo Contact Information Interface
interface TaskiloContact {
  id: string;
  department: string;
  email: string;
  description: string;
  category: 'primary' | 'support' | 'business' | 'legal' | 'technical';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Static Taskilo Email Configuration
const TASKILO_CONTACTS: TaskiloContact[] = [
  {
    id: 'legal',
    department: 'Rechtliche Angelegenheiten',
    email: 'legal@taskilo.com',
    description: 'Für alle rechtlichen Fragen, AGB, Verträge und juristische Angelegenheiten',
    category: 'legal',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'support',
    department: 'Allgemeiner Support',
    email: 'support@taskilo.com',
    description: 'Für allgemeine Fragen, Beschwerden und Kundensupport',
    category: 'support',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'tech',
    department: 'Technischer Support',
    email: 'tech@taskilo.com',
    description: 'Für technische Probleme, Bugs und Plattform-spezifische Fragen',
    category: 'technical',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'privacy',
    department: 'Datenschutz',
    email: 'privacy@taskilo.com',
    description: 'Für Datenschutzanfragen, DSGVO-Auskunft und Löschung von Daten',
    category: 'legal',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'business',
    department: 'Geschäftsanfragen',
    email: 'business@taskilo.com',
    description: 'Für Partnerschaftsanfragen, B2B-Kooperationen und Geschäftsentwicklung',
    category: 'business',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'billing',
    department: 'Rechnungsfragen',
    email: 'billing@taskilo.com',
    description: 'Für Fragen zu Rechnungen, Zahlungen und Abrechnungen',
    category: 'business',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'info',
    department: 'Allgemeine Informationen',
    email: 'info@taskilo.com',
    description: 'Für allgemeine Informationen und erste Kontaktaufnahme',
    category: 'primary',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'disputes',
    department: 'Beschwerden & Mediation',
    email: 'disputes@taskilo.com',
    description: 'Für Streitbeilegung, Mediation zwischen Kunden und Dienstleistern',
    category: 'legal',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'press',
    department: 'Presse & Medien',
    email: 'press@taskilo.com',
    description: 'Für Presseanfragen, Medienanfragen und PR-Kooperationen',
    category: 'business',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'careers',
    department: 'Karriere & Jobs',
    email: 'careers@taskilo.com',
    description: 'Für Bewerbungen, Stellenausschreibungen und Karrieremöglichkeiten',
    category: 'business',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
];

// GET /api/contacts - Retrieve all contact information
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const active = url.searchParams.get('active');
    const format = url.searchParams.get('format'); // 'simple' for email list only

    console.log('[API /contacts] GET request received', {
      category,
      active,
      format,
    });

    let filteredContacts = TASKILO_CONTACTS;

    // Filter by category if specified
    if (category) {
      filteredContacts = filteredContacts.filter(contact => contact.category === category);
    }

    // Filter by active status if specified
    if (active !== null) {
      const isActive = active === 'true';
      filteredContacts = filteredContacts.filter(contact => contact.isActive === isActive);
    }

    // Return simple format (just emails) if requested
    if (format === 'simple') {
      const simpleResponse = filteredContacts.map(contact => ({
        id: contact.id,
        email: contact.email,
        department: contact.department,
      }));

      return NextResponse.json({
        success: true,
        total: simpleResponse.length,
        contacts: simpleResponse,
      });
    }

    // Return full contact information
    return NextResponse.json({
      success: true,
      total: filteredContacts.length,
      contacts: filteredContacts,
      metadata: {
        categories: ['primary', 'support', 'business', 'legal', 'technical'],
        domain: '@taskilo.com',
        lastUpdated: '2025-07-22T00:00:00Z',
      },
    });
  } catch (error) {
    console.error('[API /contacts] Error in GET:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve contact information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Add new contact (for future expansion)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[API /contacts] POST request received:', body);

    // For now, return method not allowed as contacts are statically defined
    return NextResponse.json(
      {
        success: false,
        error: 'Method not implemented',
        message:
          'Contacts are currently statically defined. Use GET to retrieve existing contacts.',
        availableEndpoints: {
          GET: '/api/contacts',
          'GET with filters': '/api/contacts?category=support&active=true&format=simple',
        },
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('[API /contacts] Error in POST:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id] - Update contact (for future expansion)
export async function PUT(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not implemented',
      message: 'Contact updates are not supported in the current version.',
    },
    { status: 501 }
  );
}

// DELETE /api/contacts/[id] - Delete contact (for future expansion)
export async function DELETE(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not implemented',
      message: 'Contact deletion is not supported in the current version.',
    },
    { status: 501 }
  );
}
