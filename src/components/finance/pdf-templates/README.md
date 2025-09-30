# PDF-Templates Modulare Struktur

Diese Datei dokumentiert die neue modulare Struktur der PDF-Templates in Taskilo.

## 📁 Verzeichnisstruktur

```
src/
├── components/finance/
│   ├── PDFTemplates.tsx                 # Haupt-Container (refactored)
│   └── pdf-templates/
│       ├── index.ts                     # Export-Index
│       ├── StandardTemplate.tsx         # Standard Business Template
│       ├── NeutralTemplate.tsx          # Minimalistisches Template
│       ├── ElegantTemplate.tsx          # Elegantes Serif Template
│       ├── TechnicalTemplate.tsx        # Technical Monospace Template
│       ├── GeometricTemplate.tsx        # Geometrische Formen Template
│       ├── DynamicTemplate.tsx          # Dynamisches Template mit Gradienten
│       └── common/
│           ├── TaxRulesInfo.tsx         # Deutsche Steuerregeln-Anzeige
│           ├── TotalsDisplay.tsx        # Gesamtbetrag-Komponente
│           ├── ItemsTable.tsx           # Positionstabelle
│           ├── BankDetails.tsx          # Bankverbindungs-Anzeige
│           └── FooterText.tsx           # Fußtext mit Platzhaltern
└── hooks/pdf/
    └── usePDFTemplateData.ts            # Zentraler Daten-Hook
```

## 🎯 Kernkonzept

### Zentraler Hook: `usePDFTemplateData`
- **Zweck**: Alle Datenberechnungen und -transformationen an einer Stelle
- **Eingang**: `PDFTemplateProps` (document, template, color, etc.)
- **Ausgang**: `ProcessedPDFData` mit allen berechneten Werten
- **Vorteile**: 
  - Einheitliche Datenlogik
  - Performance-Optimierung durch `useMemo`
  - Leichtere Wartung und Tests

### Template-Komponenten
Jedes Template erhält standardisierte Props:
```typescript
interface TemplateProps {
  data: ProcessedPDFData;  // Alle verarbeiteten Daten
  color: string;           // Primärfarbe
  logoSize: number;        // Logo-Größe
}
```

### Common Components
Wiederverwendbare UI-Komponenten mit Varianten:
- **TotalsDisplay**: `standard | elegant | technical | compact`
- **ItemsTable**: `standard | elegant | technical | neutral | dynamic`
- **BankDetails**: `standard | elegant | technical | compact`
- **FooterText**: `standard | elegant | compact`

## 🔧 Verwendung

### Template verwenden
```typescript
import PDFTemplate from '@/components/finance/PDFTemplates';

<PDFTemplate 
  document={invoiceData}
  template="TEMPLATE_ELEGANT"
  color="#14ad9f"
  logoUrl={companyLogo}
  logoSize={60}
  documentType="invoice"
/>
```

### Neues Template erstellen
```typescript
// 1. Template-Komponente erstellen
export const MyCustomTemplate: React.FC<TemplateProps> = ({ data, color, logoSize }) => {
  return (
    <div className="bg-white w-full min-h-[297mm] max-w-[210mm] mx-auto p-6">
      {/* Custom Layout */}
      <ItemsTable data={data} color={color} variant="standard" />
      <TotalsDisplay data={data} color={color} variant="elegant" />
      {/* ... */}
    </div>
  );
};

// 2. In index.ts exportieren
export { MyCustomTemplate } from './MyCustomTemplate';

// 3. In PDFTemplates.tsx einbinden
case 'TEMPLATE_MYCUSTOM':
  return <MyCustomTemplate data={data} color={props.color} logoSize={props.logoSize || 50} />;
```

### Common Component erweitern
```typescript
// Neue Variante zu TotalsDisplay hinzufügen
if (variant === 'myNewVariant') {
  return (
    <div className="custom-totals-styling">
      {/* Custom Implementation */}
    </div>
  );
}
```

## 📊 Datenfluss

```
PDFTemplateProps 
    ↓
usePDFTemplateData (Hook)
    ↓ 
ProcessedPDFData
    ↓
Template-Komponente
    ↓
Common Components
    ↓
Gerendertes PDF
```

## 🎨 Template-Varianten

| Template | Beschreibung | Schriftart | Stil |
|----------|-------------|-----------|------|
| **Standard** | Klassisches Business-Design | Arial | Corporate, sauber |
| **Neutral** | Minimalistisch, vielseitig | Arial | Schlicht, modern |
| **Elegant** | Luxuriös, hochwertig | Georgia | Serif, elegant |
| **Technical** | Strukturiert, technisch | Courier New | Monospace, präzise |
| **Geometric** | Moderne geometrische Formen | Arial | Kreativ, dynamisch |
| **Dynamic** | Gradienten und Bewegung | Arial | Modern, lebendig |

## 🔄 Migration Benefits

### Vorher (Monolithische Struktur)
```
PDFTemplates.tsx (2000+ Zeilen)
├── Alle 6 Templates in einer Datei
├── Doppelte Datenlogik
├── Schwer wartbar
└── Schwer testbar
```

### Nachher (Modulare Struktur)
```
PDFTemplates.tsx (40 Zeilen - nur Container)
├── Zentraler Hook (120 Zeilen)
├── 6 Template-Dateien (je ~200 Zeilen)
├── 5 Common Components (je ~80 Zeilen)
├── Klare Trennung der Verantwortlichkeiten
├── Wiederverwendbare Komponenten
├── Einfache Tests
└── Saubere Wartung
```

## 🧪 Testing Strategy

### Hook Tests
```typescript
// usePDFTemplateData.test.ts
describe('usePDFTemplateData', () => {
  test('should calculate totals correctly', () => {
    // Teste Berechnungslogik
  });
  
  test('should handle missing data gracefully', () => {
    // Teste Fallback-Werte
  });
});
```

### Template Tests
```typescript
// StandardTemplate.test.tsx
describe('StandardTemplate', () => {
  test('should render with valid data', () => {
    // Teste Template-Rendering
  });
});
```

### Component Tests
```typescript
// TotalsDisplay.test.tsx
describe('TotalsDisplay', () => {
  test('should render different variants correctly', () => {
    // Teste Varianten
  });
});
```

## 🚀 Performance

### Optimierungen
- **useMemo** in zentralem Hook verhindert unnötige Neuberechnungen
- **Komponenten-Split** ermöglicht gezieltes Lazy Loading
- **Props-Drilling vermieden** durch strukturierte Datenübertragung
- **Bundle-Size reduziert** durch modularen Import

### Monitoring
```typescript
// Performance-Monitoring in Hook
console.time('PDFDataProcessing');
const processedData = useMemo(() => {
  // ... Berechnungen
}, [document, template, color, logoUrl, logoSize, documentType]);
console.timeEnd('PDFDataProcessing');
```

## 🔧 Maintenance

### Neue Datenfelder hinzufügen
1. **ProcessedPDFData Interface** erweitern
2. **usePDFTemplateData Hook** anpassen
3. **Templates nach Bedarf** aktualisieren

### Bug Fixes
- **Datenlogik-Bugs**: Nur Hook ändern
- **Design-Bugs**: Nur entsprechende Template-Datei ändern
- **Component-Bugs**: Nur entsprechende Common Component ändern

### Code Reviews
- **Kleinere Dateien** = einfachere Reviews
- **Klare Verantwortlichkeiten** = gezieltes Feedback
- **Modularer Aufbau** = parallele Entwicklung möglich

## 📝 Best Practices

1. **Template-Props minimieren**: Nur `data`, `color`, `logoSize` übergeben
2. **Common Components nutzen**: Nicht in Templates wiederholen
3. **Varianten erweitern**: Statt neue Components für ähnliche Designs
4. **Hook-Performance**: Schwere Berechnungen in `useMemo` wrappen
5. **TypeScript nutzen**: Alle Interfaces vollständig definieren
6. **Konsistente Namensgebung**: `TemplateNameTemplate.tsx`

## 🎯 Roadmap

- [ ] **Storybook Integration** für Template-Preview
- [ ] **Visual Regression Tests** für PDF-Ausgabe  
- [ ] **Theme System** für Corporate Designs
- [ ] **Template Builder** für Custom Templates
- [ ] **Performance Analytics** für Render-Zeiten
- [ ] **A11y Improvements** für Accessibility