# Webmail Subscription & Billing System

**Datum:** 19. Juni 2025  
**Kategorie:** Feature  
**Betrifft:** Admin Dashboard, Webmail, Rechnungswesen

## Zusammenfassung

Vollständiges Abonnement- und Rechnungssystem für Webmail/Domain-Dienste implementiert. Kunden erhalten automatisch monatliche Rechnungen per E-Mail.

## Neue Features

### 1. WebmailSubscriptionService
- Komplette Abonnementverwaltung (`webmailSubscriptions` Collection)
- Automatische Rechnungserstellung (`webmailInvoices` Collection)
- GoBD-konforme fortlaufende Rechnungsnummern (WM-2025-XXXX)
- Unterstützung für monatliche und jährliche Abrechnung

### 2. Admin Dashboard
- Neues Dashboard unter `/dashboard/admin/webmail-billing`
- Übersicht aller Abonnements mit Status
- Alle Rechnungen mit Aktionen (Senden, Bezahlt markieren)
- Manueller Abrechnungs-Trigger

### 3. API Endpoints
- `GET /api/admin/webmail/subscriptions` - Alle Abos abrufen
- `POST /api/admin/webmail/subscriptions/[id]/cancel` - Abo kündigen
- `GET /api/admin/webmail/invoices` - Alle Rechnungen
- `POST /api/admin/webmail/invoices/[id]/paid` - Als bezahlt markieren
- `POST /api/admin/webmail/invoices/[id]/send` - Rechnung per E-Mail senden
- `POST /api/admin/webmail/run-billing` - Manueller Billing-Lauf

### 4. Automatische Abrechnung
- Täglicher Cron-Job um 06:00 Uhr (Vercel Cron)
- Prüft fällige Abonnements
- Erstellt automatisch neue Rechnungen
- Versendet Rechnungen per E-Mail

### 5. Integration mit OrderService
- Nach erfolgreicher Revolut-Zahlung wird automatisch ein Abo erstellt
- Erste Rechnung wird bei Abo-Erstellung generiert

## Preise
- Mailbox monatlich: 2,99 EUR netto (3,56 EUR brutto)
- Mailbox jährlich: 29,90 EUR netto (35,58 EUR brutto)
- 19% MwSt enthalten

## Technische Details

### Neue Dateien
- `/src/services/webmail/WebmailSubscriptionService.ts`
- `/src/app/dashboard/admin/webmail-billing/page.tsx`
- `/src/app/api/cron/webmail-billing/route.ts`
- `/src/app/api/admin/webmail/**/*.ts` (6 Endpoints)
- `/src/app/api/webmail/send-invoice-email/route.ts`

### Geänderte Dateien
- `/src/services/order/OrderService.ts` - Subscription-Erstellung hinzugefügt
- `/vercel.json` - Cron-Job konfiguriert

## Hinweise

- Der Cron-Job benötigt die Umgebungsvariable `CRON_SECRET` in Vercel
- Admin-Zugang erforderlich für Dashboard-Zugriff
- E-Mail-Versand über AWS SES
