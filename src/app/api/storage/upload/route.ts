import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth } from '@/firebase/server';

/**
 * Cloud Storage Upload Endpoint
 * Lädt Dateien in Cloud Storage hoch und gibt Referenzen zurück
 * 
 * Unterstützt zwei Modi:
 * 1. companyId-basiert: Für bestehende Firmen (Belege, etc.)
 * 2. userId-basiert: Für Registrierung (Identitätsdokumente, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth-Token prüfen für Registration-Uploads
    const authHeader = request.headers.get('authorization');
    let authenticatedUserId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ') && adminAuth) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decodedToken = await adminAuth.verifyIdToken(token);
        authenticatedUserId = decodedToken.uid;
      } catch {
        // Token-Verifikation fehlgeschlagen - ignorieren für companyId-basierte Uploads
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const userId = formData.get('userId') as string;
    const purpose = formData.get('purpose') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Bestimme die ID für den Speicherpfad
    let storageOwnerId: string;
    let isRegistrationUpload = false;

    if (userId) {
      // Registration-Upload: userId muss mit authentifiziertem User übereinstimmen
      if (authenticatedUserId && authenticatedUserId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: userId mismatch',
          },
          { status: 403 }
        );
      }
      storageOwnerId = userId;
      isRegistrationUpload = true;
    } else if (companyId) {
      storageOwnerId = companyId;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Company ID or User ID required',
        },
        { status: 400 }
      );
    }

    // File validation
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'FILE_TOO_LARGE',
          details: `File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Bestimme Dateipfad basierend auf purpose oder Standard
    let fileName: string;
    const fileExtension = file.name.split('.').pop() || 'bin';
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    if (isRegistrationUpload && purpose) {
      // Registration-Uploads mit purpose-basiertem Pfad
      switch (purpose) {
        case 'identity_document':
          fileName = `companies/${storageOwnerId}/identity/${uniqueId}.${fileExtension}`;
          break;
        case 'business_icon':
        case 'business_logo':
          fileName = `companies/${storageOwnerId}/branding/${uniqueId}.${fileExtension}`;
          break;
        case 'additional_verification':
          fileName = `companies/${storageOwnerId}/documents/${uniqueId}.${fileExtension}`;
          break;
        default:
          fileName = `companies/${storageOwnerId}/uploads/${uniqueId}.${fileExtension}`;
      }
    } else {
      // Standard-Pfad für Belege etc.
      fileName = `${storageOwnerId}/receipts/${Date.now()}-${file.name}`;
    }

    // Real cloud storage upload implementation
    // Priority upload strategy:
    // 1. Try S3 upload (fastest for AWS Lambda)
    // 2. Fallback to GCS (if S3 fails)
    // 3. Fallback to signed URL generation

    let uploadResult: {
      success: boolean;
      s3Path: string | null;
      gcsPath: string | null;
      fileUrl: string | null;
      storage: string;
    } | null = null;

    // 🎯 IMMER zu Firebase Storage hochladen (auch in Development)
    // Firebase Storage ist die einzige zuverlässige Methode für persistente URLs
    console.log('[STORAGE] Uploading to Firebase Storage:', fileName);

    try {
      // Import Firebase Admin SDK
      const { getStorage } = await import('firebase-admin/storage');
      const { initializeApp, getApps, cert } = await import('firebase-admin/app');

      // Initialize Firebase Admin if not already initialized
      if (!getApps().length) {
        // Verwende FIREBASE_SERVICE_ACCOUNT_KEY (korrekte Env-Variable)
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountKey) {
          throw new Error('Firebase Service Account not configured');
        }
        const serviceAccount = JSON.parse(serviceAccountKey);
        initializeApp({
          credential: cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tilvo-f142f.firebasestorage.app',
        });
      }

      const bucket = getStorage().bucket();
      const fileRef = bucket.file(fileName);

      // Upload file buffer to Firebase Storage
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            companyId,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      console.log('[STORAGE] ✅ File uploaded to Firebase Storage successfully');

      // Generate signed URL for download (valid for 7 days)
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      uploadResult = {
        success: true,
        s3Path: null,
        gcsPath: `gs://${bucket.name}/${fileName}`,
        fileUrl: signedUrl,
        storage: 'FIREBASE_STORAGE',
      };

      console.log('[STORAGE] Firebase Storage URL created:', {
        gcsPath: uploadResult.gcsPath,
        signedUrl: signedUrl.substring(0, 100) + '...',
      });
    } catch (firebaseError) {
      // KEINE FALLBACKS! Firebase Storage MUSS funktionieren.
      // Fehler sofort werfen damit das Problem sichtbar wird.
      console.error('[STORAGE] Firebase Storage upload failed:', firebaseError);
      throw new Error(
        `Firebase Storage Upload fehlgeschlagen: ${firebaseError instanceof Error ? firebaseError.message : String(firebaseError)}`
      );
    }

    if (!uploadResult) {
      throw new Error('Upload fehlgeschlagen - kein Ergebnis');
    }
    
    // Validiere dass URL vorhanden ist - KEINE Fallbacks!
    if (!uploadResult.fileUrl) {
      throw new Error('Upload erfolgreich aber keine URL generiert');
    }

    // Generiere eindeutige fileId für die Rückgabe
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return NextResponse.json({
      success: true,
      // Für Registration-Uploads: fileId ist wichtig
      fileId,
      firebaseStorageUrl: uploadResult.fileUrl,
      firebaseStoragePath: uploadResult.gcsPath || fileName,
      // Legacy-Felder für bestehende Integrationen
      data: uploadResult,
      s3Path: uploadResult.s3Path,
      gcsPath: uploadResult.gcsPath,
      fileUrl: uploadResult.fileUrl,
      storage: uploadResult.storage,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        ownerId: storageOwnerId,
        purpose: purpose || 'general',
      },
    });
  } catch (error) {
    console.error('Cloud storage upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'UPLOAD_FAILED',
        details: error instanceof Error ? error.message : 'Unknown upload error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
      message: 'Use POST to upload files to cloud storage',
    },
    { status: 405 }
  );
}
