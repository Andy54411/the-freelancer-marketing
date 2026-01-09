// Hilfsfunktionen für WhatsApp-Komponenten

/**
 * Konvertiert verschiedene Timestamp-Formate zu Date
 */
export function parseTimestamp(timestamp: unknown): Date | null {
  if (!timestamp) return null;

  // Firestore Timestamp (mit toDate Methode)
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
  ) {
    return (timestamp as { toDate: () => Date }).toDate();
  }

  // Firestore Timestamp (mit seconds/nanoseconds)
  if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
    return new Date((timestamp as { seconds: number }).seconds * 1000);
  }

  // Date-Objekt
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // String oder Number
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Formatiert Zeit für Nachrichten (HH:MM)
 */
export function formatMessageTime(timestamp: unknown): string {
  const date = parseTimestamp(timestamp);
  if (!date) return '';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formatiert Datum für Chat-Trenner
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Formatiert relative Zeit (z.B. "Vor 5 Minuten")
 */
export function getTimeAgo(date?: string | Date | { seconds: number; nanoseconds?: number }): string {
  if (!date) return '';
  const now = new Date();
  let then: Date;

  if (date instanceof Date) {
    then = date;
  } else if (typeof date === 'object' && 'seconds' in date) {
    then = new Date(date.seconds * 1000);
  } else {
    then = new Date(date);
  }

  if (isNaN(then.getTime())) return '';

  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Jetzt';
  if (diffMins < 60) return `${diffMins} Min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} Std`;
  return then.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/**
 * Formatiert Telefonnummer für Anzeige
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('49')) {
    return `+49 ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  return phone.startsWith('+') ? phone : `+${phone}`;
}

/**
 * Formatiert Chat-Dauer
 */
export function getChatDuration(startTime: Date | null): string {
  if (!startTime) return '00:00';
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} min`;
}
