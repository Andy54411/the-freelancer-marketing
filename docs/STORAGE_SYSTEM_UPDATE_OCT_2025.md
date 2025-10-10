# Storage System Update - Oktober 2025

## ✅ Abgeschlossene Änderungen

### 1. Neue Speicherpläne

**Kostenlos**: 500 MB (Standard für alle neuen Firmen)

**Bezahlte Pläne**:
- **1 GB**: €0.99/Monat - `price_1SGgbzD5Lvjon30afg8y0RnG`
- **10 GB**: €2.99/Monat (Beliebt) - `price_1SGgc0D5Lvjon30awN46TFta`
- **30 GB**: €5.99/Monat - `price_1SGgc0D5Lvjon30a1F3dSji5`
- **50 GB**: €9.99/Monat - `price_1SGgc1D5Lvjon30aSEOc32sW`
- **100 GB**: €14.99/Monat - `price_1SGgc2D5Lvjon30aeXWpEY2D`
- **Unlimited**: €19.90/Monat - `price_1SGgc2D5Lvjon30amD74brGD`

### 2. Stripe-Produkte erstellt

Alle 6 Produkte wurden erfolgreich in Stripe erstellt am **10. Oktober 2025**.

### 3. Code-Updates

✅ **StorageUpgradeModal.tsx**
- Neue Pläne mit echten Price IDs
- "Beliebt"-Badge bei 10 GB Plan
- Unlimited-Plan hinzugefügt

✅ **StorageCardSidebar.tsx**
- Formatierung verbessert (zeigt MB statt 0.0 GB)
- Prozent-Anzeige mit 2 Dezimalstellen bei <1%
- Debug-Logs entfernt

✅ **setup-stripe-storage-plans.js**
- Script aktualisiert für neue Pläne
- Automatisches Einfügen der Price IDs

### 4. Tracking-System

✅ **Funktioniert einwandfrei**:
- Real-time Updates bei File-Uploads
- Storage + Firestore werden getrennt getrackt
- Anzeige aktualisiert sich sofort

## 📋 Offene Punkte

### 1. Standard-Limit für neue Firmen setzen

**Aktuell**: Neue Firmen bekommen 5 GB
**Soll**: Neue Firmen sollen 500 MB (kostenlos) bekommen

**Zu ändern**:
- Company-Erstellung (Onboarding)
- Firebase Functions (createCompany)
- Admin-Scripts

### 2. Migrations-Plan für bestehende Kunden

**Bestandskunden mit 5 GB**:
- Behalten ihren 5 GB Plan (Bestandsschutz)
- ODER: Migration auf 1 GB Plan mit Nachricht

### 3. UI-Text anpassen

In der `StorageCardSidebar.tsx`:
```typescript
// Aktuell zeigt es "5.00 GB" als Limit
// Bei kostenlosen 500 MB sollte es "500.00 MB" zeigen
```

### 4. Dokumentation

**TODO**:
- Update der README mit neuen Preisen
- Kunden-Email-Vorlagen für Planänderungen
- FAQ für Storage-Limits

## 🚀 Nächste Schritte

1. **Standard-Limit auf 500 MB setzen**
   ```javascript
   // In company creation:
   storageLimit: 500 * 1024 * 1024 // 500 MB
   storagePlanId: 'free'
   ```

2. **Webhook testen**
   - Testbestellung in Stripe Dashboard
   - Prüfen ob Upgrade funktioniert
   - Prüfen ob Limit korrekt aktualisiert wird

3. **Produktiv schalten**
   - Webhook URL in Stripe Production setzen
   - Live-Price IDs verwenden (falls Test-Mode)
   - Monitoring aktivieren

## 📊 Aktuelle Daten (Testfirma)

**Company**: LLc8PX1VYHfpoFknk8o51LAOfSA2
- **Storage**: 1.8 MB (Dateien)
- **Firestore**: 1.77 MB (Datenbank)
- **Total**: 3.57 MB / 5 GB
- **Usage**: 0.07%

## 📞 Support

Bei Fragen oder Problemen:
- Stripe Dashboard: https://dashboard.stripe.com/products
- Logs: `pnpm logs`
- Debugging: Check StorageCardSidebar console logs
