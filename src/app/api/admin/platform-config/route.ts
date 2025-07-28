import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

// Force dynamic rendering - verhindert static generation
export const dynamic = 'force-dynamic';

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
    // Get platform config from Firestore
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
