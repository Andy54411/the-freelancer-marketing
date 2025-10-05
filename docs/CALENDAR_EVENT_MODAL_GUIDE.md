# Calendar Event Modal - Implementierungsanleitung

## 🎯 Überblick

Die `CalendarEventModal` ist eine umfassende Komponente für die Verwaltung von Kalender-Events mit Notizen und Dateien. Sie kann nahtlos in bestehende Kalender-Systeme integriert werden.

## 📁 Komponenten-Struktur

```
src/
├── components/
│   └── calendar/
│       ├── CalendarEventModal.tsx     # Haupt-Modal-Komponente
│       └── CustomerCalendarTab.tsx    # Integration für Kundenkontext
└── hooks/
    └── useCalendarEventModal.tsx      # Hook für einfache Integration
```

## 🔧 Implementierung

### 1. Basis-Integration

```typescript
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';

function MyComponent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  return (
    <CalendarEventModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      event={selectedEvent}
      companyId="your-company-id"
      customerId="optional-customer-id"
      onEventSaved={(event) => console.log('Event saved:', event)}
      onEventDeleted={(eventId) => console.log('Event deleted:', eventId)}
    />
  );
}
```

### 2. Hook-basierte Integration

```typescript
import { useCalendarEventModal } from '@/hooks/useCalendarEventModal';

function MyCalendarComponent() {
  const {
    handleCreateEvent,
    CalendarEventModalComponent,
  } = useCalendarEventModal({
    companyId: 'your-company-id',
    customerId: 'optional-customer-id',
  });

  return (
    <div>
      <Button onClick={() => handleCreateEvent(new Date())}>
        Neuer Termin
      </Button>
      
      {/* Kalender hier */}
      
      {CalendarEventModalComponent}
    </div>
  );
}
```

### 3. CustomerHistoryTab Integration

Um die Komponente in die CustomerHistoryTab zu integrieren:

```typescript
// In CustomerHistoryTab.tsx - Kalender-Tab erweitern
import { CustomerCalendarTab } from '@/components/calendar/CustomerCalendarTab';

// Im Kalender TabsContent:
<TabsContent value="calendar" className="mt-6">
  <CustomerCalendarTab customer={customer} />
</TabsContent>
```

## 🗄️ Firestore-Struktur

```
companies/{companyId}/calendar_events/{eventId}
├── title: string
├── description: string
├── startDate: timestamp
├── endDate: timestamp
├── location: string
├── eventType: 'meeting' | 'appointment' | 'task' | 'reminder' | 'call'
├── status: 'planned' | 'confirmed' | 'completed' | 'cancelled'
├── priority: 'low' | 'medium' | 'high' | 'urgent'
├── customerId?: string
├── createdBy: string
├── createdAt: timestamp
├── updatedAt: timestamp
│
├── notes/{noteId}
│   ├── content: string
│   ├── createdBy: string
│   ├── createdByName: string
│   └── createdAt: timestamp
│
└── files/{fileId}
    ├── name: string
    ├── originalName: string
    ├── size: number
    ├── type: string
    ├── url: string
    ├── storagePath: string
    ├── uploadedBy: string
    ├── uploadedByName: string
    └── uploadedAt: timestamp
```

## 💾 Firebase Storage

Dateien werden in Firebase Storage gespeichert:
```
companies/{companyId}/calendar_events/{eventId}/files/{fileId}-{filename}
```

## 🔒 Security Rules

Die Firestore Security Rules sind bereits konfiguriert:

- ✅ Nur Firmen können ihre eigenen Events verwalten
- ✅ Support Staff hat Lesezugriff
- ✅ Notizen und Dateien sind pro Event isoliert
- ✅ File Upload nur für authentifizierte Benutzer

## 🎨 Features

### Event Management
- ✅ Erstellen, Bearbeiten, Löschen von Terminen
- ✅ Verschiedene Event-Typen (Meeting, Termin, Aufgabe, etc.)
- ✅ Status-Tracking (Geplant, Bestätigt, Abgeschlossen, etc.)
- ✅ Prioritäten-System (Niedrig, Mittel, Hoch, Dringend)
- ✅ Datum- und Zeitverwaltung
- ✅ Standort-Information

### Notizen-System
- ✅ Unbegrenzte Notizen pro Event
- ✅ Real-time Synchronisation
- ✅ User-Attribution mit Namen
- ✅ Zeitstempel für jede Notiz
- ✅ Löschen von Notizen möglich

### Datei-Management
- ✅ Multi-File Upload mit Drag & Drop
- ✅ Unterstützte Formate: Bilder, PDF, Office-Dokumente
- ✅ Maximale Dateigröße: 10MB
- ✅ Automatische Thumbnails für Bilder
- ✅ Download und Löschen von Dateien
- ✅ User-Attribution für Uploads

### UI/UX
- ✅ Tab-basierte Navigation (Details, Notizen, Dateien)
- ✅ Responsive Design für alle Bildschirmgrößen
- ✅ Taskilo-Branding mit korrekten Farben
- ✅ Loading States und Error Handling
- ✅ Toast-Benachrichtigungen
- ✅ Konfirmations-Dialoge für Löschvorgänge

## 🚀 Integration in CustomerHistoryTab

Die Komponente kann direkt in die bestehende CustomerHistoryTab integriert werden:

1. **Import hinzufügen:**
```typescript
import { CustomerCalendarTab } from '@/components/calendar/CustomerCalendarTab';
```

2. **Tab erweitern:**
```typescript
<TabsContent value="calendar" className="mt-6">
  <CustomerCalendarTab customer={customer} />
</TabsContent>
```

3. **Fertig!** Die Komponente ist vollständig funktionsfähig und nutzt die bestehende Firebase-Infrastruktur.

## 🔄 Real-time Updates

- Notizen werden in Echtzeit synchronisiert
- Datei-Uploads sind sofort sichtbar
- Änderungen an Events werden automatisch übertragen
- Optimistic Updates für bessere UX

## 📱 Mobile Optimierung

- Touch-friendly Interface
- Responsive Grid-Layout
- Optimierte Dateigröße für mobile Uploads
- Angepasste Modal-Größe für kleine Bildschirme

Die Komponente ist production-ready und kann sofort eingesetzt werden!