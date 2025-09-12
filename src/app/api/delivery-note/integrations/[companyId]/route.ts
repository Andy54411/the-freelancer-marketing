import { NextRequest, NextResponse } from 'next/server';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// Firebase-Konfiguration
if (!getApps().length) {
  const firebaseConfig = {
    // Firebase-Konfiguration hier einfügen
    // Diese sollte aus Umgebungsvariablen geladen werden
  };
  initializeApp(firebaseConfig);
}

const db = getFirestore();
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

// GET - Lade alle Integrationen für ein Unternehmen
export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;

    const q = query(collection(db, INTEGRATIONS_COLLECTION), where('companyId', '==', companyId));

    const querySnapshot = await getDocs(q);
    const integrations: ApiIntegration[] = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      integrations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastSync: data.lastSync?.toDate() || undefined,
      } as ApiIntegration);
    });

    return NextResponse.json({
      success: true,
      integrations,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Integrationen konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

// POST - Neue Integration erstellen
export async function POST(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    const integrationData = await request.json();

    // Sichere Speicherung (ohne sensible Credentials in der Response)
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

    const docRef = await addDoc(collection(db, INTEGRATIONS_COLLECTION), docData);

    // Response ohne sensible Daten
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

    return NextResponse.json({
      success: true,
      integration: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Integration konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}

// PUT - Integration aktualisieren
export async function PUT(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { companyId } = params;
    const { integrationId, ...updateData } = await request.json();

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Integration erfolgreich aktualisiert',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Integration konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
}

// DELETE - Integration löschen
export async function DELETE(request: NextRequest, { params }: { params: { companyId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration-ID ist erforderlich' },
        { status: 400 }
      );
    }

    const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: 'Integration erfolgreich gelöscht',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Integration konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
}
