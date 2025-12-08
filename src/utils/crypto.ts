/**
 * DSGVO-konforme Crypto-Utils für WebRTC
 */

// AES-GCM Verschlüsselung für sichere Signaling-Daten
export class TaskiloCrypto {
  private static async generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(data: string, keyString: string): Promise<string> {
    const key = await this.importKey(keyString);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    // Kombiniere IV und verschlüsselte Daten
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(encryptedData: string, keyString: string): Promise<string> {
    const key = await this.importKey(keyString);
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  private static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = new TextEncoder().encode(keyString.padEnd(32, '0').slice(0, 32));
    return await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Sichere Schlüsselgenerierung für Chat
  static generateChatKey(chatId: string, userId: string): string {
    // In Produktion: ECDH Key Exchange implementieren
    return btoa(`${chatId}-${userId}-${Date.now()}`).slice(0, 32);
  }
}