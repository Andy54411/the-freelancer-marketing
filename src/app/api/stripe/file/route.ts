import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/firebase/server';
import { headers } from 'next/headers';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY ist nicht definiert');
}

// Stripe mit zusätzlichen Optionen initialisieren
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3, // Erhöht auf 3 Versuche
  timeout: 20000, // 20 Sekunden Timeout
  telemetry: false, // Telemetrie deaktivieren für bessere Performance
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // CORS Headers für die Response
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', 'application/json');

    // Auth Header prüfen
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Keine Authentifizierung gefunden' },
        { 
          status: 401,
          headers: responseHeaders 
        }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!auth) {
      throw new Error('Firebase Auth ist nicht initialisiert');
    }
    
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log(`[DEBUG] File Upload gestartet für User ${userId}`);

    // Multipart form data parsen
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const purpose = formData.get('purpose') as Stripe.FileCreateParams.Purpose | null;

    if (!file || !purpose) {
      console.error('[ERROR] Fehlende Daten:', { file: !!file, purpose });
      return NextResponse.json(
        { 
          error: 'Datei und purpose sind erforderlich',
          debug: { 
            receivedFile: !!file,
            receivedPurpose: purpose
          }
        },
        { 
          status: 400,
          headers: responseHeaders
        }
      );
    }

    console.log(`[DEBUG] File empfangen:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      purpose: purpose
    });

    // File in Buffer konvertieren
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[DEBUG] File zu Buffer konvertiert, Größe: ${buffer.length} bytes`);

    if (!file) {
      throw new Error('Keine Datei gefunden');
    }

    // Validiere Dateitype
    if (!file.type.startsWith('image/')) {
      throw new Error('Nur Bilddateien sind erlaubt');
    }

    // Validiere Dateigröße (max 8MB)
    const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB in Bytes
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Datei zu groß. Maximale Größe ist ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    console.log(`[DEBUG] Starte Stripe Upload für ${file.name}...`);

    let retryCount = 0;
    const maxRetries = 3;
    let lastError;
    let uploadedFile = null;

    while (retryCount <= maxRetries) {
      try {
        // File zu Stripe hochladen
        uploadedFile = await stripe.files.create({
          purpose: purpose,
          file: {
            data: buffer,
            name: file.name,
            type: file.type,
          }
        });

        console.log(`[DEBUG] Stripe Upload erfolgreich: ${uploadedFile.id}`);
        break;
      } catch (error: any) {
        lastError = error;
        retryCount++;
        
        if (error.type === 'StripeInvalidRequestError') {
          // Bei Validierungsfehlern nicht wiederholen
          throw error;
        }
        
        if (retryCount <= maxRetries) {
          // Exponentielles Backoff
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`[DEBUG] Retry ${retryCount}/${maxRetries} nach ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    if (!uploadedFile) {
      throw new Error(`Stripe Upload fehlgeschlagen nach ${maxRetries} Versuchen: ${lastError?.message}`);
    }

    // Log erfolgreichen Upload
    console.log(`[DEBUG] File erfolgreich zu Stripe hochgeladen:`, {
      stripeFileId: uploadedFile.id,
      purpose: purpose
    });

    // Erfolgreiche Response zurückgeben
    return NextResponse.json({
      success: true,
      stripeFileId: uploadedFile.id,
      purpose: purpose,
      type: file.type,
      name: file.name,
    }, {
      headers: responseHeaders
    });
    
  } catch (error: any) {
    console.error('Stripe File Upload Error:', error, {
      message: error.message,
      type: error.type,
      code: error.code,
      raw: error.raw
    });

    // Detaillierte Fehlermeldung für Debugging
    const errorResponse = {
      success: false,
      message: error.message || 'Ein Fehler ist beim Upload aufgetreten',
      type: error.type,
      code: error.code,
      details: error.raw?.message,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
      }
    };

    return NextResponse.json(
      errorResponse,
      { 
        status: error.statusCode || 500,
        headers: corsHeaders
      }
    );
  }
}