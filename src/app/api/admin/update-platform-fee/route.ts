import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Force dynamic rendering - verhindert static generation
export const dynamic = 'force-dynamic';

// Firebase Admin Setup
let db: any;

try {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountKey && serviceAccountKey !== 'undefined') {
      const serviceAccount = JSON.parse(serviceAccountKey);

      // Extract project ID from service account if not set in environment
      if (!projectId && serviceAccount.project_id) {
        projectId = serviceAccount.project_id;
      }

      if (serviceAccount.project_id && projectId) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        db = getFirestore();
      }
    } else {
      console.warn('Firebase service account key not available in update-platform-fee');
    }
  } else {
    db = getFirestore();
  }
} catch (error) {
  console.error('Firebase Admin initialization error in update-platform-fee:', error);
  db = null;
}

interface PlatformFeeConfig {
  id: string;
  feeRate: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  updatedBy?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { feeRate, adminUserId } = await req.json();

    // Validierung
    if (typeof feeRate !== 'number' || feeRate < 0 || feeRate > 0.2) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ungültiger Gebührensatz. Muss zwischen 0 und 0.2 (20%) liegen.',
        },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        {
          success: false,
          message: 'Datenbank nicht verfügbar. Konfiguration kann nicht gespeichert werden.',
        },
        { status: 503 }
      );
    }

    // Aktuelle Konfiguration laden
    const configRef = db.collection('platform_config').doc('fee_settings');
    const currentConfig = await configRef.get();

    let updatedConfig: PlatformFeeConfig;

    if (currentConfig.exists) {
      // Update bestehende Konfiguration
      const existing = currentConfig.data() as PlatformFeeConfig;
      updatedConfig = {
        ...existing,
        feeRate,
        updatedAt: Math.floor(Date.now() / 1000),
        updatedBy: adminUserId,
      };
    } else {
      // Neue Konfiguration erstellen
      updatedConfig = {
        id: 'fee_settings',
        feeRate,
        isActive: true,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
        updatedBy: adminUserId,
      };
    }

    // Konfiguration speichern
    await configRef.set(updatedConfig);

    // Change Log erstellen
    await db.collection('platform_config_history').add({
      configId: 'fee_settings',
      action: 'fee_rate_update',
      previousFeeRate: currentConfig.exists ? currentConfig.data()?.feeRate : null,
      newFeeRate: feeRate,
      adminUserId,
      timestamp: Math.floor(Date.now() / 1000),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    console.log(`Platform fee updated to ${(feeRate * 100).toFixed(1)}% by admin ${adminUserId}`);

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: `Plattformgebühr erfolgreich auf ${(feeRate * 100).toFixed(1)}% aktualisiert`,
    });
  } catch (error) {
    console.error('Error updating platform fee:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Fehler beim Aktualisieren der Plattformgebühr',
      },
      { status: 500 }
    );
  }
}
