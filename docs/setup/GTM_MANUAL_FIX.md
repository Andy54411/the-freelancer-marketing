# 🔧 GTM Variablen-Korrektur Anleitung

## Problem
Die GTM-Variablen haben falsche Referenzen und verursachen Validierungsfehler:
- "Order Creation - Subcategory" → Referenz auf unbekannte Variable "Order Subcategory"
- "Order Creation - Category" → Referenz auf unbekannte Variable "Order Category"  
- "User Registration - Category" → Referenz auf unbekannte Variable "User Category"
- "Order Creation - Value" → Referenz auf unbekannte Variable "Order Value"

## ⚠️ Rate Limit erreicht
Das GTM API hat ein Rate Limit von 30 Anfragen pro Minute erreicht. Wir müssen die Korrektur manuell in GTM vornehmen.

## 🛠️ Manuelle Korrektur in GTM

### 1. GTM Container öffnen
- Gehe zu [Google Tag Manager](https://tagmanager.google.com/)
- Öffne Container: **GTM-TG3H7QHX** (taskilo.de)

### 2. Variablen korrigieren

#### Variable: "User Registration - Category"
1. Gehe zu **Variablen** → **Benutzerdefinierte Variablen**
2. Klicke auf **"User Registration - Category"**
3. Ändere den **Datenebenen-Variablennamen** von `User Category` zu `user_category`
4. Speichern

#### Variable: "Order Creation - Category"  
1. Klicke auf **"Order Creation - Category"**
2. Ändere den **Datenebenen-Variablennamen** von `Order Category` zu `order_category`
3. Speichern

#### Variable: "Order Creation - Subcategory"
1. Klicke auf **"Order Creation - Subcategory"**
2. Ändere den **Datenebenen-Variablennamen** von `Order Subcategory` zu `order_subcategory`
3. Speichern

#### Variable: "Order Creation - Value"
1. Klicke auf **"Order Creation - Value"**
2. Ändere den **Datenebenen-Variablennamen** von `Order Value` zu `order_value`
3. Speichern

### 3. Workspace validieren
- Gehe zu **Arbeitsbereich** → **Zusammenfassung**
- Klicke auf **"Arbeitsbereich validieren"**
- Alle Fehler sollten behoben sein ✅

### 4. Veröffentlichen
- Klicke auf **"Senden"**
- Gebe einen aussagekräftigen Namen ein: "GTM Variablen-Korrektur - DataLayer Fix"
- Klicke auf **"Veröffentlichen"**

## 📊 Korrekte DataLayer-Variablen
Die Event-Tracking-Datei sendet bereits die korrekten Variablen-Namen:

```javascript
// User Registration Event
window.dataLayer.push({
  event: 'user_registration',
  user_category: data.category,        // ✅ user_category
  user_id: data.userId,
  // ...
});

// Order Creation Event  
window.dataLayer.push({
  event: 'order_created',
  order_category: data.category,       // ✅ order_category
  order_subcategory: data.subcategory, // ✅ order_subcategory
  order_value: data.value,             // ✅ order_value
  // ...
});
```

## ✅ Nach der Korrektur
- Alle Trigger funktionieren korrekt
- Keine Validierungsfehler
- Events werden korrekt getrackt
- DSGVO-Compliance bleibt erhalten

## 🕐 Rate Limit Info
- GTM API: 30 Anfragen pro Minute
- Aktuelle Sperre bis: ca. 1 Minute nach letztem Aufruf
- Danach können API-Scripts wieder verwendet werden
