import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock-Kontakte für das Email-System
    const mockContacts = [
      {
        contactId: 'contact_1',
        email: 'info@taskilo.de',
        firstName: 'Taskilo',
        lastName: 'Support',
        name: 'Taskilo Support',
        status: 'active',
        tags: ['support', 'taskilo'],
        createdAt: new Date().toISOString(),
      },
      {
        contactId: 'contact_2',
        email: 'andy@taskilo.de',
        firstName: 'Andy',
        lastName: 'Staudinger',
        name: 'Andy Staudinger',
        status: 'active',
        tags: ['admin', 'founder'],
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      contacts: mockContacts,
      total: mockContacts.length,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contactData = await request.json();

    // Mock: Neuen Kontakt erstellen
    const newContact = {
      contactId: `contact_${Date.now()}`,
      email: contactData.email,
      firstName: contactData.firstName || '',
      lastName: contactData.lastName || '',
      name:
        contactData.name ||
        `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() ||
        contactData.email,
      status: 'active',
      tags: contactData.tags || [],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      contact: newContact,
      message: 'Kontakt erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
