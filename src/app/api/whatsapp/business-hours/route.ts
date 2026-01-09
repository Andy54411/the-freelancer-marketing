/**
 * WhatsApp Business Hours API
 * 
 * Verwaltet Geschäftszeiten für Auto-Replies außerhalb der Arbeitszeit
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const daySchema = z.object({
  enabled: z.boolean(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breaks: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
});

const businessHoursSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  timezone: z.string().default('Europe/Berlin'),
  days: z.object({
    monday: daySchema,
    tuesday: daySchema,
    wednesday: daySchema,
    thursday: daySchema,
    friday: daySchema,
    saturday: daySchema,
    sunday: daySchema,
  }),
  outsideHoursMessage: z.string().optional(),
  holidayMessage: z.string().optional(),
  holidays: z.array(z.object({
    date: z.string(), // YYYY-MM-DD
    name: z.string(),
  })).optional(),
});

// GET - Geschäftszeiten abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, error: 'Company ID erforderlich' }, { status: 400 });
    }

    const doc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappSettings')
      .doc('businessHours')
      .get();

    if (!doc.exists) {
      // Standardwerte zurückgeben
      return NextResponse.json({
        success: true,
        businessHours: {
          timezone: 'Europe/Berlin',
          days: {
            monday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
            tuesday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
            wednesday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
            thursday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
            friday: { enabled: true, openTime: '09:00', closeTime: '18:00' },
            saturday: { enabled: false },
            sunday: { enabled: false },
          },
          outsideHoursMessage: 'Vielen Dank für Ihre Nachricht! Wir sind derzeit nicht erreichbar. Unsere Geschäftszeiten sind Montag bis Freitag von 09:00 bis 18:00 Uhr. Wir melden uns schnellstmöglich bei Ihnen.',
          holidayMessage: 'Vielen Dank für Ihre Nachricht! Aufgrund eines Feiertags sind wir heute nicht erreichbar. Wir melden uns am nächsten Werktag bei Ihnen.',
          holidays: [],
        },
        isOpen: true,
      });
    }

    const data = doc.data();

    // Prüfe ob gerade geöffnet
    const now = new Date();
    const isOpen = data ? checkIfOpen(data as Record<string, unknown>, now) : false;

    return NextResponse.json({
      success: true,
      businessHours: data,
      isOpen,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Laden',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST - Geschäftszeiten speichern
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = businessHoursSchema.parse(body);

    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappSettings')
      .doc('businessHours')
      .set({
        ...validated,
        updatedAt: new Date(),
      }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Geschäftszeiten gespeichert',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validierungsfehler', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Speichern',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// Hilfsfunktion: Prüft ob gerade geöffnet
function checkIfOpen(businessHours: Record<string, unknown>, now: Date): boolean {
  const days = businessHours.days as Record<string, { enabled: boolean; openTime?: string; closeTime?: string }>;
  const holidays = (businessHours.holidays as Array<{ date: string }>) || [];
  const timezone = (businessHours.timezone as string) || 'Europe/Berlin';

  // Konvertiere zu lokaler Zeit
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dateStr = localTime.toISOString().split('T')[0];

  // Prüfe Feiertage
  if (holidays.some(h => h.date === dateStr)) {
    return false;
  }

  // Prüfe Wochentag
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[localTime.getDay()];
  const dayConfig = days[dayName];

  if (!dayConfig?.enabled) {
    return false;
  }

  // Prüfe Uhrzeit
  if (dayConfig.openTime && dayConfig.closeTime) {
    const currentTime = `${localTime.getHours().toString().padStart(2, '0')}:${localTime.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= dayConfig.openTime && currentTime <= dayConfig.closeTime;
  }

  return true;
}
