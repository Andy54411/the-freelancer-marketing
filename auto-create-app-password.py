#!/usr/bin/env python3
"""
Google Workspace App-Passwort Automation
Automatische Erstellung eines App-Passworts für newsletter@taskilo.de
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import subprocess
import sys

def create_app_password():
    """Automatische App-Passwort Erstellung über Selenium"""
    
    print("🤖 Starte Browser-Automation für Google Workspace...")
    
    # Chrome-Optionen
    options = webdriver.ChromeOptions()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    # options.add_argument("--headless")  # Deaktiviert für Debugging
    
    # WebDriver initialisieren
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        print("📱 Öffne Google Account App-Passwort Seite...")
        driver.get("https://myaccount.google.com/apppasswords")
        
        print("⏳ Warte auf Authentifizierung...")
        print("👤 Bitte melden Sie sich als newsletter@taskilo.de an")
        
        # Warten auf Login und App-Passwort Seite
        WebDriverWait(driver, 300).until(
            lambda d: "apppasswords" in d.current_url or "signin" in d.current_url
        )
        
        if "signin" in driver.current_url:
            print("🔐 Login-Seite erkannt. Bitte authentifizieren Sie sich...")
            WebDriverWait(driver, 300).until(
                lambda d: "apppasswords" in d.current_url
            )
        
        print("✅ App-Passwort Seite erreicht!")
        
        # App-Passwort erstellen
        try:
            # "App erstellen" Button finden und klicken
            create_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-action='create']"))
            )
            create_button.click()
            print("🔧 App-Passwort Erstellung gestartet...")
            
            # App-Name eingeben
            app_name_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']"))
            )
            app_name_input.send_keys("Taskilo Newsletter SMTP")
            
            # Erstellen bestätigen
            generate_button = driver.find_element(By.CSS_SELECTOR, "[data-action='generate']")
            generate_button.click()
            
            # App-Passwort auslesen
            password_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[data-password]"))
            )
            app_password = password_element.get_attribute("data-password")
            
            print(f"🎉 App-Passwort erstellt: {app_password}")
            
            # Vercel Environment Variable setzen
            set_vercel_env(app_password)
            
        except Exception as e:
            print(f"⚠️  Automatische Erstellung fehlgeschlagen: {e}")
            print("💡 Bitte erstellen Sie das App-Passwort manuell:")
            print("   1. Klicken Sie auf 'App erstellen'")
            print("   2. Name: 'Taskilo Newsletter SMTP'")
            print("   3. Kopieren Sie das generierte Passwort")
            
            # Warten auf manuellen Abschluss
            input("🖱️  Drücken Sie Enter, wenn Sie fertig sind...")
        
    finally:
        print("🔒 Schließe Browser...")
        driver.quit()

def set_vercel_env(app_password):
    """Setzt das App-Passwort als Vercel Environment Variable"""
    try:
        print(f"🔧 Setze GMAIL_APP_PASSWORD in Vercel...")
        
        # Formatiere Passwort (entferne Leerzeichen)
        clean_password = app_password.replace(" ", "")
        
        # Vercel Environment Variable setzen
        cmd = ["vercel", "env", "add", "GMAIL_APP_PASSWORD", "production", "--force"]
        
        print(f"💻 Führe aus: {' '.join(cmd)}")
        print(f"📋 App-Passwort: {clean_password}")
        
        # Automatisches Input für vercel env
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(input=clean_password + "\n")
        
        if process.returncode == 0:
            print("✅ GMAIL_APP_PASSWORD erfolgreich gesetzt!")
        else:
            print(f"❌ Fehler: {stderr}")
            print(f"💡 Manuell ausführen: {' '.join(cmd)}")
            print(f"    Dann eingeben: {clean_password}")
        
    except Exception as e:
        print(f"❌ Fehler beim Setzen der Environment Variable: {e}")

def main():
    print("=== Google Workspace App-Passwort Automation ===")
    print("🎯 Ziel: Automatische Erstellung für newsletter@taskilo.de")
    print("🔧 Methode: Selenium Browser-Automation")
    print()
    
    try:
        create_app_password()
        print("✅ App-Passwort Setup abgeschlossen!")
        
    except KeyboardInterrupt:
        print("\n⏹️  Setup abgebrochen.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Fehler: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
