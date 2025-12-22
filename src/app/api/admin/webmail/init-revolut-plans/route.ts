/**
 * Initialize Revolut Subscription Plans
 * 
 * Einmaliges Setup: Erstellt die Subscription Plans bei Revolut
 * - ProMail: 2.99 EUR/Monat oder 29.90 EUR/Jahr
 * - BusinessMail: 4.99 EUR/Monat oder 49.90 EUR/Jahr
 * 
 * Die Plan IDs werden in Firestore gespeichert fuer spaetere Verwendung
 */

import { NextResponse } from 'next/server';
import { WebmailSubscriptionService } from '@/services/webmail/WebmailSubscriptionService';

export async function POST() {
  try {
    const result = await WebmailSubscriptionService.initializeRevolutPlans();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Revolut Subscription Plans erfolgreich erstellt',
      plans: result.plans,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Interner Fehler',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const plans = await WebmailSubscriptionService.getRevolutPlanIds();

    if (!plans) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Keine Revolut Plans gefunden. Bitte POST /api/admin/webmail/init-revolut-plans aufrufen.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Interner Fehler',
      },
      { status: 500 }
    );
  }
}
