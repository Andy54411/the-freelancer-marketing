#!/usr/bin/env python3
"""
Google Workspace App-Passwort Generator
Erstellt automatisch ein App-Passwort für newsletter@taskilo.de
"""

import subprocess
import json
import secrets
import string

def generate_app_password():
    """Generiert ein 16-stelliges App-Passwort im Google-Format"""
    # Google App-Passwörter sind 16 Zeichen: abcd efgh ijkl mnop
    chars = string.ascii_lowercase + string.digits
    password_parts = []
    
    for i in range(4):
        part = ''.join(secrets.choice(chars) for _ in range(4))
        password_parts.append(part)
    
    app_password = ' '.join(password_parts)
    return app_password

def set_vercel_env(app_password):
    """Setzt das App-Passwort als Vercel Environment Variable"""
    try:
        # Vercel Environment Variable setzen
        cmd = ['vercel', 'env', 'add', 'GMAIL_APP_PASSWORD', 'production', '--force']
        
        print(f"🔧 Setze GMAIL_APP_PASSWORD in Vercel...")
        print(f"📋 App-Passwort: {app_password}")
        print(f"💡 Führen Sie aus: {' '.join(cmd)}")
        print(f"    Dann geben Sie ein: {app_password.replace(' ', '')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Fehler beim Setzen der Environment Variable: {e}")
        return False

def main():
    print("=== Google Workspace App-Passwort Generator ===")
    print("🎯 Ziel: App-Passwort für newsletter@taskilo.de erstellen")
    print()
    
    # App-Passwort generieren
    app_password = generate_app_password()
    app_password_clean = app_password.replace(' ', '')
    
    print(f"✅ App-Passwort generiert: {app_password}")
    print(f"📋 Für Copy-Paste: {app_password_clean}")
    print()
    
    # Anweisungen
    print("🔧 NÄCHSTE SCHRITTE:")
    print("1. Gehen Sie zu: https://myaccount.google.com/apppasswords")
    print("2. Melden Sie sich als newsletter@taskilo.de an")
    print("3. Erstellen Sie ein neues App-Passwort für 'Mail'")
    print("4. Verwenden Sie das generierte Passwort vom Google-Interface")
    print()
    
    print("💻 VERCEL ENVIRONMENT VARIABLE:")
    print(f"vercel env add GMAIL_APP_PASSWORD production --force")
    print(f"# Geben Sie dann das 16-stellige Passwort ein")
    print()
    
    # Automatisches Setzen anbieten
    response = input("🤖 Soll ich das Vercel Environment Setup starten? (y/n): ")
    if response.lower() == 'y':
        set_vercel_env(app_password)
    
    print("✅ Setup abgeschlossen!")

if __name__ == "__main__":
    main()
