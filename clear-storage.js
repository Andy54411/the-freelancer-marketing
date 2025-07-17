// localStorage komplett löschen
// Führen Sie diesen Code in der Browser-Konsole aus (F12 > Console)

console.log('Aktueller localStorage Inhalt:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`${key}: ${localStorage.getItem(key)}`);
}

// Alle localStorage Daten löschen
localStorage.clear();
console.log('localStorage wurde geleert!');

// Oder nur bestimmte Einträge löschen:
// localStorage.removeItem('selectedLanguage');
// localStorage.removeItem('registrationData');
// localStorage.removeItem('cookieConsent');
// localStorage.removeItem('cookieBanner');

// Seite neu laden
location.reload();
