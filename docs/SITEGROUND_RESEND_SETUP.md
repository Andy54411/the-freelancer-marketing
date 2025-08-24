# SiteGround DNS Setup für Resend (taskilo.de)

## 🚀 Schritt-für-Schritt Anleitung

### 1. SiteGround Control Panel öffnen
- Gehe zu: https://my.siteground.com/
- Logge dich mit deinen SiteGround-Zugangsdaten ein

### 2. DNS Zone Editor finden
- Klicke im Dashboard auf **"Domains"**
- Wähle **"DNS Zone Editor"** aus
- Wähle die Domain **"taskilo.de"** aus

### 3. DNS Records hinzufügen

#### 📧 RECORD 1: MX Record für E-Mail-Routing
```
Type: MX
Name/Host: send
Mail Server: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 300
```

#### 🔐 RECORD 2: SPF Record für E-Mail-Authentifizierung
```
Type: TXT
Name/Host: send
Value: v=spf1 include:amazonses.com ~all
TTL: 300
```

#### 🔑 RECORD 3: DKIM Record für E-Mail-Signierung
```
Type: TXT
Name/Host: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTE8lqU2L7s6nKohbSVEERDoJFCvTW3ridtBbbJAMwA5XOin8IbadJvnabJk5kAFYPynuvgPNGASimvWk/NzLliiUJSuKaFLXPrWi359VEzxjhY/Cr6dJLpEed2Y7iUINwfzCrpXFg7HwrkRKgLoKKY6dvRYF6uwAYKAO4fQvkLQIDAQAB
TTL: 300
```

## ⚠️ Wichtige Hinweise für SiteGround

### Name/Host Felder:
- **NICHT** `send.taskilo.de` eingeben
- **NUR** `send` eingeben (SiteGround fügt automatisch .taskilo.de hinzu)
- **NICHT** `resend._domainkey.taskilo.de` eingeben  
- **NUR** `resend._domainkey` eingeben

### MX Record spezifisch:
- Im "Mail Server" Feld: `feedback-smtp.us-east-1.amazonses.com`
- Priority/Priorität: `10`
- NICHT in das "Value" Feld eintragen!

### TXT Records:
- Kompletten Value inklusive Anführungszeichen kopieren
- Bei DKIM: Der Value ist sehr lang - komplett kopieren!

## 🕐 Nach dem Setup

### Warten und Verifizieren:
1. **Warten**: 5-15 Minuten für DNS-Propagation
2. **Verifizierung starten**:
   ```bash
   node scripts/resend-setup.js verify
   ```
3. **Status prüfen**:
   ```bash
   node scripts/resend-setup.js status
   ```
4. **Test-E-Mail senden**:
   ```bash
   node scripts/resend-setup.js test
   ```

## 🔍 DNS-Propagation prüfen

Du kannst die DNS-Propagation mit Online-Tools prüfen:
- https://whatsmydns.net/
- https://dnschecker.org/

Suche nach:
- `send.taskilo.de` (MX und TXT Records)
- `resend._domainkey.taskilo.de` (TXT Record)

## 📞 Support

Falls Probleme auftreten:
- SiteGround Support kontaktieren
- DNS-Records nochmal überprüfen
- Script-Logs anschauen: `node scripts/resend-setup.js status`
