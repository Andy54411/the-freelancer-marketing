/**
 * E2E Crypto Service - Ende-zu-Ende-Verschlüsselung für Taskilo Chat
 * ==================================================================
 * 
 * Implementiert asymmetrische Verschlüsselung mit ECDH (Elliptic Curve Diffie-Hellman)
 * und AES-GCM für die eigentliche Nachrichtenverschlüsselung.
 * 
 * Basiert auf Web Crypto API - läuft vollständig im Browser.
 * 
 * Architektur:
 * 1. Jeder Nutzer hat ein ECDH-Schlüsselpaar (Public + Private Key)
 * 2. Bei Konversation wird via ECDH ein gemeinsamer Schlüssel abgeleitet
 * 3. Nachrichten werden mit AES-GCM und dem gemeinsamen Schlüssel verschlüsselt
 * 4. Private Keys verlassen nie das Gerät
 */

// IndexedDB Database Name
const DB_NAME = 'taskilo-e2e-keys';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: string;  // Base64-encoded JWK
  privateKey: string; // Base64-encoded JWK (nur lokal gespeichert!)
}

export interface EncryptedMessage {
  ciphertext: string;    // Base64-encoded encrypted content
  iv: string;            // Base64-encoded initialization vector
  senderPublicKey: string; // Base64-encoded sender public key
}

/**
 * E2E Crypto Service Singleton
 */
class E2ECryptoService {
  private db: IDBDatabase | null = null;
  private keyPair: KeyPair | null = null;
  private derivedKeys: Map<string, CryptoKey> = new Map(); // Cache für abgeleitete Schlüssel

  /**
   * Initialisiert die IndexedDB für Schlüsselspeicherung
   */
  async init(): Promise<void> {
    if (this.db) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(new Error('IndexedDB konnte nicht geöffnet werden'));
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(KEYS_STORE)) {
          db.createObjectStore(KEYS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Generiert ein neues ECDH-Schlüsselpaar
   */
  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-384', // Starke elliptische Kurve
      },
      true, // extractable für Export
      ['deriveKey', 'deriveBits']
    );
    
    return keyPair;
  }

  /**
   * Exportiert einen Public Key als Base64-String
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('jwk', publicKey);
    return btoa(JSON.stringify(exported));
  }

  /**
   * Importiert einen Public Key aus Base64-String
   */
  async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    const jwk = JSON.parse(atob(publicKeyBase64));
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'ECDH',
        namedCurve: 'P-384',
      },
      true,
      []
    );
  }

  /**
   * Speichert das Schlüsselpaar lokal in IndexedDB
   */
  async saveKeyPair(email: string, keyPair: KeyPair): Promise<void> {
    await this.init();
    
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    
    const data = {
      id: email,
      publicKey: btoa(JSON.stringify(publicKeyJwk)),
      privateKey: btoa(JSON.stringify(privateKeyJwk)),
      createdAt: new Date().toISOString(),
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEYS_STORE], 'readwrite');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Schlüssel konnte nicht gespeichert werden'));
    });
  }

  /**
   * Lädt das Schlüsselpaar aus IndexedDB
   */
  async loadKeyPair(email: string): Promise<KeyPair | null> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEYS_STORE], 'readonly');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.get(email);
      
      request.onsuccess = async () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }
        
        try {
          const publicKeyJwk = JSON.parse(atob(data.publicKey));
          const privateKeyJwk = JSON.parse(atob(data.privateKey));
          
          const publicKey = await crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            { name: 'ECDH', namedCurve: 'P-384' },
            true,
            []
          );
          
          const privateKey = await crypto.subtle.importKey(
            'jwk',
            privateKeyJwk,
            { name: 'ECDH', namedCurve: 'P-384' },
            true,
            ['deriveKey', 'deriveBits']
          );
          
          resolve({ publicKey, privateKey });
        } catch (error) {
          reject(error);
        }
      };
      
      request.onerror = () => reject(new Error('Schlüssel konnte nicht geladen werden'));
    });
  }

  /**
   * Holt oder erstellt das Schlüsselpaar für den aktuellen Nutzer
   */
  async getOrCreateKeyPair(email: string): Promise<KeyPair> {
    if (this.keyPair) return this.keyPair;
    
    // Versuche existierendes Schlüsselpaar zu laden
    const existing = await this.loadKeyPair(email);
    if (existing) {
      this.keyPair = existing;
      return existing;
    }
    
    // Neues Schlüsselpaar generieren
    const newKeyPair = await this.generateKeyPair();
    await this.saveKeyPair(email, newKeyPair);
    this.keyPair = newKeyPair;
    
    return newKeyPair;
  }

  /**
   * Leitet einen gemeinsamen AES-Schlüssel aus zwei ECDH-Schlüsseln ab
   */
  async deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // nicht exportierbar
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Holt oder cached den abgeleiteten Schlüssel für einen Empfänger
   */
  async getSharedKey(myEmail: string, recipientPublicKeyBase64: string): Promise<CryptoKey> {
    // Cache prüfen
    const cacheKey = `${myEmail}:${recipientPublicKeyBase64.substring(0, 32)}`;
    if (this.derivedKeys.has(cacheKey)) {
      return this.derivedKeys.get(cacheKey)!;
    }
    
    // Mein Schlüsselpaar holen
    const myKeyPair = await this.getOrCreateKeyPair(myEmail);
    
    // Empfänger Public Key importieren
    const recipientPublicKey = await this.importPublicKey(recipientPublicKeyBase64);
    
    // Gemeinsamen Schlüssel ableiten
    const sharedKey = await this.deriveSharedKey(myKeyPair.privateKey, recipientPublicKey);
    
    // Cachen
    this.derivedKeys.set(cacheKey, sharedKey);
    
    return sharedKey;
  }

  /**
   * Verschlüsselt eine Nachricht für einen Empfänger
   */
  async encryptMessage(
    myEmail: string,
    recipientPublicKeyBase64: string,
    plaintext: string
  ): Promise<EncryptedMessage> {
    // Mein Public Key für die Nachricht
    const myKeyPair = await this.getOrCreateKeyPair(myEmail);
    const myPublicKeyBase64 = await this.exportPublicKey(myKeyPair.publicKey);
    
    // Gemeinsamen Schlüssel ableiten
    const sharedKey = await this.getSharedKey(myEmail, recipientPublicKeyBase64);
    
    // Zufälligen IV generieren
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Nachricht zu Bytes konvertieren
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Mit AES-GCM verschlüsseln
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      sharedKey,
      data
    );
    
    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.uint8ArrayToBase64(iv),
      senderPublicKey: myPublicKeyBase64,
    };
  }

  /**
   * Entschlüsselt eine empfangene Nachricht
   */
  async decryptMessage(
    myEmail: string,
    encryptedMessage: EncryptedMessage
  ): Promise<string> {
    // Gemeinsamen Schlüssel ableiten (mit Sender's Public Key)
    const sharedKey = await this.getSharedKey(myEmail, encryptedMessage.senderPublicKey);
    
    // Base64 zu ArrayBuffer
    const ciphertext = this.base64ToArrayBuffer(encryptedMessage.ciphertext);
    const iv = this.base64ToArrayBuffer(encryptedMessage.iv);
    
    // Entschlüsseln
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      sharedKey,
      ciphertext
    );
    
    // Bytes zu String
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Verschlüsselt eine Nachricht für einen Gruppen-Space
   * (Für Gruppenchats wird für jeden Empfänger separat verschlüsselt)
   */
  async encryptForSpace(
    myEmail: string,
    memberPublicKeys: { email: string; publicKey: string }[],
    plaintext: string
  ): Promise<{ [email: string]: EncryptedMessage }> {
    const encrypted: { [email: string]: EncryptedMessage } = {};
    
    for (const member of memberPublicKeys) {
      if (member.email === myEmail) continue; // Nicht für mich selbst verschlüsseln
      
      encrypted[member.email] = await this.encryptMessage(
        myEmail,
        member.publicKey,
        plaintext
      );
    }
    
    return encrypted;
  }

  /**
   * Hilfsfunktion: ArrayBuffer zu Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return this.uint8ArrayToBase64(bytes);
  }

  /**
   * Hilfsfunktion: Uint8Array zu Base64
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Hilfsfunktion: Base64 zu ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Löscht alle lokalen Schlüssel (z.B. beim Logout)
   */
  async clearKeys(): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEYS_STORE], 'readwrite');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.clear();
      
      request.onsuccess = () => {
        this.keyPair = null;
        this.derivedKeys.clear();
        resolve();
      };
      request.onerror = () => reject(new Error('Schlüssel konnten nicht gelöscht werden'));
    });
  }

  /**
   * Prüft ob E2E-Verschlüsselung verfügbar ist
   */
  isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof indexedDB !== 'undefined';
  }
}

// Singleton Export
export const e2eCrypto = new E2ECryptoService();
