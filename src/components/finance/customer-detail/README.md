# Customer Detail Modal Components

Diese vollständig modulare Tab-basierte Komponentenstruktur ersetzt das ursprünglich monolithische `CustomerDetailModal` und bietet eine professionelle Kundenverwaltung.

## 🏗️ Komponenten-Übersicht

### `CustomerDetailModal.tsx`
Hauptkomponente mit Tab-Navigation und orchestriert alle Sub-Komponenten.

**Features:**
- 7 verschiedene Tabs (Übersicht, Rechnungen, Kontakte, Verlauf, Dokumente, Aufträge, Gutschriften)
- Responsive Tab-Navigation mit Badges für Anzahl-Anzeigen
- Taskilo Design System Compliance (`#14ad9f`)
- State Management für aktiven Tab

**Props:**
- `customer`: Customer-Objekt oder null
- `isOpen`: Boolean für Modal-Zustand
- `onClose`: Callback zum Schließen
- `invoices`: Array von InvoiceData (optional)
- `loading`: Loading-Zustand für Rechnungen (optional)
- `calculatedStats`: Berechnete Statistiken (optional)
- `onEditContact`: Callback für Kontakt-Bearbeitung (optional)

### `CustomerInfoCard.tsx`
**Tab: Übersicht** - Zeigt Unternehmensdaten des Kunden:
- Kontaktinformationen (E-Mail, Telefon, Adresse)
- Steuerinformationen (Steuernummer, USt-IdNr.)
- Statistiken (Gesamtumsatz, Anzahl Rechnungen)
- Kunde-seit-Datum

### `CustomerInvoiceCard.tsx`  
**Tab: Rechnungen** - Professionelle Rechnungsverwaltung:
- Loading-Zustand während Datenabruf
- Liste aller Rechnungen mit Status-Badges
- Unterscheidung zwischen normalen Rechnungen und Ausgaben
- Sortierung und Filterung
- Leerer Zustand mit Call-to-Action

### `CustomerContactCard.tsx`
**Tab: Kontakte** - Ansprechpartner-Management:
- Hauptansprechpartner (mit Stern markiert)
- Weitere Ansprechpartner mit vollständigen Kontaktdaten
- Buttons zum Hinzufügen/Bearbeiten von Kontakten
- Übersichtliche Kartenansicht

### `CustomerHistoryTab.tsx`
**Tab: Verlauf** - Aktivitäts-Timeline:
- Professionelle Timeline mit verschiedenen Aktivitätstypen
- Statistik-Karten (Anrufe, E-Mails, Termine, Dokumente)
- Farbkodierte Aktivitäts-Icons
- Benutzer-Attribution und Zeitstempel
- Interaktive Buttons für neue Aktivitäten

### `CustomerDocumentsTab.tsx`
**Tab: Dokumente** - Dokumentenverwaltung:
- Drag & Drop Upload-Bereich
- Kategorisierte Dokumentenliste (Verträge, Rechnungen, Zertifikate)
- Suchfunktion und Filter
- Datei-Vorschau und Download-Funktionen
- Dokumenten-Metadaten (Größe, Upload-Datum, Benutzer)

### `CustomerOrdersTab.tsx`
**Tab: Aufträge** - Auftragsverwaltung:
- Statistik-Dashboard (Gesamtaufträge, Wert, Status-Verteilung)
- Detaillierte Auftragsansicht mit Positionen
- Status-Management (Entwurf → Bestätigt → In Bearbeitung → Geliefert)
- Such- und Filterfunktionen
- Auftragserstellung und -bearbeitung

## 🎯 Tab-Navigation

Die Modal-Komponente bietet 7 spezialisierte Tabs:

1. **📊 Übersicht** - Kundendaten und Schnellaktionen
2. **🧾 Rechnungen** - Rechnungshistorie und -verwaltung  
3. **👥 Kontakte** - Ansprechpartner-Management
4. **📝 Verlauf** - Aktivitäts-Timeline mit Statistiken
5. **📁 Dokumente** - Dokumenten-Upload und -verwaltung
6. **📦 Aufträge** - Vollständige Auftragsverwaltung
7. **💳 Gutschriften** - Gutschriften-Verwaltung (Placeholder)

## 💻 Verwendung

```tsx
import { CustomerDetailModal } from './customer-detail/CustomerDetailModal';

// Oder verwende individuelle Tab-Komponenten
import { 
  CustomerInfoCard, 
  CustomerInvoiceCard, 
  CustomerContactCard,
  CustomerHistoryTab,
  CustomerDocumentsTab,
  CustomerOrdersTab 
} from './customer-detail';

// Vollständiges Modal mit allen Tabs
<CustomerDetailModal
  customer={selectedCustomer}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  invoices={customerInvoices}
  loading={isLoadingInvoices}
  calculatedStats={{ totalAmount: 1250.50, totalInvoices: 5 }}
  onEditContact={handleEditContact}
/>

// Einzelne Tab-Komponenten in eigenen Kontexten
<CustomerHistoryTab customer={customer} />
<CustomerDocumentsTab customer={customer} />
<CustomerOrdersTab customer={customer} />
```

## 🎨 Design System Compliance

Alle Komponenten folgen strikt dem Taskilo Design System:
- **Primary Color**: `#14ad9f` (Taskilo Teal) - konsequent für alle Buttons und Aktionen
- **Card Structure**: shadcn/ui Card-Komponenten mit einheitlichem Padding
- **Icons**: Lucide React Icons mit semantischer Bedeutung
- **Tab Navigation**: Professionelle Tab-Leiste mit Hover-Effekten und Badge-Anzeigen
- **Responsive Design**: Mobile-optimierte Layouts
- **Typography**: Deutsche Beschriftungen und einheitliche Font-Hierarchie

## ✨ Erweiterte Features

### Interaktivität
- **Tab-State Management**: Persistente Tab-Auswahl während Session
- **Real-time Updates**: Live-Aktualisierung von Zählern und Statistiken
- **Search & Filter**: Erweiterte Such- und Filterfunktionen in allen Listen
- **Drag & Drop**: Datei-Upload mit modernem Interface

### Business Logic
- **Status Management**: Intelligente Status-Verfolgung für Aufträge und Dokumente
- **Automatische Berechnungen**: Live-Berechnung von Summen und Statistiken
- **Activity Tracking**: Automatische Protokollierung von Benutzeraktivitäten
- **Document Categorization**: Intelligente Kategorisierung von Dokumenten

### Performance Optimierung
- **Lazy Loading**: On-demand Laden von Tab-Inhalten
- **Memoization**: React.memo für optimierte Re-Renders
- **Virtual Scrolling**: Performance-optimierte Listen für große Datenmengen
- **Caching**: Intelligentes Caching von API-Responses

## 🚀 Vorteile der Tab-basierten Architektur

1. **🎯 Fokussierte Workflows**: Jeder Tab ist auf spezifische Aufgaben optimiert
2. **📱 Mobile Optimiert**: Responsive Tab-Navigation für alle Gerätegrößen
3. **⚡ Performance**: Nur aktive Tabs werden gerendert
4. **🔍 Übersichtlichkeit**: Reduzierte Informationsdichte pro Ansicht
5. **🎛️ Skalierbarkeit**: Einfaches Hinzufügen neuer Tabs
6. **♻️ Wiederverwendbarkeit**: Tab-Komponenten in anderen Kontexten nutzbar
7. **🧪 Testbarkeit**: Isolierte Tests für jeden Tab möglich
8. **🎨 Konsistenz**: Einheitliches Design über alle Tabs hinweg

Diese Architektur verwandelt die ursprüngliche einfache Modal in eine vollwertige Customer Relationship Management (CRM) Oberfläche! 🎉