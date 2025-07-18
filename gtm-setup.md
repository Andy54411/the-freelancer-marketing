# Google Tag Manager Konfiguration für TASKILO

## Übersicht

Diese Datei enthält die GTM-Konfiguration für das TASKILO-Projekt.

- **Container ID**: GTM-TG3H7QHX
- **GA4 Measurement ID**: G-WWXT65CVC8
- **Account ID**: 1022290879475

## Konfigurierte Tags

### 1. GA4 Configuration Tag
- **Zweck**: Grundkonfiguration für Google Analytics 4
- **Trigger**: Initialization - All Pages
- **Measurement ID**: G-WWXT65CVC8

### 2. GA4 Event - Page View
- **Zweck**: Tracking von Seitenaufrufen
- **Event Name**: page_view
- **Trigger**: Initialization - All Pages

### 3. GA4 Event - Form Submit
- **Zweck**: Tracking von Formular-Übermittlungen
- **Event Name**: form_submit
- **Parameter**: form_name
- **Trigger**: Form Submission

### 4. GA4 Event - Button Click
- **Zweck**: Tracking von Button-Klicks
- **Event Name**: button_click
- **Parameter**: button_text
- **Trigger**: Button Click - All Buttons

### 5. GA4 Event - Cookie Consent
- **Zweck**: Tracking von Cookie-Einwilligungen
- **Event Name**: cookie_consent
- **Parameter**: consent_type
- **Trigger**: Cookie Consent Event

## Trigger

### Initialization - All Pages
- **Typ**: Pageview
- **Aktivierung**: Alle Seiten

### Form Submission
- **Typ**: Form Submit
- **Aktivierung**: Alle Formulare

### Button Click - All Buttons
- **Typ**: Click
- **Aktivierung**: Alle Button-Elemente

### Cookie Consent Event
- **Typ**: Custom Event
- **Event Name**: cookie_consent

## Variablen

### Built-in Variables
- Page URL
- Page Path
- Click Element
- Click Text

### Custom Variables
- **Form Name**: DataLayer Variable für Formularnamen
- **Cookie Consent Type**: DataLayer Variable für Cookie-Einwilligungstyp

## Ordner-Struktur

1. **Analytics Tags**: Grundlegende GA4-Tags
2. **Event Tracking**: Event-spezifische Tags
3. **Conversion Tracking**: Conversion-Tags

## Verwendung in der Anwendung

### Cookie Consent Events
```javascript
// In der CookieBanner-Komponente
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'cookie_consent',
  consent_type: 'accept_all' // oder 'accept_selected', 'reject_all'
});
```

### Form Submit Events
```javascript
// Bei Formular-Übermittlung
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'form_submit',
  form_name: 'contact_form' // oder andere Formularnamen
});
```

### Button Click Events
```javascript
// Bei Button-Klicks (automatisch durch GTM erfasst)
// Oder manuell:
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'button_click',
  button_text: 'Jetzt buchen'
});
```

## Deployment

1. Exportiere die Konfiguration aus dieser Datei
2. Importiere sie in Google Tag Manager
3. Teste die Tags im Debug-Modus
4. Veröffentliche die Konfiguration

## Debug-Modus

Um den Debug-Modus zu aktivieren, füge `?gtm_debug=1` zur URL hinzu:
```
https://taskilo.com/?gtm_debug=1
```

## Consent Mode Integration

Die Tags sind für Google Consent Mode V2 konfiguriert:
- `analytics_storage`: Für GA4-Tracking
- `ad_storage`: Für Werbezwecke
- `functionality_storage`: Für funktionale Cookies
- `personalization_storage`: Für Personalisierung
- `security_storage`: Immer aktiviert für Sicherheit

## Weitere Konfiguration

### Conversion Tracking
Für E-Commerce-Tracking können weitere Tags hinzugefügt werden:
- Purchase Events
- Add to Cart Events
- Begin Checkout Events

### Enhanced Measurement
GA4 Enhanced Measurement ist standardmäßig aktiviert für:
- Scrolling
- Outbound Links
- Site Search
- Video Engagement
- File Downloads
