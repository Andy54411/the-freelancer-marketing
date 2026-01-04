/**
 * Bank Verification API - Initiate
 * 
 * POST - Startet die Bankverifizierung durch Micro-Deposit (0,01 EUR)
 * GET - Prueft Verifizierungsstatus einer IBAN
 * 
 * Sicherheit: Nur authentifizierte Company-Inhaber
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse, isAuthorizedForCompany } from '@/lib/apiAuth';
import { BankVerificationService } from '@/services/BankVerificationService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    // Auth pruefen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { uid: companyId } = await params;

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
    const { iban, bic, accountHolder, bankName } = body;

    // Validierung
    if (!iban) {
      return NextResponse.json({ 
        error: 'IBAN erforderlich' 
      }, { status: 400 });
    }

    if (!accountHolder) {
      return NextResponse.json({ 
        error: 'Kontoinhaber erforderlich' 
      }, { status: 400 });
    }

    // IBAN Format pruefen (einfache Validierung)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleanIban)) {
      return NextResponse.json({ 
        error: 'Ungueltiges IBAN-Format' 
      }, { status: 400 });
    }

    const service = new BankVerificationService(adminDb);
    const result = await service.initiateVerification(
      companyId,
      cleanIban,
      bic,
      accountHolder,
      bankName
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verificationId: result.verificationId,
      maskedIban: result.maskedIban,
      message: result.message,
      expiresAt: result.expiresAt?.toISOString(),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ 
      error: 'Fehler bei der Bankverifizierung',
      details: message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    // Auth pruefen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { uid: companyId } = await params;

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
    const { searchParams } = new URL(request.url);
    const iban = searchParams.get('iban');

    const service = new BankVerificationService(adminDb);

    // Wenn IBAN angegeben, pruefe ob verifiziert
    if (iban) {
      const cleanIban = iban.replace(/\s/g, '').toUpperCase();
      const isVerified = await service.isIbanVerified(companyId, cleanIban);
      
      return NextResponse.json({
        success: true,
        iban: cleanIban,
        verified: isVerified,
      });
    }

    // Sonst hole alle verifizierten und pendenten
    const verifiedAccounts = await service.getVerifiedAccounts(companyId);
    const pendingVerification = await service.getPendingVerification(companyId);

    return NextResponse.json({
      success: true,
      verifiedAccounts: verifiedAccounts.map(v => ({
        id: v.id,
        maskedIban: v.maskedIban,
        accountHolder: v.accountHolder,
        bankName: v.bankName,
        verifiedAt: v.verifiedAt?.toDate?.()?.toISOString(),
      })),
      pendingVerification: pendingVerification ? {
        id: pendingVerification.id,
        maskedIban: pendingVerification.maskedIban,
        status: pendingVerification.status,
        expiresAt: pendingVerification.codeExpiresAt?.toDate?.()?.toISOString(),
        remainingAttempts: pendingVerification.maxAttempts - pendingVerification.verificationAttempts,
      } : null,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ 
      error: 'Fehler beim Abrufen des Verifizierungsstatus',
      details: message 
    }, { status: 500 });
  }
}
