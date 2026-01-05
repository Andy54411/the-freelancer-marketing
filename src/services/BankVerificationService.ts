/**
 * Bank Verification Service
 * 
 * Implementiert Micro-Deposit Verifizierung:
 * - Sendet 0,01 EUR mit 6-stelligem Code im Verwendungszweck
 * - User muss Code eingeben um IBAN zu verifizieren
 * - Verhindert Auszahlungen an ungepruefte Konten
 * 
 * Compliance: PSD2, AML/KYC Best Practices
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const PAYMENT_BACKEND_URL = process.env.PAYMENT_BACKEND_URL || 'https://mail.taskilo.de';
const PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || process.env.WEBMAIL_API_KEY;

/**
 * Generiert einen 6-stelligen alphanumerischen Verifizierungscode
 * Vermeidet verwechselbare Zeichen (0/O, 1/I/l)
 */
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Berechnet Hash einer IBAN fuer sichere Speicherung
 */
function hashIban(iban: string): string {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  // Einfacher Hash - In Production crypto.createHash verwenden
  let hash = 0;
  for (let i = 0; i < cleanIban.length; i++) {
    const char = cleanIban.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Maskiert IBAN fuer Anzeige (DE89***...***4321)
 */
function maskIban(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  if (clean.length < 10) return clean;
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

export interface BankVerification {
  id: string;
  companyId: string;
  iban: string;
  ibanHash: string;
  maskedIban: string;
  bic?: string;
  accountHolder: string;
  bankName?: string;
  
  // Verifizierungsstatus
  status: 'pending' | 'code_sent' | 'verified' | 'failed' | 'expired';
  verificationCode?: string; // Nur intern gespeichert
  codeExpiresAt?: Timestamp;
  
  // Micro-Deposit Details
  microDepositAmount: number; // 0.01 EUR
  microDepositReference: string;
  microDepositPaymentId?: string;
  microDepositSentAt?: Timestamp;
  
  // Versuche
  verificationAttempts: number;
  maxAttempts: number; // Standard: 3
  lastAttemptAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  verifiedAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface InitiateVerificationResult {
  success: boolean;
  verificationId?: string;
  maskedIban?: string;
  message?: string;
  error?: string;
  expiresAt?: Date;
}

export interface VerifyCodeResult {
  success: boolean;
  verified?: boolean;
  message?: string;
  error?: string;
  remainingAttempts?: number;
}

export class BankVerificationService {
  private db: FirebaseFirestore.Firestore;
  
  constructor(db: FirebaseFirestore.Firestore) {
    this.db = db;
  }
  
  /**
   * Prueft ob eine IBAN bereits verifiziert ist
   */
  async isIbanVerified(companyId: string, iban: string): Promise<boolean> {
    const ibanHash = hashIban(iban);
    
    const snapshot = await this.db
      .collection('bankVerifications')
      .where('companyId', '==', companyId)
      .where('ibanHash', '==', ibanHash)
      .where('status', '==', 'verified')
      .limit(1)
      .get();
    
    return !snapshot.empty;
  }
  
  /**
   * Holt alle verifizierten Bankkonten einer Company
   */
  async getVerifiedAccounts(companyId: string): Promise<BankVerification[]> {
    const snapshot = await this.db
      .collection('bankVerifications')
      .where('companyId', '==', companyId)
      .where('status', '==', 'verified')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as BankVerification[];
  }
  
  /**
   * Holt aktuelle ausstehende Verifizierung
   */
  async getPendingVerification(companyId: string): Promise<BankVerification | null> {
    // KEIN orderBy - Sort in App (Firestore Regel)
    const snapshot = await this.db
      .collection('bankVerifications')
      .where('companyId', '==', companyId)
      .where('status', 'in', ['pending', 'code_sent'])
      .limit(10)
      .get();
    
    if (snapshot.empty) return null;
    
    // Sortiere in App nach createdAt (neueste zuerst)
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as BankVerification[];
    
    docs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    return docs[0] || null;
  }
  
  /**
   * Startet eine neue Bankverifizierung
   * Sendet 0,01 EUR mit Verifizierungscode
   */
  async initiateVerification(
    companyId: string,
    iban: string,
    bic: string | undefined,
    accountHolder: string,
    bankName?: string
  ): Promise<InitiateVerificationResult> {
    const ibanHash = hashIban(iban);
    const maskedIbanStr = maskIban(iban);
    
    // Pruefe ob bereits verifiziert
    if (await this.isIbanVerified(companyId, iban)) {
      return {
        success: true,
        maskedIban: maskedIbanStr,
        message: 'Diese IBAN ist bereits verifiziert.',
      };
    }
    
    // Pruefe auf aktive Verifizierung
    const pending = await this.getPendingVerification(companyId);
    if (pending && pending.ibanHash === ibanHash) {
      // Pruefe ob noch gueltig
      const expiresAt = pending.codeExpiresAt?.toDate();
      if (expiresAt && expiresAt > new Date()) {
        return {
          success: true,
          verificationId: pending.id,
          maskedIban: pending.maskedIban,
        message: 'Verifizierung bereits gestartet. Bitte prüfen Sie Ihr Bankkonto auf die 0,01 EUR Gutschrift.',
          expiresAt,
        };
      }
      // Abgelaufen - setze auf expired
      await this.db.collection('bankVerifications').doc(pending.id).update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    // Generiere Verifizierungscode
    const verificationCode = generateVerificationCode();
    const reference = `TASKILO-${verificationCode}`;
    
    // Code ist 7 Tage gueltig
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Erstelle Verifizierungs-Eintrag
    const verificationRef = this.db.collection('bankVerifications').doc();
    const verification: Omit<BankVerification, 'id'> = {
      companyId,
      iban,
      ibanHash,
      maskedIban: maskedIbanStr,
      bic,
      accountHolder,
      bankName,
      status: 'pending',
      verificationCode,
      codeExpiresAt: Timestamp.fromDate(expiresAt),
      microDepositAmount: 0.01,
      microDepositReference: reference,
      verificationAttempts: 0,
      maxAttempts: 3,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    await verificationRef.set(verification);
    
    // Sende Micro-Deposit via Revolut
    try {
      const response = await fetch(`${PAYMENT_BACKEND_URL}/api/payment/payout/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PAYMENT_API_KEY || '',
        },
        body: JSON.stringify({
          amount: 0.01,
          currency: 'EUR',
          iban,
          bic,
          name: accountHolder,
          reference,
          // Markiere als Verifizierungs-Transaktion
          metadata: {
            type: 'bank_verification',
            verificationId: verificationRef.id,
            companyId,
          },
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        // Loesche Verifizierung bei Fehler
        await verificationRef.delete();
        
        return {
          success: false,
          error: result.error || 'Micro-Deposit konnte nicht gesendet werden',
        };
      }
      
      // Update mit Payment ID
      await verificationRef.update({
        status: 'code_sent',
        microDepositPaymentId: result.paymentId,
        microDepositSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return {
        success: true,
        verificationId: verificationRef.id,
        maskedIban: maskedIbanStr,
        message: `Wir haben 0,01 EUR an ${maskedIbanStr} überwiesen. Der Verwendungszweck enthält Ihren Verifizierungscode (TASKILO-XXXXXX). Bitte geben Sie diesen Code ein.`,
        expiresAt,
      };
      
    } catch {
      // Cleanup bei Fehler
      await verificationRef.delete();
      
      return {
        success: false,
        error: 'Fehler beim Senden der Verifizierungs-Überweisung',
      };
    }
  }
  
  /**
   * Verifiziert den eingegebenen Code
   */
  async verifyCode(
    companyId: string,
    verificationId: string,
    inputCode: string
  ): Promise<VerifyCodeResult> {
    const docRef = this.db.collection('bankVerifications').doc(verificationId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return {
        success: false,
        error: 'Verifizierung nicht gefunden',
      };
    }
    
    const verification = doc.data() as BankVerification;
    
    // Pruefe Company-Zugehoerigkeit
    if (verification.companyId !== companyId) {
      return {
        success: false,
        error: 'Keine Berechtigung',
      };
    }
    
    // Pruefe Status
    if (verification.status === 'verified') {
      return {
        success: true,
        verified: true,
        message: 'IBAN bereits verifiziert',
      };
    }
    
    if (verification.status === 'expired' || verification.status === 'failed') {
      return {
        success: false,
        error: 'Verifizierung abgelaufen oder fehlgeschlagen. Bitte starten Sie eine neue Verifizierung.',
      };
    }
    
    // Pruefe Ablauf
    const expiresAt = verification.codeExpiresAt?.toDate();
    if (expiresAt && expiresAt < new Date()) {
      await docRef.update({
        status: 'expired',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        success: false,
        error: 'Code abgelaufen. Bitte starten Sie eine neue Verifizierung.',
      };
    }
    
    // Pruefe Versuche
    if (verification.verificationAttempts >= verification.maxAttempts) {
      await docRef.update({
        status: 'failed',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        success: false,
        error: 'Maximale Versuche erreicht. Bitte starten Sie eine neue Verifizierung.',
      };
    }
    
    // Normalisiere Input (nur Buchstaben/Zahlen, uppercase)
    const normalizedInput = inputCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const expectedCode = verification.verificationCode?.toUpperCase();
    
    // Vergleiche Code
    if (normalizedInput === expectedCode) {
      // Erfolgreich!
      await docRef.update({
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp(),
        verificationAttempts: verification.verificationAttempts + 1,
        lastAttemptAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        // Loesche den Code aus Sicherheitsgruenden
        verificationCode: FieldValue.delete(),
      });
      
      return {
        success: true,
        verified: true,
        message: 'IBAN erfolgreich verifiziert! Auszahlungen sind jetzt moeglich.',
      };
    }
    
    // Falscher Code
    const newAttempts = verification.verificationAttempts + 1;
    const remainingAttempts = verification.maxAttempts - newAttempts;
    
    await docRef.update({
      verificationAttempts: newAttempts,
      lastAttemptAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: remainingAttempts <= 0 ? 'failed' : 'code_sent',
    });
    
    if (remainingAttempts <= 0) {
      return {
        success: false,
        error: 'Code falsch. Maximale Versuche erreicht. Bitte starten Sie eine neue Verifizierung.',
        remainingAttempts: 0,
      };
    }
    
    return {
      success: false,
      error: `Code falsch. Noch ${remainingAttempts} Versuch(e) uebrig.`,
      remainingAttempts,
    };
  }
  
  /**
   * Startet Verifizierung neu (neuer Code)
   */
  async resendVerification(
    companyId: string,
    verificationId: string
  ): Promise<InitiateVerificationResult> {
    const doc = await this.db.collection('bankVerifications').doc(verificationId).get();
    
    if (!doc.exists) {
      return {
        success: false,
        error: 'Verifizierung nicht gefunden',
      };
    }
    
    const verification = doc.data() as BankVerification;
    
    if (verification.companyId !== companyId) {
      return {
        success: false,
        error: 'Keine Berechtigung',
      };
    }
    
    // Setze alte auf expired
    await this.db.collection('bankVerifications').doc(verificationId).update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    // Starte neue
    return this.initiateVerification(
      companyId,
      verification.iban,
      verification.bic,
      verification.accountHolder,
      verification.bankName
    );
  }
}
