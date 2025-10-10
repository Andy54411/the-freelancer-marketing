// Admin Updates API - Bridge zwischen AWS Admin Auth und Firebase Updates
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { db } from '@/firebase/server';
import * as admin from 'firebase-admin';

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
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const updatesSnapshot = await db.collection('updates').orderBy('createdAt', 'desc').get();

    const updates = updatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ updates });
  } catch (error) {
    console.error('Fehler beim Laden der Updates:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Updates' }, { status: 500 });
  }
}

// POST - Neues Update erstellen
export async function POST(request: NextRequest) {
  try {
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, imageUrl } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Titel, Beschreibung und Kategorie sind erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const newUpdate = {
      title,
      description,
      category,
      imageUrl: imageUrl || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('updates').add(newUpdate);

    return NextResponse.json({
      id: docRef.id,
      ...newUpdate,
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Updates:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Updates' }, { status: 500 });
  }
}

// PUT - Update bearbeiten
export async function PUT(request: NextRequest) {
  try {
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Update-ID ist erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    await db
      .collection('updates')
      .doc(id)
      .update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Update-ID ist erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    await db.collection('updates').doc(id).delete();

    return NextResponse.json({
      success: true,
      message: 'Update erfolgreich gelöscht',
    });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Updates' }, { status: 500 });
  }
}
