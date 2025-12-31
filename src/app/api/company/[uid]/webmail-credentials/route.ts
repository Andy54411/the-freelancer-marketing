/**
 * API: Webmail Credentials speichern und abrufen
 * 
 * Speichert die Webmail-Zugangsdaten verschlüsselt in Firebase.
 * Das Passwort wird mit AES-256-GCM verschlüsselt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import crypto from 'crypto';

// Encryption Key aus Umgebungsvariable (oder Default für Entwicklung)
const ENCRYPTION_KEY = process.env.WEBMAIL_ENCRYPTION_KEY || 'taskilo-webmail-encryption-key-32b';

// Schema für Credentials
const CredentialsSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
});

/**
 * Verschlüsselt einen String mit AES-256-GCM
 */
function encrypt(text: string): string {
  // Normalisiere den Key auf 32 Bytes
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Entschlüsselt einen String mit AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * GET /api/company/[uid]/webmail-credentials
 * Gibt die entschlüsselten Webmail-Zugangsdaten zurück
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    // Company-Dokument laden
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Unternehmen nicht gefunden' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data();
    const webmailConfig = companyData?.webmailConfig;

    if (!webmailConfig?.credentials?.password) {
      return NextResponse.json(
        { success: false, error: 'Keine Webmail-Zugangsdaten gespeichert' },
        { status: 404 }
      );
    }

    // Passwort entschlüsseln
    let decryptedPassword: string;
    try {
      decryptedPassword = decrypt(webmailConfig.credentials.password);
    } catch {
      // Falls Entschlüsselung fehlschlägt, ist es möglicherweise unverschlüsselt (Legacy)
      decryptedPassword = webmailConfig.credentials.password;
    }

    return NextResponse.json({
      success: true,
      email: webmailConfig.credentials.email || webmailConfig.email,
      password: decryptedPassword,
    });

  } catch (error) {
    console.error('[Webmail Credentials GET] Fehler:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/[uid]/webmail-credentials
 * Speichert Webmail-Zugangsdaten verschlüsselt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    // Validierung
    const validationResult = CredentialsSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Passwort verschlüsseln
    const encryptedPassword = encrypt(password);

    // Speichern in Firebase
    const companyDocRef = db.collection('companies').doc(companyId);
    
    await companyDocRef.update({
      webmailConfig: {
        id: `webmail-${companyId}`,
        email: email,
        provider: 'taskilo-webmail',
        status: 'connected',
        connectedAt: new Date().toISOString(),
        credentials: {
          email: email,
          password: encryptedPassword,
          encryptedAt: new Date().toISOString(),
        },
      },
      // Auch die Top-Level Felder aktualisieren für Kompatibilität
      taskiloEmail: email,
      taskiloEmailConnected: true,
      webmailCredentialsSavedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Zugangsdaten sicher gespeichert',
    });

  } catch (error) {
    console.error('[Webmail Credentials] Fehler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/company/[uid]/webmail-credentials
 * Löscht Webmail-Zugangsdaten
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    const companyDocRef = db.collection('companies').doc(companyId);
    
    await companyDocRef.update({
      'webmailConfig.credentials': FieldValue.delete(),
      'webmailConfig.status': 'disconnected',
    });

    return NextResponse.json({
      success: true,
      message: 'Zugangsdaten gelöscht',
    });

  } catch (error) {
    console.error('[Webmail Credentials] Fehler:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
