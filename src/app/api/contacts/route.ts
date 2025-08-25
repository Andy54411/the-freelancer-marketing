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

// Live Taskilo Email Configuration - Nur existierende E-Mail-Adressen
const TASKILO_CONTACTS: TaskiloContact[] = [
  {
    id: 'master',
    department: 'Management & Administration',
    email: 'andy.staudinger@taskilo.de',
    description: 'Master-Admin Account für Verwaltung und strategische Entscheidungen',
    category: 'primary',
    isActive: true,
    createdAt: '2025-07-16T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'support',
    department: 'Customer Support & General Inquiries',
    email: 'support@taskilo.de',
    description: 'Für allgemeine Fragen, Kundensupport und technische Probleme',
    category: 'support',
    isActive: true,
    createdAt: '2025-07-16T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'noreply',
    department: 'System Notifications',
    email: 'noreply@taskilo.de',
    description: 'Für automatische System-E-Mails und Benachrichtigungen (keine Antworten)',
    category: 'technical',
    isActive: true,
    createdAt: '2025-07-22T00:00:00Z',
    updatedAt: '2025-07-22T00:00:00Z',
  },
  {
    id: 'newsletter',
    department: 'Marketing & Newsletter',
    email: 'newsletter@taskilo.de',
    description: 'Für Newsletter-Verwaltung und Marketing-Kommunikation',
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
        categories: ['primary', 'support', 'business', 'technical'],
        domain: '@taskilo.de',
        lastUpdated: '2025-07-22T00:00:00Z',
      },
    });
  } catch (error) {

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
