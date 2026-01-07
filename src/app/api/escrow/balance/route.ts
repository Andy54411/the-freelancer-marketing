import { NextRequest, NextResponse } from 'next/server';
import { EscrowService } from '@/services/payment/EscrowService';

/**
 * GET /api/escrow/balance
 * Gibt das Escrow-Guthaben (auszahlbares Geld) für einen Anbieter zurueck
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    if (!providerId) {
      return NextResponse.json(
        { success: false, error: 'providerId ist erforderlich' },
        { status: 400 }
      );
    }

    // Versuche Summary zu holen, bei Fehler leere Werte zurückgeben
    let summary;
    try {
      summary = await EscrowService.getProviderSummary(providerId);
    } catch {
      // Falls keine Escrows existieren oder Fehler auftritt, leere Summary
      summary = {
        totalHeld: 0,
        totalReleased: 0,
        totalRefunded: 0,
        pendingPayouts: 0,
        currency: 'EUR',
      };
    }

    return NextResponse.json({
      success: true,
      available: summary.totalHeld,
      released: summary.totalReleased,
      refunded: summary.totalRefunded,
      pendingPayouts: summary.pendingPayouts,
      currency: summary.currency,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen des Escrow-Guthabens',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
