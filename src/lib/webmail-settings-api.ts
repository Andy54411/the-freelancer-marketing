/**
 * Hetzner Webmail Settings API Client
 * 
 * Kommuniziert mit dem Hetzner-Server für E-Mail-Einstellungen
 */

import { UserSettings, EmailSignature } from '@/components/webmail/settings/types';

const HETZNER_API_URL = process.env.NEXT_PUBLIC_WEBMAIL_API_URL || 'https://mail.taskilo.de/webmail-api';

interface ApiResponse<T = unknown> {
  success: boolean;
  settings?: T;
  signature?: EmailSignature;
  isNew?: boolean;
  message?: string;
  error?: string;
  details?: string;
}

/**
 * Einstellungen vom Hetzner-Server laden
 */
export async function getSettings(email: string): Promise<UserSettings | null> {
  try {
    const response = await fetch(`${HETZNER_API_URL}/api/settings/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: ApiResponse<UserSettings> = await response.json();

    if (!data.success || !data.settings) {
      throw new Error(data.error || 'Fehler beim Laden der Einstellungen');
    }

    return data.settings;
  } catch (error) {
    console.error('[SettingsAPI] Fehler beim Laden:', error);
    return null;
  }
}

/**
 * Einstellungen auf dem Hetzner-Server speichern
 */
export async function saveSettings(
  email: string,
  settings: Partial<UserSettings>
): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
  try {
    const response = await fetch(`${HETZNER_API_URL}/api/settings/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    const data: ApiResponse<UserSettings> = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || 'Fehler beim Speichern' };
    }

    return { success: true, settings: data.settings as UserSettings };
  } catch (error) {
    console.error('[SettingsAPI] Fehler beim Speichern:', error);
    return { success: false, error: 'Netzwerkfehler beim Speichern' };
  }
}

/**
 * Einstellungen auf Defaults zurücksetzen
 */
export async function resetSettings(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${HETZNER_API_URL}/api/settings/${encodeURIComponent(email)}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data: ApiResponse = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || 'Fehler beim Zurücksetzen' };
    }

    return { success: true };
  } catch (error) {
    console.error('[SettingsAPI] Fehler beim Zurücksetzen:', error);
    return { success: false, error: 'Netzwerkfehler beim Zurücksetzen' };
  }
}

// --- Signaturen-Endpoints ---

/**
 * Neue Signatur hinzufügen
 */
export async function addSignature(
  email: string,
  signature: Omit<EmailSignature, 'id'>
): Promise<{ success: boolean; signature?: EmailSignature; error?: string }> {
  try {
    const response = await fetch(`${HETZNER_API_URL}/api/settings/${encodeURIComponent(email)}/signatures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signature),
    });

    const data: ApiResponse = await response.json();

    if (!data.success || !data.signature) {
      return { success: false, error: data.error || 'Fehler beim Hinzufügen' };
    }

    return { success: true, signature: data.signature };
  } catch (error) {
    console.error('[SettingsAPI] Fehler beim Hinzufügen der Signatur:', error);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

/**
 * Signatur aktualisieren
 */
export async function updateSignature(
  email: string,
  signatureId: string,
  updates: Partial<EmailSignature>
): Promise<{ success: boolean; signature?: EmailSignature; error?: string }> {
  try {
    const response = await fetch(
      `${HETZNER_API_URL}/api/settings/${encodeURIComponent(email)}/signatures/${encodeURIComponent(signatureId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );

    const data: ApiResponse = await response.json();

    if (!data.success || !data.signature) {
      return { success: false, error: data.error || 'Fehler beim Aktualisieren' };
    }

    return { success: true, signature: data.signature };
  } catch (error) {
    console.error('[SettingsAPI] Fehler beim Aktualisieren der Signatur:', error);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

/**
 * Signatur löschen
 */
export async function deleteSignature(
  email: string,
  signatureId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${HETZNER_API_URL}/api/settings/${encodeURIComponent(email)}/signatures/${encodeURIComponent(signatureId)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data: ApiResponse = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || 'Fehler beim Löschen' };
    }

    return { success: true };
  } catch (error) {
    console.error('[SettingsAPI] Fehler beim Löschen der Signatur:', error);
    return { success: false, error: 'Netzwerkfehler' };
  }
}
