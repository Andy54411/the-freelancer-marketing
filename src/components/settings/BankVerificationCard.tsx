'use client';

/**
 * BankVerificationCard - Micro-Deposit Bankverifizierung
 * 
 * Zeigt den Verifizierungsstatus der Bankverbindung und ermoeglicht:
 * - Start einer neuen Verifizierung (0,01 EUR Ueberweisung)
 * - Eingabe des Verifizierungscodes aus dem Kontoauszug
 * - Anzeige bereits verifizierter Konten
 */

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, AlertCircle, Clock, CreditCard, RefreshCw, CheckCircle2, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';

interface VerifiedAccount {
  id: string;
  maskedIban: string;
  accountHolder: string;
  bankName?: string;
  verifiedAt?: string;
}

interface PendingVerification {
  id: string;
  maskedIban: string;
  status: 'pending' | 'code_sent';
  expiresAt?: string;
  remainingAttempts?: number;
}

interface BankVerificationCardProps {
  companyId: string;
  currentIban?: string;
  currentBic?: string;
  currentAccountHolder?: string;
  currentBankName?: string;
  onVerificationComplete?: () => void;
}

export function BankVerificationCard({
  companyId,
  currentIban,
  currentBic,
  currentAccountHolder,
  currentBankName,
  onVerificationComplete,
}: BankVerificationCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [verifiedAccounts, setVerifiedAccounts] = useState<VerifiedAccount[]>([]);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [isCurrentIbanVerified, setIsCurrentIbanVerified] = useState(false);
  
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Status laden
  const loadVerificationStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/company/${companyId}/bank-verification`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Fehler beim Laden');
      
      const data = await response.json();
      
      setVerifiedAccounts(data.verifiedAccounts || []);
      setPendingVerification(data.pendingVerification || null);
      
      // Prüfe ob aktuelle IBAN verifiziert ist
      if (currentIban && data.verifiedAccounts) {
        const cleanIban = currentIban.replace(/\s/g, '').toUpperCase();
        const masked = `${cleanIban.slice(0, 4)}****${cleanIban.slice(-4)}`;
        const verified = data.verifiedAccounts.some((v: VerifiedAccount) => v.maskedIban === masked);
        setIsCurrentIbanVerified(verified);
      }
      
      // Wenn pending, zeige Code-Eingabe
      if (data.pendingVerification?.status === 'code_sent') {
        setShowCodeInput(true);
      }
      
    } catch {
      toast.error('Fehler beim Laden des Verifizierungsstatus');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, currentIban]);

  useEffect(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]);

  // Verifizierung starten
  const initiateVerification = async () => {
    if (!currentIban || !currentAccountHolder) {
      toast.error('Bitte geben Sie zuerst IBAN und Kontoinhaber ein');
      return;
    }
    
    setIsInitiating(true);
    
    try {
      const response = await fetch(`/api/company/${companyId}/bank-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          iban: currentIban,
          bic: currentBic,
          accountHolder: currentAccountHolder,
          bankName: currentBankName,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Starten der Verifizierung');
      }
      
      toast.success(data.message || 'Verifizierung gestartet');
      
      setPendingVerification({
        id: data.verificationId,
        maskedIban: data.maskedIban,
        status: 'code_sent',
        expiresAt: data.expiresAt,
      });
      
      setShowCodeInput(true);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(message);
    } finally {
      setIsInitiating(false);
    }
  };

  // Code verifizieren
  const verifyCode = async () => {
    if (!pendingVerification || !verificationCode) {
      toast.error('Bitte geben Sie den Code ein');
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const response = await fetch(
        `/api/company/${companyId}/bank-verification/${pendingVerification.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: verificationCode }),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Code falsch');
      }
      
      if (data.verified) {
        toast.success('Bankverbindung erfolgreich verifiziert!');
        setIsCurrentIbanVerified(true);
        setPendingVerification(null);
        setShowCodeInput(false);
        setVerificationCode('');
        
        // Reload status
        await loadVerificationStatus();
        
        // Callback
        onVerificationComplete?.();
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verifizierung fehlgeschlagen';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          <span className="text-gray-600">Lade Verifizierungsstatus...</span>
        </div>
      </div>
    );
  }

  // Wenn keine IBAN hinterlegt
  if (!currentIban) {
    return (
      <div className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Keine Bankverbindung</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Bitte tragen Sie zuerst Ihre Bankverbindung ein, bevor Sie diese verifizieren koennen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // IBAN bereits verifiziert
  if (isCurrentIbanVerified) {
    return (
      <div className="border border-green-200 rounded-lg p-6 bg-green-50">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-green-800">Bankverbindung verifiziert</h3>
            <p className="text-sm text-green-700 mt-1">
              Ihre IBAN ist verifiziert. Auszahlungen sind freigeschaltet.
            </p>
            
            {verifiedAccounts.length > 0 && (
              <div className="mt-3 space-y-2">
                {verifiedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{account.maskedIban}</span>
                    {account.bankName && <span className="text-green-600">({account.bankName})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Verifizierung ausstehend
  if (pendingVerification && showCodeInput) {
    return (
      <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-800">Verifizierungscode eingeben</h3>
            <p className="text-sm text-blue-700 mt-1">
              Wir haben 0,01 EUR an <strong>{pendingVerification.maskedIban}</strong> ueberwiesen.
              Der Verwendungszweck enthaelt Ihren Code (TASKILO-XXXXXX).
            </p>
            
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600">
                  Pruefen Sie Ihren Kontoauszug. Die Ueberweisung kann 1-3 Werktage dauern.
                </span>
              </div>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="6-stelliger Code"
                  maxLength={12}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono text-lg uppercase tracking-widest focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <button
                  onClick={verifyCode}
                  disabled={isVerifying || verificationCode.length < 6}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pruefen...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Verifizieren
                    </>
                  )}
                </button>
              </div>
              
              {pendingVerification.remainingAttempts !== undefined && pendingVerification.remainingAttempts < 3 && (
                <p className="text-xs text-orange-600 mt-2">
                  Noch {pendingVerification.remainingAttempts} Versuch(e) uebrig
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-200">
              <button
                onClick={initiateVerification}
                disabled={isInitiating}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Neuen Code anfordern
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Noch nicht verifiziert - Start anbieten
  return (
    <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-orange-800">Bankverbindung nicht verifiziert</h3>
          <p className="text-sm text-orange-700 mt-1">
            Aus Sicherheitsgruenden muessen Sie Ihre Bankverbindung verifizieren, bevor Auszahlungen moeglich sind.
            Wir ueberweisen 0,01 EUR mit einem Verifizierungscode an Ihr Konto.
          </p>
          
          <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{currentAccountHolder}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1 font-mono">
              {currentIban}
            </div>
            {currentBankName && (
              <div className="text-xs text-gray-400 mt-1">{currentBankName}</div>
            )}
          </div>
          
          <button
            onClick={initiateVerification}
            disabled={isInitiating}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isInitiating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Jetzt verifizieren
              </>
            )}
          </button>
          
          <p className="text-xs text-orange-600 mt-3">
            Die Ueberweisung erfolgt sofort, kann aber 1-3 Werktage auf Ihrem Konto erscheinen.
          </p>
        </div>
      </div>
    </div>
  );
}
