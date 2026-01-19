'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { e2eCrypto, EncryptedMessage, registerPublicKey, getPublicKey, getPublicKeys } from '@/lib/crypto';

interface UseE2EEncryptionOptions {
  email: string;
  enabled?: boolean;
}

interface UseE2EEncryptionReturn {
  isReady: boolean;
  isSupported: boolean;
  myPublicKey: string | null;
  error: string | null;
  encrypt: (recipientPublicKey: string, plaintext: string) => Promise<EncryptedMessage | null>;
  decrypt: (message: EncryptedMessage) => Promise<string | null>;
  encryptForSpace: (memberEmails: string[], plaintext: string) => Promise<{ [email: string]: EncryptedMessage } | null>;
  getRecipientKey: (email: string) => Promise<string | null>;
  getMultipleKeys: (emails: string[]) => Promise<Map<string, string>>;
}

/**
 * React Hook für E2E-Verschlüsselung
 * 
 * Initialisiert die Kryptographie-Bibliothek und bietet
 * einfache Methoden zum Ver- und Entschlüsseln.
 * 
 * @example
 * const { isReady, encrypt, decrypt } = useE2EEncryption({ email: userEmail });
 * 
 * // Nachricht verschlüsseln
 * const encrypted = await encrypt(recipientPublicKey, 'Hallo!');
 * 
 * // Nachricht entschlüsseln
 * const plaintext = await decrypt(encryptedMessage);
 */
export function useE2EEncryption({ 
  email, 
  enabled = true,
}: UseE2EEncryptionOptions): UseE2EEncryptionReturn {
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [myPublicKey, setMyPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const initAttemptedRef = useRef(false);
  const publicKeyCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!enabled || !email || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const initialize = async () => {
      try {
        // Prüfe ob E2E-Verschlüsselung unterstützt wird
        if (!e2eCrypto.isSupported()) {
          setIsSupported(false);
          setError('E2E-Verschlüsselung wird in diesem Browser nicht unterstützt');
          return;
        }
        setIsSupported(true);

        // Initialisiere E2E-Crypto und hole/erstelle Schlüsselpaar
        await e2eCrypto.init();
        const keyPair = await e2eCrypto.getOrCreateKeyPair(email);
        const publicKeyBase64 = await e2eCrypto.exportPublicKey(keyPair.publicKey);
        
        // Registriere öffentlichen Schlüssel auf dem Server
        try {
          await registerPublicKey(email, publicKeyBase64);
        } catch (regError) {
          // Nicht kritisch - kann später registriert werden
          console.warn('E2E: Öffentlicher Schlüssel konnte nicht registriert werden:', regError);
        }

        setMyPublicKey(publicKeyBase64);
        setIsReady(true);
      } catch (initError) {
        const msg = initError instanceof Error ? initError.message : 'Unbekannter Fehler';
        setError(`E2E-Initialisierung fehlgeschlagen: ${msg}`);
      }
    };

    initialize();
  }, [email, enabled]);

  const encrypt = useCallback(async (
    recipientPublicKey: string, 
    plaintext: string,
  ): Promise<EncryptedMessage | null> => {
    if (!isReady || !email) return null;
    
    try {
      return await e2eCrypto.encryptMessage(email, recipientPublicKey, plaintext);
    } catch (encryptError) {
      const msg = encryptError instanceof Error ? encryptError.message : 'Verschlüsselung fehlgeschlagen';
      setError(msg);
      return null;
    }
  }, [isReady, email]);

  const decrypt = useCallback(async (
    message: EncryptedMessage,
  ): Promise<string | null> => {
    if (!isReady || !email) return null;
    
    try {
      return await e2eCrypto.decryptMessage(email, message);
    } catch (decryptError) {
      const msg = decryptError instanceof Error ? decryptError.message : 'Entschlüsselung fehlgeschlagen';
      setError(msg);
      return null;
    }
  }, [isReady, email]);

  const getRecipientKey = useCallback(async (
    recipientEmail: string,
  ): Promise<string | null> => {
    // Prüfe Cache
    if (publicKeyCache.current.has(recipientEmail)) {
      return publicKeyCache.current.get(recipientEmail) || null;
    }
    
    try {
      const key = await getPublicKey(recipientEmail);
      if (key) {
        publicKeyCache.current.set(recipientEmail, key);
      }
      return key;
    } catch (fetchError) {
      return null;
    }
  }, []);

  const getMultipleKeys = useCallback(async (
    emails: string[],
  ): Promise<Map<string, string>> => {
    // Prüfe welche Keys noch fehlen
    const missingEmails = emails.filter(e => !publicKeyCache.current.has(e));
    
    if (missingEmails.length > 0) {
      try {
        const fetchedKeys = await getPublicKeys(missingEmails);
        fetchedKeys.forEach((key, e) => {
          publicKeyCache.current.set(e, key);
        });
      } catch (fetchError) {
        // Nicht kritisch, leerer Return für fehlende Keys
      }
    }
    
    // Alle verfügbaren Keys zurückgeben
    const result = new Map<string, string>();
    for (const e of emails) {
      const key = publicKeyCache.current.get(e);
      if (key) {
        result.set(e, key);
      }
    }
    return result;
  }, []);

  const encryptForSpace = useCallback(async (
    memberEmails: string[],
    plaintext: string,
  ): Promise<{ [email: string]: EncryptedMessage } | null> => {
    if (!isReady || !email) return null;
    
    try {
      // Hole alle Public Keys der Mitglieder
      const keys = await getMultipleKeys(memberEmails);
      
      // Konvertiere zu Array-Format für e2eCrypto
      const memberPublicKeys = Array.from(keys.entries()).map(([memberEmail, publicKey]) => ({
        email: memberEmail,
        publicKey,
      }));
      
      return await e2eCrypto.encryptForSpace(email, memberPublicKeys, plaintext);
    } catch (encryptError) {
      const msg = encryptError instanceof Error ? encryptError.message : 'Gruppen-Verschlüsselung fehlgeschlagen';
      setError(msg);
      return null;
    }
  }, [isReady, email, getMultipleKeys]);

  return {
    isReady,
    isSupported,
    myPublicKey,
    error,
    encrypt,
    decrypt,
    encryptForSpace,
    getRecipientKey,
    getMultipleKeys,
  };
}
