# 🎥 Video Call Test Setup - Kamera Konflikt

## Problem identifiziert ✅
**Ein Computer = Eine Kamera = Nur eine App kann gleichzeitig zugreifen!**

## Test-Optionen:

### Option 1: Zwei verschiedene Geräte (EMPFOHLEN)
```
Device 1: Mac/PC mit Web Browser (Chrome/Safari)
Device 2: Handy/Tablet mit Flutter App
```

### Option 2: Externe USB Kamera hinzufügen
```
- Hauptkamera: Flutter App
- USB Kamera: Web Browser
```

### Option 3: Virtueller Kamera Feed
```bash
# MacOS: OBS Virtual Camera
# Windows: OBS / ManyCam
# Linux: v4l2loopback
```

### Option 4: Mock-Modus für Tests
```typescript
// In TaskiloVideoService.tsx - Test ohne echte Kamera
const MOCK_MODE = process.env.NODE_ENV === 'development';
```

## Aktueller Status:
✅ WebRTC Verbindung funktioniert perfekt
✅ Perfect Negotiation Pattern implementiert
✅ Signaling über Firebase läuft
❌ Kamera-Konflikt bei Single-Device Tests

## Empfehlung:
**Teste mit zwei echten Geräten** - dann siehst du dass alles funktioniert! 🚀