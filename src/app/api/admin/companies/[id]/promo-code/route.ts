/**
 * Promo Code API fuer Admin
 * 
 * Generiert Promo-Codes fuer Unternehmen
 */

import { NextRequest, NextResponse } from 'next/server';
import { TrialService } from '@/services/subscription/TrialService';
import { z } from 'zod';

const GeneratePromoCodeSchema = z.object({
  durationDays: z.number().min(1).max(365),
  notes: z.string().optional(),
});

/**
 * POST - Promo-Code generieren
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    const body = await request.json();
    const validation = GeneratePromoCodeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Ungueltige Eingabedaten', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { durationDays, notes } = validation.data;

    const result = await TrialService.generatePromoCode({
      companyId,
      durationDays,
      createdBy: 'admin', // TODO: Get from auth context
      notes,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      promoCode: result.promoCode,
      message: `Promo-Code fuer ${durationDays} Tage erstellt`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET - Promo-Code Status abrufen
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    const trialInfo = await TrialService.checkAndUpdateTrialStatus(companyId);

    if (!trialInfo) {
      return NextResponse.json(
        { success: false, error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trialInfo: {
        ...trialInfo,
        trialStartDate: trialInfo.trialStartDate.toISOString(),
        trialEndDate: trialInfo.trialEndDate.toISOString(),
        promoExpiresAt: trialInfo.promoExpiresAt?.toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
