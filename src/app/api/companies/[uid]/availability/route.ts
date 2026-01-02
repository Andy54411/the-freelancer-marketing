/**
 * API: Verfügbarkeit eines Unternehmens abrufen
 * 
 * GET /api/companies/[uid]/availability
 * 
 * Öffentlicher Endpunkt - keine Authentifizierung erforderlich
 * Gibt blockierte Tage und Arbeitszeiten zurück
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company ID erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Company-Daten abrufen
    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    // Default: Alle Tage verfügbar (0=So, 1=Mo, ..., 6=Sa)
    let availability = {
      availabilityType: 'flexible',
      advanceBookingHours: 24,
      workingDays: [0, 1, 2, 3, 4, 5, 6], // Alle Tage verfügbar als Default
      workingHours: { start: '08:00', end: '18:00' }
    };
    
    if (companyDoc.exists) {
      const data = companyDoc.data();
      availability = {
        availabilityType: data?.availabilityType || 'flexible',
        advanceBookingHours: data?.advanceBookingHours || 24,
        workingDays: data?.workingDays || [0, 1, 2, 3, 4, 5, 6],
        workingHours: data?.workingHours || { start: '08:00', end: '18:00' }
      };
    }

    // Blockierte Tage abrufen (ohne orderBy - sortieren wir client-seitig)
    const blockedSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('blockedDates')
      .where('isActive', '==', true)
      .get();

    const blockedDates: string[] = [];
    const today = new Date();
    
    blockedSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      
      if (data.blockType === 'full_day') {
        blockedDates.push(data.date);
      }
      
      // Wiederkehrende Blockierungen für die nächsten 365 Tage berechnen
      if (data.recurring && data.recurringPattern) {
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() + i);
          const pattern = data.recurringPattern;
          
          if (pattern.type === 'weekly' && pattern.dayOfWeek === checkDate.getDay()) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (!blockedDates.includes(dateStr)) {
              blockedDates.push(dateStr);
            }
          }
          if (pattern.type === 'monthly' && pattern.dayOfMonth === checkDate.getDate()) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (!blockedDates.includes(dateStr)) {
              blockedDates.push(dateStr);
            }
          }
        }
      }
    });

    // Nicht-Arbeitstage für die nächsten 365 Tage als blockiert markieren
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const dayOfWeek = checkDate.getDay();
      
      if (!availability.workingDays.includes(dayOfWeek)) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (!blockedDates.includes(dateStr)) {
          blockedDates.push(dateStr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      blockedDates: [...new Set(blockedDates)].sort(),
      workingDays: availability.workingDays,
      workingHours: availability.workingHours,
      advanceBookingHours: availability.advanceBookingHours,
      availabilityType: availability.availabilityType
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
      },
      { status: 500 }
    );
  }
}
