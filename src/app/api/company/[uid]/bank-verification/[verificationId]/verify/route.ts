/**
 * Bank Verification API - Verify Code
 * 
 * POST - Prueft den eingegebenen Verifizierungscode
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse, isAuthorizedForCompany } from '@/lib/apiAuth';
import { BankVerificationService } from '@/services/BankVerificationService';

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ uid: string; verificationId: string }> }
) {
  try {
    // Auth pruefen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { uid: companyId, verificationId } = await params;

    // Pruefe Berechtigung
    if (!isAuthorizedForCompany(authResult.userId, companyId, authResult.token)) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 });
    }

    // Firebase Admin
    const { admin } = await import('@/firebase/server');
    if (!admin) {
      return NextResponse.json({ error: 'Firebase nicht verfuegbar' }, { status: 500 });
    }

    const adminDb = admin.firestore();
    const body = await request.json();
    const { code } = body;

    // Validierung
    if (!code) {
      return NextResponse.json({ 
        error: 'Verifizierungscode erforderlich' 
      }, { status: 400 });
    }

    // Code sollte 6 Zeichen haben (TASKILO-XXXXXX -> nur XXXXXX)
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Erlaube "TASKILO-XXXXXX" oder nur "XXXXXX"
    const finalCode = cleanCode.replace('TASKILO', '');
    
    if (finalCode.length !== 6) {
      return NextResponse.json({ 
        error: 'Der Verifizierungscode muss 6 Zeichen haben' 
      }, { status: 400 });
    }

    const service = new BankVerificationService(adminDb);
    const result = await service.verifyCode(companyId, verificationId, finalCode);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        remainingAttempts: result.remainingAttempts,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verified: result.verified,
      message: result.message,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ 
      error: 'Fehler bei der Code-Verifizierung',
      details: message 
    }, { status: 500 });
  }
}
