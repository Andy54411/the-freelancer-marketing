import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  if (!db) {
    console.error('❌ Firebase DB not initialized');
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }

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

    // Lade ECHTE Verbindungen aus Firestore
    const allPlatforms = ['google-ads', 'linkedin', 'meta', 'taboola', 'outbrain'];
    
    if (platform) {
      // Einzelne Plattform abfragen
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
              status: connectionData?.status || 'disconnected',
              customerId: connectionData?.customerId,
              accountName: connectionData?.accountName,
              connectedAt: connectionData?.connectedAt,
              lastSync: connectionData?.lastSync,
              accountInfo: {
                id: connectionData?.customerId,
                name: connectionData?.accountName,
                currency: connectionData?.currency,
              },
              _debug: {
                rawStatus: connectionData?.status,
                isRealConnection: connectionData?.isRealConnection,
                managerApproved: connectionData?.managerApproved
              }
            },
          });
        } else {
          return NextResponse.json({
            success: true,
            connection: { platform, status: 'disconnected', lastConnected: null, accountInfo: null },
          });
        }
      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        return NextResponse.json({
          success: true,
          connection: { platform, status: 'disconnected', lastConnected: null, accountInfo: null },
        });
      }
    }

    // Alle Plattformen abfragen
    interface ConnectionInfo {
      platform: string;
      status: string;
      lastConnected: string | null;
      accountInfo: { id: string; name: string; currency: string } | null;
    }
    const connections: ConnectionInfo[] = [];
    
    for (const platformName of allPlatforms) {
      try {
        const connectionDoc = await db
          .collection('companies')
          .doc(companyId)
          .collection('advertising_connections')
          .doc(platformName)
          .get();
        
        if (connectionDoc.exists) {
          const data = connectionDoc.data();
          connections.push({
            platform: platformName,
            status: data?.status || 'disconnected',
            lastConnected: data?.connectedAt || data?.lastSync || null,
            accountInfo: data?.customerId ? {
              id: data.customerId,
              name: data.accountName,
              currency: data.currency,
            } : null,
          });
        } else {
          connections.push({
            platform: platformName,
            status: 'disconnected',
            lastConnected: null,
            accountInfo: null,
          });
        }
      } catch {
        connections.push({
          platform: platformName,
          status: 'disconnected',
          lastConnected: null,
          accountInfo: null,
        });
      }
    }

    console.log('📊 All connections loaded:', connections.map(c => ({ platform: c.platform, status: c.status })));

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