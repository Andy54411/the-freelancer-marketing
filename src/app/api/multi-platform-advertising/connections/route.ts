import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

const db = admin.firestore();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const platform = searchParams.get('platform');

    console.log('🔍 Connections API called with:', { companyId, platform });

    if (!companyId) {
      console.log('❌ Missing companyId');
      return NextResponse.json(
        { success: false, error: 'Company ID ist erforderlich' },
        { status: 400 }
      );
    }

    // Mock-Implementierung - zeigt immer "disconnected" für korrektes UI-Verhalten
    const connections = [
      { platform: 'google-ads', status: 'disconnected', lastConnected: null, accountInfo: null },
      { platform: 'linkedin', status: 'disconnected', lastConnected: null, accountInfo: null },
      { platform: 'meta', status: 'disconnected', lastConnected: null, accountInfo: null },
      { platform: 'taboola', status: 'disconnected', lastConnected: null, accountInfo: null },
      { platform: 'outbrain', status: 'disconnected', lastConnected: null, accountInfo: null },
    ];

    if (platform) {
      // Check real connection status from Firestore
      try {
        console.log('🔍 Checking Firestore for connection:', `/companies/${companyId}/advertising_connections/${platform}`);
        
        const connectionDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('advertising_connections')
          .doc(platform)
          .get();
        
        console.log('📊 Firestore doc exists:', connectionDoc.exists);
        
        if (connectionDoc.exists) {
          const connectionData = connectionDoc.data();
          console.log('📄 Connection data from Firestore:', connectionData);
          
          return NextResponse.json({
            success: true,
            connection: {
              platform,
              status: connectionData?.status || 'disconnected', // NIEMALS 'connected' als Fallback!
              customerId: connectionData?.customerId,
              connectedAt: connectionData?.connectedAt || connectionData?.requestedAt,
              userInfo: connectionData?.userInfo,
              lastConnected: connectionData?.connectedAt || connectionData?.requestedAt,
              // Debug info
              _debug: {
                rawStatus: connectionData?.status,
                isRealConnection: connectionData?.isRealConnection,
                managerApproved: connectionData?.managerApproved
              }
            },
          });
        } else {
          // Keine Verbindung vorhanden
          console.log('❌ No connection found in Firestore');
          return NextResponse.json({
            success: true,
            connection: { platform, status: 'disconnected', lastConnected: null, accountInfo: null },
          });
        }
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        // Fallback: disconnected
        return NextResponse.json({
          success: true,
          connection: { platform, status: 'disconnected', lastConnected: null, accountInfo: null },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: connections,
    });

  } catch (error) {
    console.error('API Fehler:', error);
    return NextResponse.json(
      { success: false, error: 'API Fehler' },
      { status: 500 }
    );
  }
}