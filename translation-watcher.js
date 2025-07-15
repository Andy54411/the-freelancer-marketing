const fs = require('fs');
const path = require('path');

// Pfade zu den Übersetzungsdateien
const MESSAGES_DIR = path.join(__dirname, 'messages');
const DE_FILE = path.join(MESSAGES_DIR, 'de.json');
const EN_FILE = path.join(MESSAGES_DIR, 'en.json');

// Überwache Änderungen an der deutschen Datei
console.log('🔄 Translation Watcher gestartet...');
console.log('📁 Überwache:', DE_FILE);

function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${filePath}:`, error.message);
    return {};
  }
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Fehler beim Speichern von ${filePath}:`, error.message);
    return false;
  }
}

function syncTranslations() {
  console.log('🔄 Synchronisiere Übersetzungen...');

  const deData = loadJSON(DE_FILE);
  const enData = loadJSON(EN_FILE);

  // Prüfe, ob neue Schlüssel in der deutschen Datei vorhanden sind
  let hasChanges = false;

  function syncKeys(deObj, enObj, path = '') {
    for (const key in deObj) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof deObj[key] === 'object' && deObj[key] !== null && !Array.isArray(deObj[key])) {
        // Rekursiv für verschachtelte Objekte
        if (!enObj[key] || typeof enObj[key] !== 'object') {
          enObj[key] = {};
          hasChanges = true;
        }
        syncKeys(deObj[key], enObj[key], currentPath);
      } else {
        // Prüfe, ob der Schlüssel in der englischen Datei fehlt
        if (!enObj.hasOwnProperty(key)) {
          // Einfache Übersetzung - kann später manuell verfeinert werden
          enObj[key] = deObj[key]; // Placeholder, sollte übersetzt werden
          hasChanges = true;
          console.log(`➕ Neuer Schlüssel gefunden: ${currentPath}`);
        }
      }
    }
  }

  syncKeys(deData, enData);

  if (hasChanges) {
    if (saveJSON(EN_FILE, enData)) {
      console.log('✅ Englische Übersetzungen aktualisiert');
    }
  } else {
    console.log('✅ Keine Änderungen erforderlich');
  }
}

// Initiale Synchronisation
syncTranslations();

// Überwache Dateiänderungen
fs.watchFile(DE_FILE, { interval: 1000 }, (curr, prev) => {
  if (curr.mtime > prev.mtime) {
    console.log('📝 Änderung in de.json erkannt');
    syncTranslations();
  }
});

console.log('👀 Überwache Änderungen an de.json...');
console.log('Drücken Sie Ctrl+C zum Beenden');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Translation Watcher beendet');
  process.exit(0);
});
