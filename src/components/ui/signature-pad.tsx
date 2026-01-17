'use client';

import { useRef, forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser, Check, X, Pen, HelpCircle, Fingerprint, Shield, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  getSignature: () => string | null;
  setSignature: (data: string) => void;
}

interface SignaturePadProps {
  label: string;
  onSave?: (signatureData: string, signerName: string, authMethod?: 'signature' | 'biometric') => void;
  onClear?: () => void;
  disabled?: boolean;
  initialSignature?: string;
  initialSignerName?: string;
  signedAt?: Date;
  className?: string;
  tooltipText?: string;
  /** Ermöglicht biometrische Authentifizierung (Touch ID, Face ID, Fingerabdruck) */
  allowBiometric?: boolean;
  /** Beschreibung für biometrische Authentifizierung */
  biometricDescription?: string;
}

/**
 * Prüft ob WebAuthn / Biometrische Authentifizierung verfügbar ist
 */
async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Prüfe ob WebAuthn API verfügbar ist
  if (!window.PublicKeyCredential) return false;
  
  try {
    // Prüfe ob Platform Authenticator (Touch ID, Face ID, Windows Hello) verfügbar ist
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Generiert eine sichere zufällige Challenge
 */
function generateChallenge(): Uint8Array {
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  return challenge;
}

/**
 * Konvertiert ArrayBuffer zu Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Erstellt ein SVG-Bild für biometrische Signatur
 */
function createBiometricSignatureImage(name: string, timestamp: Date): string {
  const dateStr = timestamp.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="128" viewBox="0 0 400 128">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e6fffa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f0fff4;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="128" fill="url(#bgGrad)" rx="8"/>
      <g transform="translate(16, 24)">
        <circle cx="24" cy="24" r="22" fill="#14ad9f" opacity="0.15"/>
        <path d="M24 12c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm-1 3v2.17A3.001 3.001 0 0021 22a3 3 0 002-5.24V17h2v-2h-2zM24 21a1 1 0 100 2 1 1 0 000-2z" fill="#14ad9f"/>
        <text x="56" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#6b7280">Biometrisch bestätigt</text>
        <text x="56" y="36" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#111827">${name}</text>
      </g>
      <g transform="translate(16, 80)">
        <rect width="368" height="1" fill="#d1d5db"/>
        <text x="0" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#9ca3af">${dateStr}</text>
        <g transform="translate(340, 12)">
          <circle cx="8" cy="8" r="8" fill="#14ad9f"/>
          <path d="M6 8l2 2 4-4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      </g>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ 
    label, 
    onSave, 
    onClear, 
    disabled = false, 
    initialSignature,
    initialSignerName,
    signedAt,
    className = '',
    tooltipText = 'Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Finger',
    allowBiometric = true,
    biometricDescription = 'Mit Touch ID, Face ID oder Fingerabdruck bestätigen',
  }, ref) => {
    const signatureRef = useRef<SignatureCanvas>(null);
    const [signerName, setSignerName] = useState(initialSignerName || '');
    const [isSigned, setIsSigned] = useState(!!initialSignature);
    const [isEditing, setIsEditing] = useState(!initialSignature);
    const [signatureData, setSignatureData] = useState<string | null>(initialSignature || null);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authMethod, setAuthMethod] = useState<'signature' | 'biometric' | null>(null);
    const [signatureMode, setSignatureMode] = useState<'draw' | 'biometric'>('draw');

    // Prüfe ob biometrische Authentifizierung verfügbar ist
    useEffect(() => {
      if (allowBiometric) {
        isBiometricAvailable().then(setBiometricAvailable);
      }
    }, [allowBiometric]);

    useEffect(() => {
      if (initialSignature) {
        setSignatureData(initialSignature);
        setIsSigned(true);
        setIsEditing(false);
      }
      if (initialSignerName) {
        setSignerName(initialSignerName);
      }
    }, [initialSignature, initialSignerName]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        signatureRef.current?.clear();
        setSignatureData(null);
        setIsSigned(false);
        setIsEditing(true);
        setAuthMethod(null);
      },
      isEmpty: () => {
        return signatureRef.current?.isEmpty() ?? true;
      },
      getSignature: () => {
        if (signatureRef.current?.isEmpty()) return null;
        return signatureRef.current?.toDataURL('image/png') || null;
      },
      setSignature: (data: string) => {
        setSignatureData(data);
        setIsSigned(true);
        setIsEditing(false);
      },
    }));

    const handleClear = () => {
      signatureRef.current?.clear();
      setSignatureData(null);
      setIsSigned(false);
      setAuthMethod(null);
      onClear?.();
    };

    const handleSave = () => {
      if (!signerName.trim()) {
        alert('Bitte geben Sie Ihren Namen ein.');
        return;
      }
      
      if (signatureRef.current?.isEmpty()) {
        alert('Bitte unterschreiben Sie im Feld.');
        return;
      }
      
      const data = signatureRef.current?.toDataURL('image/png');
      if (data) {
        setSignatureData(data);
        setIsSigned(true);
        setIsEditing(false);
        setAuthMethod('signature');
        onSave?.(data, signerName.trim(), 'signature');
      }
    };

    /**
     * Biometrische Authentifizierung mit WebAuthn
     */
    const handleBiometricAuth = useCallback(async () => {
      if (!signerName.trim()) {
        alert('Bitte geben Sie zuerst Ihren Namen ein.');
        return;
      }

      setIsAuthenticating(true);
      
      try {
        // Generiere Challenge für WebAuthn
        const challenge = generateChallenge();
        
        // Erstelle Credential-Optionen für biometrische Authentifizierung
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
          challenge: challenge.buffer as ArrayBuffer,
          rp: {
            name: 'Taskilo Inventur',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(signerName.trim()),
            name: signerName.trim(),
            displayName: signerName.trim(),
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Nur plattformeigene Authenticatoren (Touch ID, Face ID)
            userVerification: 'required', // Biometrische Verifizierung erforderlich
            residentKey: 'discouraged',
          },
          timeout: 60000,
          attestation: 'none',
        };

        // Führe biometrische Authentifizierung durch
        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        }) as PublicKeyCredential;

        if (credential) {
          // Authentifizierung erfolgreich
          const timestamp = new Date();
          const signatureImage = createBiometricSignatureImage(signerName.trim(), timestamp);
          
          // Erstelle Nachweis-Daten
          const attestationResponse = credential.response as AuthenticatorAttestationResponse;
          const credentialId = arrayBufferToBase64(credential.rawId);
          
          setSignatureData(signatureImage);
          setIsSigned(true);
          setIsEditing(false);
          setAuthMethod('biometric');
          
          // Speichere mit Biometrie-Nachweis
          onSave?.(signatureImage, signerName.trim(), 'biometric');
          
          console.log('Biometrische Authentifizierung erfolgreich', {
            credentialId,
            authenticatorData: arrayBufferToBase64(attestationResponse.getAuthenticatorData()),
          });
        }
      } catch (error) {
        console.error('Biometrische Authentifizierung fehlgeschlagen:', error);
        
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            alert('Biometrische Authentifizierung wurde abgebrochen oder verweigert.');
          } else if (error.name === 'SecurityError') {
            alert('Biometrische Authentifizierung ist auf dieser Seite nicht verfügbar (HTTPS erforderlich).');
          } else {
            alert(`Fehler bei der biometrischen Authentifizierung: ${error.message}`);
          }
        } else {
          alert('Ein unbekannter Fehler ist aufgetreten.');
        }
      } finally {
        setIsAuthenticating(false);
      }
    }, [signerName, onSave]);

    const handleEdit = () => {
      if (disabled) return;
      setIsEditing(true);
    };

    const formatDate = (date: Date | undefined) => {
      if (!date) return new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <TooltipProvider>
        <div className={`${className}`}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help print:hidden" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Gespeicherte Unterschrift anzeigen */}
          {isSigned && !isEditing && signatureData && (
            <div className={`relative border-2 rounded-lg p-4 ${
              authMethod === 'biometric' 
                ? 'border-teal-300 bg-teal-50' 
                : 'border-green-300 bg-green-50'
            }`}>
              <div className={`absolute top-2 right-2 flex items-center gap-1 ${
                authMethod === 'biometric' ? 'text-teal-600' : 'text-green-600'
              }`}>
                {authMethod === 'biometric' ? (
                  <>
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-medium">Biometrisch bestätigt</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-medium">Unterschrieben</span>
                  </>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                <img 
                  src={signatureData} 
                  alt="Unterschrift" 
                  className="max-h-24 object-contain"
                />
                <div className="mt-2 text-center">
                  <p className="font-medium text-gray-900">{signerName}</p>
                  <p className="text-xs text-gray-500">{formatDate(signedAt)}</p>
                </div>
              </div>
              
              {!disabled && (
                <button
                  onClick={handleEdit}
                  className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded print:hidden"
                  title="Unterschrift bearbeiten"
                >
                  <Pen className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Unterschrift-Eingabe */}
          {isEditing && !disabled && (
            <div className="space-y-3">
              {/* Name Eingabe */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Ihr Name (Pflichtfeld)
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f]"
                />
              </div>

              {/* Modus-Umschalter (wenn biometrisch verfügbar) */}
              {biometricAvailable && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg print:hidden">
                  <button
                    onClick={() => setSignatureMode('draw')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      signatureMode === 'draw'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Pen className="w-4 h-4" />
                    Zeichnen
                  </button>
                  <button
                    onClick={() => setSignatureMode('biometric')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      signatureMode === 'biometric'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    Touch ID / Fingerabdruck
                  </button>
                </div>
              )}

              {/* Zeichenmodus */}
              {signatureMode === 'draw' && (
                <>
                  {/* Signatur Canvas */}
                  <div className="relative">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                      <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                          className: 'w-full h-32 cursor-crosshair',
                          style: { width: '100%', height: '128px' },
                        }}
                        backgroundColor="white"
                        penColor="black"
                      />
                      
                      {/* Platzhalter-Text */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-300 text-sm">
                          Hier unterschreiben...
                        </p>
                      </div>
                    </div>
                    
                    {/* Linie für Unterschrift */}
                    <div className="absolute bottom-8 left-4 right-4 border-b border-gray-400 pointer-events-none" />
                  </div>
                  
                  {/* Aktions-Buttons */}
                  <div className="flex items-center justify-between gap-2 print:hidden">
                    <button
                      onClick={handleClear}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Eraser className="w-4 h-4" />
                      Löschen
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {isSigned && (
                        <button
                          onClick={() => setIsEditing(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Abbrechen
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Unterschrift speichern
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Biometrischer Modus */}
              {signatureMode === 'biometric' && biometricAvailable && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-teal-300 rounded-lg bg-teal-50 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
                      <Fingerprint className="w-8 h-8 text-teal-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Biometrische Bestätigung
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {biometricDescription}
                    </p>
                    
                    <button
                      onClick={handleBiometricAuth}
                      disabled={isAuthenticating || !signerName.trim()}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        isAuthenticating || !signerName.trim()
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#14ad9f] text-white hover:bg-teal-700'
                      }`}
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Authentifizierung läuft...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-5 h-5" />
                          Jetzt bestätigen
                        </>
                      )}
                    </button>
                    
                    {!signerName.trim() && (
                      <p className="text-xs text-amber-600 mt-2">
                        Bitte geben Sie zuerst Ihren Namen ein
                      </p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
                    <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-blue-800">
                      <p className="font-medium">Sichere Authentifizierung</p>
                      <p className="text-blue-600 text-xs mt-0.5">
                        Ihre biometrischen Daten verlassen niemals Ihr Gerät. 
                        Es wird nur eine kryptografische Bestätigung gespeichert.
                      </p>
                    </div>
                  </div>

                  {isSigned && (
                    <div className="flex justify-end print:hidden">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Abbrechen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Deaktivierter Zustand ohne Unterschrift */}
          {disabled && !isSigned && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
              <p className="text-gray-400 text-sm">Keine Unterschrift vorhanden</p>
            </div>
          )}

          {/* Print-Version */}
          {!isSigned && (
            <div className="hidden print:block">
              <div className="h-16 border-b-2 border-gray-400 mb-2"></div>
              <p className="text-xs text-gray-500">Name, Datum, Unterschrift</p>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
