/**
 * Sync Revolut Plans to Firestore
 * 
 * Holt die existierenden Revolut Subscription Plans und speichert sie in Firestore
 */

import { NextResponse } from 'next/server';
import { db as adminDb } from '@/firebase/server';

const REVOLUT_API_KEY = process.env.REVOLUT_MERCHANT_API_KEY;
const REVOLUT_API_VERSION = '2025-10-16';

interface RevolutPlan {
  id: string;
  name: string;
  state: string;
  variations: Array<{
    id: string;
    phases: Array<{
      cycle_duration: string;
      amount: number;
    }>;
  }>;
}

export async function POST() {
  if (!REVOLUT_API_KEY) {
    return NextResponse.json({ success: false, error: 'API Key nicht konfiguriert' }, { status: 500 });
  }

  try {
    // Hole Plans von Revolut
    const response = await fetch('https://merchant.revolut.com/api/subscription-plans', {
      headers: {
        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
        'Revolut-Api-Version': REVOLUT_API_VERSION,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Revolut API Fehler: ${response.status}` 
      }, { status: 500 });
    }

    const data = await response.json();
    const plans = data.subscription_plans as RevolutPlan[];

    // Finde ProMail und BusinessMail Plans
    const promailPlan = plans.find(p => p.name === 'Taskilo ProMail');
    const businessPlan = plans.find(p => p.name === 'Taskilo BusinessMail');

    if (!promailPlan || !businessPlan) {
      return NextResponse.json({ 
        success: false, 
        error: 'ProMail oder BusinessMail Plan nicht gefunden',
        foundPlans: plans.map(p => p.name),
      }, { status: 404 });
    }

    // Extrahiere Variation IDs (monthly = P1M, yearly = P1Y)
    const getVariationIds = (plan: RevolutPlan) => {
      const monthly = plan.variations.find(v => 
        v.phases[0]?.cycle_duration === 'P1M'
      );
      const yearly = plan.variations.find(v => 
        v.phases[0]?.cycle_duration === 'P1Y'
      );
      return {
        planId: plan.id,
        monthlyId: monthly?.id,
        yearlyId: yearly?.id,
      };
    };

    const plansData = {
      promail: getVariationIds(promailPlan),
      businessmail: getVariationIds(businessPlan),
      syncedAt: new Date(),
    };

    // Speichere in Firestore
    if (adminDb) {
      await adminDb.collection('settings').doc('revolutPlans').set(plansData);
    }

    return NextResponse.json({
      success: true,
      message: 'Revolut Plans erfolgreich synchronisiert',
      plans: plansData,
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
