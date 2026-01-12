# Buchhaltungsmodul - Dokumentation

## Übersicht
Das Buchhaltungsmodul (`/dashboard/company/[uid]/finance/`) bietet eine vollständige GoBD-konforme Finanzverwaltung für Unternehmen.

## Seitenstruktur

### Hauptbereiche

| Route | Beschreibung | Status |
|-------|-------------|--------|
| `/finance/quotes` | Angebotsverwaltung | ✅ Vorhanden |
| `/finance/quotes/create` | Neues Angebot erstellen | ✅ Vorhanden |
| `/finance/quotes/[quoteId]` | Angebot ansehen/bearbeiten | ✅ Vorhanden |
| `/finance/quotes/drafts` | Angebots-Entwürfe | ✅ Vorhanden |
| `/finance/quotes/sent` | Gesendete Angebote | ✅ Vorhanden |
| `/finance/quotes/accepted` | Angenommene Angebote | ✅ Vorhanden |
| `/finance/order-confirmations` | Auftragsbestätigungen | ✅ **NEU ERSTELLT** |
| `/finance/invoices` | Rechnungsverwaltung | ✅ Vorhanden |
| `/finance/invoices/create` | Neue Rechnung erstellen | ✅ Vorhanden |
| `/finance/invoices/[invoiceId]` | Rechnung ansehen/bearbeiten | ✅ Vorhanden |
| `/finance/invoices/recurring` | Wiederkehrende Rechnungen | ✅ Vorhanden |
| `/finance/invoices/recurring/create` | Neue wiederkehrende Rechnung | ✅ Vorhanden |
| `/finance/delivery-notes` | Lieferscheine | ✅ Vorhanden |
| `/finance/reminders` | Mahnungen | ✅ Vorhanden |
| `/finance/reminders/create` | Neue Mahnung erstellen | ✅ Vorhanden |
| `/finance/credits` | Gutschriften | ✅ Vorhanden |
| `/finance/expenses` | Ausgabenverwaltung | ✅ Vorhanden |
| `/finance/expenses/create` | Neue Ausgabe erfassen | ✅ Vorhanden |
| `/finance/expenses/[expenseId]` | Ausgabe ansehen/bearbeiten | ✅ Vorhanden |
| `/finance/expenses/recurring` | Wiederkehrende Ausgaben | ✅ **NEU ERSTELLT** |
| `/finance/expenses/assets` | Anlagevermögen (AfA) | ✅ **NEU ERSTELLT** |
| `/finance/taxes` | Steuerverwaltung | ✅ Vorhanden |
| `/finance/reports` | Finanzberichte | ✅ Vorhanden |
| `/finance/accounting` | Buchhaltungsübersicht | ✅ Vorhanden |
| `/finance/cashbook` | Kassenbuch | ✅ Vorhanden |
| `/finance/einvoices` | E-Rechnungen (XRechnung/ZUGFeRD) | ✅ Vorhanden |
| `/finance/payments` | Zahlungsverwaltung | ✅ Vorhanden |

### DATEV-Integration

| Route | Beschreibung | Status |
|-------|-------------|--------|
| `/datev` | DATEV-Übersicht | ✅ Vorhanden |
| `/datev/debug` | DATEV-Debug | ✅ Vorhanden |
| `/datev/export` | DATEV-Export | ✅ Vorhanden |
| `/datev/overview` | DATEV-Übersicht | ✅ Vorhanden |
| `/datev/setup` | DATEV-Setup | ✅ Vorhanden |

---

## Neu erstellte Seiten

### 1. Auftragsbestätigungen (`/finance/order-confirmations`)

**Datei:** `src/app/dashboard/company/[uid]/finance/order-confirmations/page.tsx`

**Funktionen:**
- Übersichtsliste aller Auftragsbestätigungen
- Status-Anzeige (Entwurf, Gesendet, Bestätigt, Storniert)
- Statistik-Karten (Gesamt, Bestätigt, Ausstehend, Gesamtwert)
- Suche nach Nummer, Kunde oder Angebotsnummer
- Filter nach Status
- Sortierung nach Datum
- Dropdown-Aktionen (Ansehen, Bearbeiten, PDF, E-Mail)

**Firestore Collection:** `companies/{companyId}/orderConfirmations`

**Datenstruktur:**
```typescript
interface OrderConfirmation {
  id: string;
  confirmationNumber: string;
  quoteId?: string;
  quoteNumber?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  date: Date;
  validUntil?: Date;
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

---

### 2. Wiederkehrende Ausgaben (`/finance/expenses/recurring`)

**Datei:** `src/app/dashboard/company/[uid]/finance/expenses/recurring/page.tsx`

**Funktionen:**
- Verwaltung regelmäßiger Kosten (Miete, Abonnements, Versicherungen)
- Intervalle: Täglich, Wöchentlich, Monatlich, Vierteljährlich, Jährlich
- Automatische Berechnung des nächsten Fälligkeitsdatums
- Status: Aktiv, Pausiert, Beendet
- Statistik-Karten (Aktive Ausgaben, Monatliche Kosten, Jährliche Schätzung)
- Kategorien: Miete, Versicherungen, Software, Telekommunikation, Leasing, etc.
- Inline-Erstellung und Bearbeitung via Dialog
- Pausieren/Aktivieren/Beenden von Ausgaben

**Firestore Collection:** `companies/{companyId}/recurringExpenses`

**Datenstruktur:**
```typescript
interface RecurringExpense {
  id: string;
  name: string;
  description?: string;
  amount: number;
  vatRate: number;
  category: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  nextDueDate: Date;
  lastExecuted?: Date;
  status: 'active' | 'paused' | 'cancelled';
  supplier?: string;
  accountingCategory?: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

---

### 3. Anlagevermögen/AfA (`/finance/expenses/assets`)

**Datei:** `src/app/dashboard/company/[uid]/finance/expenses/assets/page.tsx`

**Funktionen:**
- Verwaltung von Anlagevermögen gemäß §7 EStG
- Abschreibungsmethoden: Linear (AfA), Degressiv (20%), Keine
- Automatische Buchwertberechnung basierend auf Nutzungsdauer
- Kategorien: Gebäude, Fahrzeuge, IT & EDV, Büroausstattung, Maschinen, Sonstiges
- Nutzungsdauern gemäß AfA-Tabelle (1-50 Jahre)
- Restwert-Berechnung
- Statistik-Karten (Aktive Anlagen, Anschaffungswert, Buchwert, Abschreibungen)
- Verkaufen oder Ausscheiden von Anlagen
- Seriennummer, Standort, Lieferant, Rechnungsnummer erfassbar

**Firestore Collection:** `companies/{companyId}/fixedAssets` (existierte bereits)

**Datenstruktur:**
```typescript
interface Asset {
  id: string;
  name: string;
  description?: string;
  category: string;
  acquisitionDate: Date;
  acquisitionCost: number;
  currentValue: number;
  depreciationMethod: 'linear' | 'degressive' | 'none';
  usefulLifeYears: number;
  residualValue: number;
  serialNumber?: string;
  location?: string;
  supplier?: string;
  invoiceNumber?: string;
  status: 'active' | 'disposed' | 'sold';
  disposalDate?: Date;
  disposalValue?: number;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

---

## Firestore-Regeln

Folgende Regeln wurden in `firestore.rules` hinzugefügt:

### orderConfirmations
```javascript
match /companies/{companyId}/orderConfirmations/{confirmationId} {
  allow read: if (request.auth.uid == companyId && isCompany()) ||
                 isEmployeeOf(companyId) || isSupportStaff();
  allow list: if (request.auth.uid == companyId && isCompany()) ||
                 isEmployeeOf(companyId) || isSupportStaff();
  allow create: if (request.auth.uid == companyId && isCompany()) ||
                   isEmployeeOf(companyId);
  allow update: if (request.auth.uid == companyId && isCompany()) ||
                   isEmployeeOf(companyId);
  allow delete: if isSupportStaff(); // GoBD-Konformität
}
```

### recurringExpenses
```javascript
match /companies/{companyId}/recurringExpenses/{expenseId} {
  allow read: if (request.auth.uid == companyId && isCompany()) ||
                 isEmployeeOf(companyId) || isSupportStaff();
  allow list: if (request.auth.uid == companyId && isCompany()) ||
                 isEmployeeOf(companyId) || isSupportStaff();
  allow create: if (request.auth.uid == companyId && isCompany()) ||
                   isEmployeeOf(companyId);
  allow update: if (request.auth.uid == companyId && isCompany()) ||
                   isEmployeeOf(companyId);
  allow delete: if (request.auth.uid == companyId && isCompany()) ||
                   isEmployeeOf(companyId) || isSupportStaff();
}
```

### fixedAssets (bereits vorhanden)
Collection für Anlagevermögen existierte bereits mit korrekten Berechtigungen.

---

## UI/UX Standards

Alle Seiten folgen den Taskilo Design-Richtlinien:
- **Primary Color:** `#14ad9f` (Teal)
- **Cards:** `bg-white rounded-2xl border border-gray-200 shadow-sm`
- **Buttons:** `bg-[#14ad9f] hover:bg-teal-700 text-white`
- **Icons:** Lucide React
- **Statistik-Karten:** 4-spaltige Grid mit Icon-Badges
- **Tabellen:** shadcn/ui Table-Komponenten
- **Dialoge:** shadcn/ui Dialog für Erstellen/Bearbeiten
- **Toast-Benachrichtigungen:** Sonner

---

## Technische Details

### Imports (Standard-Pattern)
```typescript
import { db } from '@/firebase/clients';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
```

### Berechtigungsprüfung
```typescript
const isOwner = user?.uid === uid;
const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

if (!user || (!isOwner && !isEmployee)) {
  return <NoPermission />;
}
```

### Datum-Formatierung
```typescript
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const formatDate = (date: Date) => format(date, 'dd.MM.yyyy', { locale: de });
```

### Währungs-Formatierung
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};
```

---

## Nächste Schritte (TODO)

1. [ ] Create-Seite für Auftragsbestätigungen (`/finance/order-confirmations/create`)
2. [ ] Detail-Seite für Auftragsbestätigungen (`/finance/order-confirmations/[id]`)
3. [ ] Edit-Seite für Auftragsbestätigungen (`/finance/order-confirmations/[id]/edit`)
4. [ ] PDF-Generierung für Auftragsbestätigungen
5. [ ] E-Mail-Versand für Auftragsbestätigungen
6. [ ] Automatische Buchung von wiederkehrenden Ausgaben (Cron-Job)
7. [ ] AfA-Jahresabschluss-Bericht
8. [ ] Export für Steuerberater (DATEV-Integration)

---

## Änderungshistorie

| Datum | Änderung |
|-------|----------|
| 2025-01-XX | Initiale Erstellung der 3 fehlenden Seiten |
| 2025-01-XX | Firestore-Regeln für orderConfirmations und recurringExpenses hinzugefügt |
| 2025-01-XX | Assets-Seite auf fixedAssets Collection umgestellt |
