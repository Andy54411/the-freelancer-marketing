import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

const INTEGRATIONS_COLLECTION = 'delivery_note_integrations';

export interface ApiIntegration {
  id: string;
  companyId: string;
  name: string;
  type: 'shipping' | 'ecommerce' | 'postal' | 'marketplace';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  description: string;
  features: string[];
  config: Record<string, any>;
  credentials: {
    apiKey?: string;
    secretKey?: string;
    endpoint?: string;
    storeUrl?: string;
    accessToken?: string;
  };
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;

    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const snapshot = await db
      .collection(INTEGRATIONS_COLLECTION)
      .where('companyId', '==', companyId)
      .get();

    const integrations: ApiIntegration[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      integrations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastSync: data.lastSync?.toDate() || undefined,
      } as ApiIntegration);
    });

    return NextResponse.json({ success: true, integrations });
  } catch (error) {
    console.error('Fehler beim Laden der Integrationen:', error);
    return NextResponse.json(
      { success: false, error: 'Integrationen konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const integrationData = await request.json();

    // Check if Firebase is properly initialized
    if (!isFirebaseAvailable() || !db) {
      console.error('Firebase not initialized');
      return NextResponse.json(
        { success: false, error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    const docData = {
      companyId,
      name: integrationData.name,
      type: integrationData.type,
      status: integrationData.status || 'disconnected',
      description: integrationData.description,
      features: integrationData.features || [],
      config: integrationData.config || {},
      credentials: integrationData.credentials || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db!.collection(INTEGRATIONS_COLLECTION).add(docData);

    const responseData = {
      ...docData,
      id: docRef.id,
      credentials: {
        ...docData.credentials,
        apiKey: docData.credentials.apiKey
          ? `***${docData.credentials.apiKey.slice(-4)}`
          : undefined,
        secretKey: docData.credentials.secretKey ? '***sensitive***' : undefined,
      },
    };

    return NextResponse.json({ success: true, integration: responseData });
  } catch (error) {
    console.error('Fehler beim Erstellen der Integration:', error);
    return NextResponse.json(
      { success: false, error: 'Integration konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}
