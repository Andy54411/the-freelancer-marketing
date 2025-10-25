import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
});

/**
 * Vordefinierte WhatsApp Message Templates
 *
 * Diese Templates müssen in Meta Business Manager erstellt und genehmigt werden!
 * Jedes Template hat einen Namen und Parameter.
 */

export const WHATSAPP_TEMPLATES = [
  {
    name: 'hello_world',
    category: 'utility',
    language: 'de',
    displayName: 'Allgemeine Begrüßung',
    description: 'Einfache Begrüßungsnachricht',
    example: 'Hallo! Willkommen bei unserem Service.',
    parameters: [],
    cost: 0.0016, // EUR für Deutschland
  },
  {
    name: 'rechnung_erinnerung',
    category: 'utility',
    language: 'de',
    displayName: 'Rechnungserinnerung',
    description: 'Erinnerung an offene Rechnung',
    example: 'Ihre Rechnung {{1}} über {{2}}€ ist fällig.',
    parameters: ['invoiceNumber', 'amount'],
    cost: 0.0016,
  },
  {
    name: 'termin_bestaetigung',
    category: 'utility',
    language: 'de',
    displayName: 'Terminbestätigung',
    description: 'Bestätigung eines Termins',
    example: 'Ihr Termin am {{1}} um {{2}} Uhr wurde bestätigt.',
    parameters: ['date', 'time'],
    cost: 0.0016,
  },
  {
    name: 'zahlung_bestaetigung',
    category: 'utility',
    language: 'de',
    displayName: 'Zahlungsbestätigung',
    description: 'Bestätigung einer Zahlung',
    example: 'Ihre Zahlung von {{1}}€ wurde erhalten. Danke!',
    parameters: ['amount'],
    cost: 0.0016,
  },
  {
    name: 'kundenservice_start',
    category: 'utility',
    language: 'de',
    displayName: 'Kundenservice Anfrage',
    description: 'Startet eine Kundenservice Konversation',
    example: 'Hallo! Wie können wir Ihnen heute helfen?',
    parameters: [],
    cost: 0.0016,
  },
];

/**
 * GET /api/whatsapp/templates
 *
 * Gibt Liste aller verfügbaren Templates zurück
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    // TODO: Later - Fetch approved templates from Meta API
    // const accessToken = await getCompanyAccessToken(companyId);
    // const templates = await fetchMetaTemplates(accessToken);

    return NextResponse.json({
      success: true,
      templates: WHATSAPP_TEMPLATES,
      note: 'Diese Templates müssen in Meta Business Manager erstellt und genehmigt werden',
    });
  } catch (error) {
    console.error('[WhatsApp Templates] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Templates',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
