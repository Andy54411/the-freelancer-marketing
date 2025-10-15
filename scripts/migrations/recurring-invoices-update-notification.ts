/**
 * Migration: Update-Notification für Wiederkehrende Rechnungen Feature
 * 
 * Erstellt einen Update-Eintrag im System für das neu implementierte Feature
 * der automatischen wiederkehrenden Rechnungen.
 * 
 * Ausführung:
 * 1. Über Admin-Dashboard: /dashboard/admin/updates
 * 2. Oder direkt via API: POST /api/admin/updates
 */

import { CreateUpdateRequest } from '@/types/updates';

export const recurringInvoicesUpdateNotification: CreateUpdateRequest = {
  version: '2.5.0',
  title: 'Wiederkehrende Rechnungen mit automatischer Generierung',
  description: `
    <h2>Neue Funktion: Wiederkehrende Rechnungen (Abo-Rechnungen)</h2>
    
    <p>Ab sofort können Sie wiederkehrende Rechnungen für regelmäßige Leistungen wie Monatsabos, Wartungsverträge oder wiederkehrende Dienstleistungen automatisch erstellen lassen.</p>
    
    <h3>Hauptfunktionen:</h3>
    <ul>
      <li><strong>Automatische Generierung:</strong> Rechnungen werden täglich um 2:00 Uhr morgens automatisch erstellt</li>
      <li><strong>Flexible Intervalle:</strong> Wöchentlich, monatlich, vierteljährlich oder jährlich</li>
      <li><strong>Auto-Versand:</strong> Optional können Rechnungen automatisch per E-Mail an Kunden versendet werden</li>
      <li><strong>Status-Verwaltung:</strong> Vorlagen können jederzeit pausiert, fortgesetzt oder beendet werden</li>
      <li><strong>GoBD-Konform:</strong> Vollständige Compliance mit deutschen Steuervorschriften</li>
    </ul>
    
    <h3>So funktioniert's:</h3>
    <ol>
      <li>Navigieren Sie zu <strong>Finanzen → Rechnungen → Wiederkehrende Rechnungen</strong></li>
      <li>Klicken Sie auf <strong>"Abo-Rechnung erstellen"</strong></li>
      <li>Füllen Sie das Formular aus (Kunde, Intervall, Startdatum, Positionen)</li>
      <li>Aktivieren Sie optional den Auto-Versand per E-Mail</li>
      <li>Das System generiert nun automatisch Rechnungen zum festgelegten Termin</li>
    </ol>
    
    <h3>Technische Details:</h3>
    <ul>
      <li>Tägliche Scheduled Cloud Function (2:00 Uhr Europe/Berlin)</li>
      <li>Subcollection Pattern: <code>companies/{companyId}/recurringInvoices</code></li>
      <li>Vollständige TypeScript-Typsicherheit</li>
      <li>Zod-Validierung für alle Eingaben</li>
      <li>Service Layer für Frontend und Backend</li>
    </ul>
    
    <h3>Anwendungsfälle:</h3>
    <ul>
      <li>Monatsabos für Software oder Services</li>
      <li>Wartungsverträge mit regelmäßiger Abrechnung</li>
      <li>Mieten und Leasinggebühren</li>
      <li>Regelmäßige Beratungsleistungen</li>
      <li>Mitgliedsbeiträge</li>
    </ul>
    
    <blockquote>
      <strong>Hinweis:</strong> Die erste automatische Ausführung erfolgt in der Nacht nach Erstellung der Vorlage. 
      Sie können den Status jederzeit in der Übersicht einsehen und verwalten.
    </blockquote>
  `,
  category: 'feature',
  isBreaking: false,
  tags: [
    'Rechnungen',
    'Automatisierung',
    'Finanzen',
    'Abo-Management',
    'Scheduled Functions',
    'GoBD-Konform'
  ],
  screenshots: [
    '/assets/updates/recurring-invoices-overview.png',
    '/assets/updates/recurring-invoices-create.png',
  ],
  documentationUrl: '/docs/RECURRING_INVOICES_DOCUMENTATION.md',
};

/**
 * Verwendung:
 * 
 * ```typescript
 * import { recurringInvoicesUpdateNotification } from './path/to/this/file';
 * 
 * // Via API
 * await fetch('/api/admin/updates', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(recurringInvoicesUpdateNotification)
 * });
 * ```
 */
