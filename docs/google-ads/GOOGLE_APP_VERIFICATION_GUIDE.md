# Google App Verification Guide für Taskilo

## Warum diese Warnung erscheint

Google zeigt eine Sicherheitswarnung für unverifizierte Apps, die auf sensible Daten zugreifen (wie Google Ads).

## Sofortige Lösung (für Tests)

1. **"Erweitert" klicken**
2. **"Zu Taskilo (unsicher) wechseln"** auswählen  
3. **Berechtigungen erteilen**

⚠️ **Diese Warnung ist normal für Test-Apps und schadet nicht!**

## Langfristige Lösung: App-Verifizierung

### Schritt 1: Google Cloud Console

1. Gehen Sie zu [Google Cloud Console](https://console.cloud.google.com/)
2. Wählen Sie Ihr Projekt: `taskilo-platform` 
3. Navigieren Sie zu **APIs & Services → OAuth consent screen**

### Schritt 2: App-Informationen vervollständigen

**Erforderliche Informationen:**
- **App Name**: Taskilo
- **User Support Email**: a.staudinger32@gmail.com
- **Developer Contact**: a.staudinger32@gmail.com
- **App Logo**: Taskilo Logo (120x120px)
- **App Homepage**: https://taskilo.de
- **Privacy Policy**: https://taskilo.de/datenschutz
- **Terms of Service**: https://taskilo.de/agb

### Schritt 3: Scope-Verifizierung

**Für Google Ads benötigen Sie:**
- `https://www.googleapis.com/auth/adwords`

**Begründung eingeben:**
```
Taskilo ist eine Business-Management-Plattform für Dienstleister und Handwerker. 
Die Google Ads Integration ermöglicht es unseren Nutzern:

1. Ihre Google Ads Kampagnen direkt im Taskilo Dashboard zu verwalten
2. Performance-Metriken einzusehen um ROI zu optimieren  
3. Automatisierte Kampagnen basierend auf Geschäftsdaten zu erstellen
4. Synchronisation zwischen Aufträgen und Werbekampagnen

Dies hilft kleinen Unternehmen ihre Marketing-Aktivitäten effizienter zu verwalten.
```

### Schritt 4: Verifizierung einreichen

1. **Screenshots der App** hochladen
2. **Video-Demo** der Google Ads Integration
3. **Erklärung des Use Cases**
4. **Wartung auf Genehmigung** (1-6 Wochen)

## Temporäre Alternative: Domain-Verifizierung

Für `taskilo.de` Domain können Sie eine **Domain-Verifizierung** beantragen:

1. Google Search Console für taskilo.de einrichten
2. Domain-Ownership bestätigen  
3. Verifizierte Domain in OAuth-Settings eintragen

## Status-Tracking

**Aktueller Status:** Unverifiziert (Warnung wird angezeigt)
**Nächster Schritt:** App-Verifizierung starten oder Domain verifizieren
**Zeitrahmen:** 2-6 Wochen für vollständige Verifizierung

## Test-Workaround (für Entwicklung)

Für Entwicklung und Tests können Sie:
1. **Test-User hinzufügen** in Google Cloud Console
2. **Domain zu "Authorized domains" hinzufügen** 
3. **App im "Testing"-Modus lassen**

**Test-User:** Bis zu 100 Gmail-Adressen können ohne Warnung zugreifen.

---

**💡 Tipp:** Die Warnung schadet nicht der Funktionalität - sie ist nur ein Sicherheitshinweis von Google.
