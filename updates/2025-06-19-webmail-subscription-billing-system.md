# Webmail Subscription & Billing System

**Datum:** 19. Juni 2025  
**Kategorie:** Feature  
**Betrifft:** Admin Dashboard, Webmail, Rechnungswesen

## Zusammenfassung

Vollstaendiges Abonnement- und Rechnungssystem fuer Webmail/Domain-Dienste implementiert. Kunden erhalten automatisch monatliche Rechnungen per E-Mail.

## Neue Features

### 1. WebmailSubscriptionService
- Komplette Abonnementverwaltung (`webmailSubscriptions` Collection)
- Automatische Rechnungserstellung (`webmailInvoices` Collection)
- GoBD-konforme fortlaufende Rechnungsnummern (WM-2025-XXXX)
- Unterstuetzung fuer monatliche und jaehrliche Abrechnung

### 2. Admin Dashboard
- Neues Dashboard unter `/dashboard/admin/webmail-billing`
- Uebersicht aller Abonnements mit Status
- Alle Rechnungen mit Aktionen (Senden, Bezahlt markieren)
- Manueller Abrechnungs-Trigger

### 3. API Endpoints
- `GET /api/admin/webmail/subscriptions` - Alle Abos abrufen
- `POST /api/admin/webmail/subscriptions/[id]/cancel` - Abo kuendigen
- `GET /api/admin/webmail/invoices` - Alle Rechnungen
- `POST /api/admin/webmail/invoices/[id]/paid` - Als bezahlt markieren
- `POST /api/admin/webmail/invoices/[id]/send` - Rechnung per E-Mail senden
- `POST /api/admin/webmail/run-billing` - Manueller Billing-Lauf

### 4. Automatische Abrechnung
- Taeglicher Cron-Job um 06:00 Uhr (Vercel Cron)
- Prueft faellige Abonnements
- Erstellt automatisch neue Rechnungen
- Versendet Rechnungen per E-Mail

### 5. Integration mit OrderService
- Nach erfolgreicher Revolut-Zahlung wird automatisch ein Abo erstellt
- Erste Rechnung wird bei Abo-Erstellung generiert

## Preise
- Mailbox monatlich: 2,99 EUR netto (3,56 EUR brutto)
- Mailbox jaehrlich: 29,90 EUR netto (35,58 EUR brutto)
- 19% MwSt enthalten

## Technische Details

### Neue Dateien
- `/src/services/webmail/WebmailSubscriptionService.ts`
- `/src/app/dashboard/admin/webmail-billing/page.tsx`
- `/src/app/api/cron/webmail-billing/route.ts`
- `/src/app/api/admin/webmail/**/*.ts` (6 Endpoints)
- `/src/app/api/webmail/send-invoice-email/route.ts`

### Geaenderte Dateien
- `/src/services/order/OrderService.ts` - Subscription-Erstellung hinzugefuegt
- `/vercel.json` - Cron-Job konfiguriert

## Hinweise

- Der Cron-Job benoetigt die Umgebungsvariable `CRON_SECRET` in Vercel
- Admin-Zugang erforderlich fuer Dashboard-Zugriff
- E-Mail-Versand ueber AWS SES
