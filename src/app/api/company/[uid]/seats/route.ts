/**
 * Seats API
 * 
 * GET: Seat-Informationen abrufen
 * POST: Seats hinzufügen oder entfernen
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/firebase/server';
import { SeatService } from '@/services/subscription/SeatService';
import { SEAT_CONFIG } from '@/lib/moduleConfig';

// ============================================================================
// GET: Seat-Informationen
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Auth prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Server-Auth nicht verfügbar' },
        { status: 500 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Prüfe Berechtigung (Inhaber oder Admin)
    if (decodedToken.uid !== uid && decodedToken.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    const seatInfo = await SeatService.getSeatInfo(uid);
    const history = await SeatService.getSeatHistory(uid, 10);

    return NextResponse.json({
      success: true,
      data: {
        seats: seatInfo,
        config: {
          maxSeats: SEAT_CONFIG.maxSeats,
          priceMonthly: SEAT_CONFIG.pricePerSeat.monthly,
          priceYearly: SEAT_CONFIG.pricePerSeat.yearly,
        },
        history,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Seats API] GET Fehler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Laden der Seat-Informationen',
        details: message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Seats verwalten
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Auth prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Server-Auth nicht verfügbar' },
        { status: 500 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Prüfe Berechtigung (nur Inhaber)
    if (decodedToken.uid !== uid) {
      return NextResponse.json(
        { success: false, error: 'Nur der Inhaber kann Seats verwalten' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, quantity } = body;

    // Seats hinzufügen
    if (action === 'add') {
      if (!quantity || quantity < 1 || quantity > 50) {
        return NextResponse.json(
          { success: false, error: 'Ungültige Anzahl (1-50)' },
          { status: 400 }
        );
      }

      const result = await SeatService.addSeats({
        companyId: uid,
        quantity,
        userId: decodedToken.uid,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${quantity} Seat${quantity > 1 ? 's' : ''} hinzugefügt`,
        data: {
          newTotal: result.newTotal,
          proratedAmount: result.proratedAmount,
        },
      });
    }

    // Seats entfernen
    if (action === 'remove') {
      if (!quantity || quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Ungültige Anzahl' },
          { status: 400 }
        );
      }

      const result = await SeatService.removeSeats({
        companyId: uid,
        quantity,
        userId: decodedToken.uid,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${quantity} Seat${quantity > 1 ? 's werden' : ' wird'} zum Monatsende entfernt`,
        data: {
          effectiveDate: result.effectiveDate,
        },
      });
    }

    // Seat-Verfügbarkeit prüfen
    if (action === 'check') {
      const check = await SeatService.checkSeatAvailable(uid);

      return NextResponse.json({
        success: true,
        data: check,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Ungültige Aktion' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Seats API] POST Fehler:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Verarbeiten der Anfrage',
        details: message,
      },
      { status: 500 }
    );
  }
}
