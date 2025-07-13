import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasFirebaseServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    serviceAccountKeyLength: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0,
    projectIdValue: process.env.FIREBASE_PROJECT_ID,
    // Zeige nur die ersten 50 Zeichen des Service Account Keys für Debugging
    serviceAccountKeyPreview: process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 50) + '...',
    timestamp: new Date().toISOString()
  });
}
