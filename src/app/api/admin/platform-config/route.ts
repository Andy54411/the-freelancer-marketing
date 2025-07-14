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
      console.warn('Firebase service account key not available in platform-config');
    }
  } else {
    db = getFirestore();
  }
} catch (error) {
  console.error('Firebase Admin initialization error in platform-config:', error);
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

export async function GET() {
  try {
    if (!db) {
      // Fallback: Return default config if database is not available
      const defaultConfig: PlatformFeeConfig = {
        id: 'fee_settings',
        feeRate: 0.045, // 4.5%
        isActive: true,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      return NextResponse.json({
        success: true,
        config: defaultConfig,
        fallback: true,
      });
    }

    // Lade aktuelle Plattformkonfiguration
    const configDoc = await db.collection('platform_config').doc('fee_settings').get();

    if (!configDoc.exists) {
      // Erstelle Standard-Konfiguration falls nicht vorhanden
      const defaultConfig: PlatformFeeConfig = {
        id: 'fee_settings',
        feeRate: 0.045, // 4.5%
        isActive: true,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      await db.collection('platform_config').doc('fee_settings').set(defaultConfig);

      return NextResponse.json({
        success: true,
        config: defaultConfig,
      });
    }

    const config = configDoc.data() as PlatformFeeConfig;

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error loading platform config:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Fehler beim Laden der Plattformkonfiguration',
      },
      { status: 500 }
    );
  }
}
