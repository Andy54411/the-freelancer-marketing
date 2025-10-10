// Admin Updates API - Bridge zwischen AWS Admin Auth und Firebase Updates
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { db } from '@/firebase/server';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

// Admin-Berechtigung prüfen
async function verifyAdmin(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);

    // Benutzer aus DynamoDB validieren
    const command = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: payload.email }),
    });

    const result = await dynamodb.send(command);

    if (!result.Item) {
      return null;
    }

    const user = unmarshall(result.Item);
    return {
      id: user.id,
      email: user.email || user.id,
      name: user.name || 'Admin',
      role: user.role || 'admin',
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

// GET - Alle Updates abrufen
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const updatesRef = collection(db, 'updates');
    const updatesQuery = query(updatesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(updatesQuery);

    const updates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
    }));

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Updates' }, { status: 500 });
  }
}

// POST - Neues Update erstellen
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const updateData = await request.json();

    // Validierung
    if (
      !updateData.version ||
      !updateData.title ||
      !updateData.description ||
      !updateData.category
    ) {
      return NextResponse.json(
        {
          error: 'Version, Titel, Beschreibung und Kategorie sind erforderlich',
        },
        { status: 400 }
      );
    }

    // Update-Objekt erstellen
    const newUpdate = {
      version: updateData.version,
      title: updateData.title,
      description: updateData.description,
      category: updateData.category,
      releaseDate: updateData.releaseDate || new Date().toISOString().split('T')[0],
      isBreaking: updateData.isBreaking || false,
      tags: updateData.tags || [],
      screenshots: updateData.screenshots || [],
      videoUrl: updateData.videoUrl || null,
      documentationUrl: updateData.documentationUrl || null,
      createdBy: admin.email,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const updatesRef = collection(db, 'updates');
    const docRef = await addDoc(updatesRef, newUpdate);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Update erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Error creating update:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Updates' }, { status: 500 });
  }
}

// PUT - Update bearbeiten
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Update-ID ist erforderlich' }, { status: 400 });
    }

    const updateRef = doc(db, 'updates', id);
    await updateDoc(updateRef, {
      ...updateData,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: 'Update erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('Error updating update:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Updates' }, { status: 500 });
  }
}

// DELETE - Update löschen
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Update-ID ist erforderlich' }, { status: 400 });
    }

    const updateRef = doc(db, 'updates', id);
    await deleteDoc(updateRef);

    return NextResponse.json({
      success: true,
      message: 'Update erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Updates' }, { status: 500 });
  }
}
