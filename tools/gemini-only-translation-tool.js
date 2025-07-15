#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({
  path: [path.join(__dirname, '..', '.env.local'), path.join(__dirname, '..', '.env')],
});

class GeminiOnlyTranslationTool {
  constructor() {
    this.gemini = null;
    this.stats = {
      totalTexts: 0,
      foundGermanTexts: 0,
      translations: 0,
      errors: 0,
      apiCalls: 0,
      filesScanned: 0,
    };
    this.batchSize = 20; // Größere Batches für bessere Performance
    this.delayBetweenCalls = 500; // Nur 0.5 Sekunden zwischen API-Aufrufen
    this.saveInterval = 25; // Alle 25 Verbesserungen speichern
    this.filePath = null; // Wird in processFile gesetzt
    this.germanTexts = new Map(); // Speichert gefundene deutsche Texte
    this.existingTranslations = {}; // Bereits vorhandene Übersetzungen
  }

  async initialize() {
    console.log('🤖 Gemini-Only Translation Tool für kompletten SRC-Ordner');
    console.log('=========================================================');

    // Nur Gemini initialisieren
    await this.initializeGemini();

    if (!this.gemini) {
      console.log('❌ Gemini nicht verfügbar - Tool kann nicht fortfahren');
      process.exit(1);
    }

    // Lade existierende Übersetzungen
    await this.loadExistingTranslations();

    console.log('✅ Gemini erfolgreich initialisiert!');
    console.log('⚡ Kompletter SRC-Ordner Scanner aktiviert!');
    console.log('');
  }

  async initializeGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY nicht gefunden');
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Google Gemini initialisiert');
    } catch (error) {
      console.log('❌ Gemini Initialisierung fehlgeschlagen:', error.message);
    }
  }

  async loadExistingTranslations() {
    const filePath = path.join(__dirname, '..', 'messages', 'en.json');
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.existingTranslations = JSON.parse(content);
        console.log('✅ Existierende Übersetzungen geladen');
      } catch (error) {
        console.log('⚠️ Fehler beim Laden der existierenden Übersetzungen:', error.message);
        this.existingTranslations = {};
      }
    } else {
      this.existingTranslations = {};
    }
  }

  // Erkennt deutsche Texte in Strings
  isGermanText(text) {
    if (!text || typeof text !== 'string' || text.length < 3) {
      return false;
    }

    // Skippt URLs, Pfade, und technische Strings
    if (
      text.match(
        /^(https?:\/\/|\/|\.\/|\.\.\/|[a-zA-Z0-9_-]+\.[a-zA-Z]{2,}|[A-Z_]{2,}|[a-z]+\.[a-z]+)/
      ) ||
      text.match(/^[A-Z][a-z]*$/) || // Einzelne Wörter in PascalCase
      text.match(/^[a-z]+[A-Z][a-zA-Z]*$/) || // camelCase
      text.match(/^[A-Z_]+$/) || // SCREAMING_SNAKE_CASE
      text.match(/^\d+$/) || // Nur Zahlen
      text.match(/^[a-zA-Z0-9_-]+$/) // Nur alphanumerisch mit Bindestrichen/Unterstrichen
    ) {
      return false;
    }

    // CSS-Klassen und Tailwind-Klassen ausschließen (erweitert)
    if (
      text.match(
        /^(bg-|text-|font-|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|w-|h-|max-w-|max-h-|min-w-|min-h-|flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|top-|bottom-|left-|right-|z-|opacity-|shadow-|border-|rounded-|hover:|focus:|active:|dark:|sm:|md:|lg:|xl:|2xl:|space-y-|space-x-|gap-|list-|cursor-|select-|transform|transition|duration-|ease-|delay-|animate-|object-|overflow-|whitespace-|break-|leading-|tracking-|align-|justify-|items-|content-|self-|order-|grow|shrink|basis-|inset-|container|sr-only|not-sr-only|pointer-events-|resize|select-|appearance-|outline-|ring-|divide-|placeholder-|caret-|accent-|decoration-|underline-|overline|line-through|no-underline|uppercase|lowercase|capitalize|normal-case|truncate|text-ellipsis|text-clip|hyphens-|writing-|orientation-|columns-|break-before-|break-after-|break-inside-|scroll-|snap-|touch-|will-change-|content-)/
      )
    ) {
      return false;
    }

    // Kombinierte CSS-Klassen (mehrere Klassen in einem String)
    if (
      text.match(/^[a-zA-Z0-9\-\s]+$/) &&
      text.match(
        /\b(bg-|text-|font-|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|mt-|mb-|ml-|mr-|w-|h-|max-w-|max-h-|min-w-|min-h-|flex|grid|block|inline|hidden|absolute|relative|fixed|sticky|top-|bottom-|left-|right-|z-|opacity-|shadow-|border-|rounded-|hover:|focus:|active:|dark:|sm:|md:|lg:|xl:|2xl:|space-y-|space-x-|gap-|list-|cursor-|select-|transform|transition|duration-|ease-|delay-|animate-|object-|overflow-|whitespace-|break-|leading-|tracking-|align-|justify-|items-|content-|self-|order-|grow|shrink|basis-|inset-|container|sr-only|not-sr-only|pointer-events-|resize|select-|appearance-|outline-|ring-|divide-|placeholder-|caret-|accent-|decoration-|underline-|overline|line-through|no-underline|uppercase|lowercase|capitalize|normal-case|truncate|text-ellipsis|text-clip|hyphens-|writing-|orientation-|columns-|break-before-|break-after-|break-inside-|scroll-|snap-|touch-|will-change-|content-)\b/
      )
    ) {
      return false;
    }

    // CSS-Eigenschaften und -Werte ausschließen
    if (
      text.match(
        /^(color:|background|margin|padding|width|height|display|position|flex|grid|#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(|\d+px|\d+rem|\d+em|\d+%|\d+vh|\d+vw)/
      )
    ) {
      return false;
    }

    // Technische Imports und Pfade ausschließen
    if (
      text.match(
        /^(@\/|\.\/|\.\.\/|import|export|from|require|module|exports|React|useState|useEffect|useContext|Component|Props|Interface|Type|Enum|Class|Function|const|let|var|return|throw|try|catch|finally|async|await|Promise|Array|Object|String|Number|Boolean|null|undefined|true|false)/
      )
    ) {
      return false;
    }

    // Sehr kurze technische Strings ausschließen
    if (text.length < 10 && text.match(/^[a-zA-Z0-9\-_\s]+$/)) {
      return false;
    }

    // Reine Zahlen, Hex-Codes, und technische Identifier ausschließen
    if (
      text.match(
        /^(\d+|\d+\.\d+|#[0-9a-fA-F]+|[a-zA-Z]+\d+|[A-Z]{2,}[a-z]*|[a-z]+[A-Z]+[a-z]*[A-Z]*)$/
      )
    ) {
      return false;
    }

    // Deutsche Umlaute und ß (starker Indikator für deutschen Text)
    if (text.match(/[äöüßÄÖÜ]/)) {
      // Aber nur wenn es kein technischer String ist
      if (!text.match(/^[a-zA-Z0-9äöüßÄÖÜ_-]+$/) && text.length > 5) {
        return true;
      }
    }

    // Nur längere Texte mit deutschen Wörtern berücksichtigen (mindestens 15 Zeichen)
    if (text.length < 15) {
      return false;
    }

    // Deutsche Wörter (häufige deutsche Wörter) - nur in längeren Texten
    const germanWords =
      /\b(und|oder|mit|für|nach|bei|von|zu|auf|über|unter|zwischen|während|wegen|trotz|seit|bis|durch|ohne|gegen|um|an|in|der|die|das|den|dem|des|ein|eine|einem|einen|einer|eines|ist|sind|war|waren|wird|werden|wurde|wurden|hat|haben|hatte|hatten|sein|seine|seiner|seine|seines|ihr|ihre|ihrer|ihres|sich|nicht|kein|keine|keiner|keines|alle|alles|allen|aller|jeder|jede|jedes|jeden|jedem|dieser|diese|dieses|diesem|diesen|kann|können|könnte|könnten|soll|sollen|sollte|sollten|will|wollen|wollte|wollten|muss|müssen|musste|mussten|darf|dürfen|durfte|durften|mehr|viel|viele|vielen|vieler|wenig|wenige|weniger|groß|große|großen|großer|großes|klein|kleine|kleinen|kleiner|kleines|neu|neue|neuen|neuer|neues|alt|alte|alten|alter|altes|gut|gute|guten|guter|gutes|schlecht|schlechte|schlechten|schlechter|schlechtes|lang|lange|langen|langer|langes|kurz|kurze|kurzen|kurzer|kurzes|hoch|hohe|hohen|hoher|hohes|niedrig|niedrige|niedrigen|niedriger|niedriges|schnell|schnelle|schnellen|schneller|schnelles|langsam|langsame|langsamen|langsamer|langsames|heute|gestern|morgen|jetzt|hier|dort|wo|wann|wie|was|wer|warum|weshalb|wieso|ja|nein|doch|aber|sondern|jedoch|denn|weil|da|obwohl|wenn|als|während|nachdem|bevor|sobald|damit|sodass|dass|ob|falls|bitte|danke|hallo|tschüss|guten|tag|morgen|abend|nacht|herr|frau|kind|kinder|mann|männer|frau|frauen|leute|menschen|haus|häuser|auto|autos|geld|arbeit|zeit|jahr|jahre|tag|tage|woche|wochen|monat|monate|stunde|stunden|minute|minuten|willkommen|anmelden|registrieren|passwort|email|adresse|telefon|bestellung|service|dienstleistung|unternehmen|kunde|kunden|anbieter|profil|einstellungen|suchen|finden|auswählen|bestellen|bezahlen|kontakt|impressum|datenschutz|agb|hilfe|support|frage|antwort|bewertung|empfehlung|qualität|preis|kosten|kostenlos|gratis|verfügbar|buchung|termin|datum|uhrzeit|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)/i;

    // Mindestens 2 deutsche Wörter in einem längeren Text
    const matches = text.match(germanWords);
    if (matches && matches.length >= 2) {
      return true;
    }

    // Deutsche Satzstrukturen und Endungen - nur in längeren Texten mit Satzzeichen
    if (text.match(/[.!?,:;]/) && text.length > 20) {
      const germanPatterns =
        /\b(ung|keit|heit|schaft|lich|isch|bar|los|voll|reich|arm|frei|bereit|fertig|möglich|unmöglich|notwendig|wichtig|richtig|falsch|einfach|schwer|leicht|schwierig|interessant|langweilig|schön|hässlich|sauber|schmutzig|warm|kalt|heiß|kühl|trocken|nass|feucht|hell|dunkel|laut|leise|ruhig|unruhig|glücklich|traurig|fröhlich|ernst|freundlich|unfreundlich|höflich|unhöflich|pünktlich|unpünktlich|gesund|krank|müde|wach|hungrig|satt|durstig|zufrieden|unzufrieden|stolz|beschämt|nervös|entspannt|aufgeregt|gelangweilt|überrascht|verwirrt|sicher|unsicher|gefährlich|ungefährlich|möglich|unmöglich|wahrscheinlich|unwahrscheinlich|nützlich|nutzlos|hilfreich|schädlich|kostbar|wertlos|teuer|billig|kostenlos|umsonst|gratis|bezahlt|unbezahlt)\b/i;

      if (germanPatterns.test(text)) {
        return true;
      }
    }

    return false;
  }

  // Generiert einen eindeutigen Schlüssel für einen deutschen Text
  generateTranslationKey(text, filePath) {
    // Bereinige den Text für den Schlüssel
    const cleanText = text
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '') // Entferne Sonderzeichen
      .replace(/\s+/g, ' ') // Normalisiere Leerzeichen
      .trim();

    // Erstelle einen Hash-ähnlichen Schlüssel
    const words = cleanText.split(' ').slice(0, 3); // Erste 3 Wörter
    const baseKey = words
      .join('_')
      .toLowerCase()
      .replace(/[äöüß]/g, match => {
        const map = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
        return map[match] || match;
      });

    // Füge Datei-Info hinzu
    const relativePath = path.relative(path.join(__dirname, '..', 'src'), filePath);
    const pathParts = relativePath.split(path.sep);
    const folderKey = pathParts
      .slice(0, -1)
      .join('_')
      .replace(/[^a-zA-Z0-9]/g, '');
    const fileName = path.basename(filePath, path.extname(filePath));
    const fileKey = fileName.replace(/[^a-zA-Z0-9]/g, '');

    return `src_${folderKey}_${fileKey}_${baseKey}`.substring(0, 50);
  }

  // Scannt eine Datei nach deutschen Texten
  async scanFileForGermanTexts(filePath) {
    this.stats.filesScanned++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);

      // Verschiedene String-Patterns extrahieren
      const patterns = [
        // Doppelte Anführungszeichen
        /"([^"]{3,})"/g,
        // Einfache Anführungszeichen
        /'([^']{3,})'/g,
        // Template Strings
        /`([^`]{3,})`/g,
        // JSX Text (zwischen Tags)
        />([^<>{]{3,})</g,
        // Kommentare
        /\/\*([^*]{3,})\*\//g,
        /\/\/\s*([^\n]{3,})/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const text = match[1].trim();
          if (this.isGermanText(text)) {
            const key = this.generateTranslationKey(text, filePath);
            this.germanTexts.set(key, {
              text: text,
              filePath: relativePath,
              key: key,
            });
            this.stats.foundGermanTexts++;
            console.log(`🔍 Gefunden: "${text.substring(0, 50)}..." in ${relativePath}`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Fehler beim Scannen von ${filePath}: ${error.message}`);
      this.stats.errors++;
    }
  }

  // Rekursiv alle Dateien in einem Ordner finden
  getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        arrayOfFiles = this.getAllFiles(filePath, arrayOfFiles);
      } else if (file.match(/\.(tsx?|jsx?)$/)) {
        arrayOfFiles.push(filePath);
      }
    });

    return arrayOfFiles;
  }

  // Scannt den kompletten SRC-Ordner
  async scanSrcFolder() {
    console.log('🔍 Scanne kompletten SRC-Ordner nach deutschen Texten...');

    const srcPath = path.join(__dirname, '..', 'src');
    if (!fs.existsSync(srcPath)) {
      console.log('❌ SRC-Ordner nicht gefunden');
      return;
    }

    // Finde alle relevanten Dateien
    const files = this.getAllFiles(srcPath);

    console.log(`📁 Gefundene Dateien: ${files.length}`);

    for (const file of files) {
      await this.scanFileForGermanTexts(file);
    }

    console.log(
      `✅ Scanning abgeschlossen: ${this.stats.foundGermanTexts} deutsche Texte in ${this.stats.filesScanned} Dateien gefunden`
    );
    console.log('');
  }

  // Übersetzt deutschen Text ins Englische mit Gemini
  async translateToEnglish(text, key) {
    if (!this.gemini || !text || typeof text !== 'string' || text.length < 3) {
      return null;
    }

    try {
      this.stats.apiCalls++;

      const prompt = `Übersetze diesen deutschen Text ins Englische für eine Web-App:

"${text}"

Regeln: Natürlich, professionell, benutzerfreundlich. Nur die englische Übersetzung zurückgeben.

Übersetzung:`;

      const result = await this.gemini.generateContent(prompt);
      const response = await result.response;
      const translation = response.text().trim();

      // Validierung der Antwort
      if (!translation || translation.length < 3) {
        console.log(`⚠️ Gemini Übersetzung zu kurz für: ${text.substring(0, 50)}...`);
        return null;
      }

      // Prüfe ob es tatsächlich eine Übersetzung ist
      if (translation === text) {
        console.log(`ℹ️ Gemini: Keine Übersetzung für: ${text.substring(0, 50)}...`);
        return null;
      }

      console.log(
        `✅ Übersetzt: "${text.substring(0, 40)}..." → "${translation.substring(0, 40)}..."`
      );
      this.stats.translations++;

      // Fortschrittsanzeige alle 3 Übersetzungen für besseren Überblick
      if (this.stats.translations % 3 === 0) {
        console.log(
          `📊 Fortschritt: ${this.stats.translations} Übersetzungen, ${this.stats.apiCalls} API-Aufrufe`
        );
      }

      // Optimierte Verzögerung zwischen API-Aufrufen
      await new Promise(resolve => setTimeout(resolve, this.delayBetweenCalls));

      return translation;
    } catch (error) {
      this.stats.errors++;
      if (error.message?.includes('rate') || error.message?.includes('quota')) {
        console.log(`⚠️ Gemini Rate Limit: ${error.message}`);
        // Sehr kurze adaptive Pause bei Rate Limits
        const waitTime = Math.min(15000, this.stats.errors * 5000); // Max 15 Sekunden
        console.log(`⏳ Warte ${waitTime / 1000} Sekunden...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.log(`❌ Gemini Fehler für "${text.substring(0, 30)}...": ${error.message}`);
      }
      return null;
    }
  }

  // Verarbeitet alle gefundenen deutschen Texte
  async processGermanTexts() {
    if (this.germanTexts.size === 0) {
      console.log('ℹ️ Keine deutschen Texte gefunden');
      return;
    }

    console.log(`🔄 Verarbeite ${this.germanTexts.size} deutsche Texte...`);
    console.log('⚡ Optimiert für maximale Geschwindigkeit!');
    console.log('');

    const textsToProcess = Array.from(this.germanTexts.entries()).filter(([key, textData]) => {
      // Prüfe ob bereits eine Übersetzung existiert
      if (this.keyExistsInTranslations(key)) {
        console.log(`⏭️ Überspringe "${textData.text.substring(0, 40)}..." (bereits übersetzt)`);
        return false;
      }
      return true;
    });

    console.log(`🎯 ${textsToProcess.length} neue Texte zu übersetzen`);
    console.log('');

    // Verarbeite in kleineren Batches für bessere Performance
    for (let i = 0; i < textsToProcess.length; i += this.batchSize) {
      const batch = textsToProcess.slice(i, i + this.batchSize);

      console.log(
        `📦 Batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(textsToProcess.length / this.batchSize)} (${batch.length} Texte)`
      );

      // Verarbeite Batch sequenziell (aber schneller)
      for (const [_key, textData] of batch) {
        const translation = await this.translateToEnglish(textData.text, textData.key);
        if (translation) {
          this.addTranslationToFile(textData.key, translation, textData);
        }
      }

      // Kurze Pause zwischen Batches
      if (i + this.batchSize < textsToProcess.length) {
        console.log('⏸️ Kurze Pause zwischen Batches...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Nur 1 Sekunde
      }
    }
  }

  // Prüft ob ein Schlüssel bereits in den Übersetzungen existiert
  keyExistsInTranslations(key) {
    return this.hasNestedProperty(this.existingTranslations, key);
  }

  // Hilfsfunktion um nested Properties zu prüfen
  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined;
    }, obj);
  }

  // Fügt eine Übersetzung zur Datei hinzu
  addTranslationToFile(key, translation, _textData) {
    // Erstelle nested Object basierend auf Dateipfad
    const keyParts = key.split('_');
    const section = keyParts[0] === 'src' ? 'SrcTexts' : 'General';

    if (!this.existingTranslations[section]) {
      this.existingTranslations[section] = {};
    }

    // Füge die Übersetzung hinzu
    this.existingTranslations[section][key] = translation;

    console.log(`💾 Gespeichert: ${key} → "${translation.substring(0, 40)}..."`);
  }

  // Speichert die Übersetzungen in die en.json Datei
  async saveTranslations() {
    const filePath = path.join(__dirname, '..', 'messages', 'en.json');

    try {
      // Backup erstellen
      const timestamp = Date.now();
      const backupPath = `${filePath}.backup.src-scan.${timestamp}`;
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`💾 Backup erstellt: ${path.basename(backupPath)}`);
      }

      // Speichern
      const newContent = JSON.stringify(this.existingTranslations, null, 2);
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Übersetzungen in ${path.basename(filePath)} gespeichert`);
    } catch (error) {
      console.log('❌ Fehler beim Speichern der Übersetzungen:', error.message);
      this.stats.errors++;
    }
  }

  async processFile() {
    console.log('🔍 Starte komplette SRC-Ordner Analyse...');
    console.log('');

    // 1. Scanne SRC-Ordner nach deutschen Texten
    await this.scanSrcFolder();

    // 2. Verarbeite gefundene deutsche Texte
    await this.processGermanTexts();

    // 3. Speichere Übersetzungen
    await this.saveTranslations();

    this.showResults();
  }

  showResults() {
    console.log('');
    console.log('🎯 KOMPLETTER SRC-ORDNER SCAN ERGEBNISSE');
    console.log('==========================================');
    console.log(`📁 Gescannte Dateien: ${this.stats.filesScanned}`);
    console.log(`🔍 Gefundene deutsche Texte: ${this.stats.foundGermanTexts}`);
    console.log(`🌐 Neue Übersetzungen: ${this.stats.translations}`);
    console.log(`📞 Gemini API-Aufrufe: ${this.stats.apiCalls}`);
    console.log(`⚠️ Fehler: ${this.stats.errors}`);

    const translationRate =
      this.stats.foundGermanTexts > 0
        ? ((this.stats.translations / this.stats.foundGermanTexts) * 100).toFixed(1)
        : '0.0';
    console.log(`📈 Übersetzungsrate: ${translationRate}%`);

    const qualityScore = Math.min(
      100,
      Math.max(
        0,
        this.stats.translations * 5 +
          (this.stats.errors === 0 ? 20 : Math.max(0, 20 - this.stats.errors * 2))
      )
    );
    console.log(`🏆 Qualitätsscore: ${qualityScore}/100`);
    console.log('==========================================');
    console.log('');

    if (this.stats.translations > 0) {
      console.log('✅ Deutsche Texte aus dem SRC-Ordner erfolgreich ins Englische übersetzt!');
      console.log('📋 Übersetzungen wurden in messages/en.json gespeichert');
      console.log('💡 Nächste Schritte:');
      console.log('   1. Prüfe die Übersetzungen in der en.json');
      console.log('   2. Ersetze die deutschen Texte in den Dateien durch t("key")');
      console.log('   3. Teste die Anwendung in beiden Sprachen');
    } else {
      console.log('ℹ️ Keine deutschen Texte übersetzt.');
      console.log('💡 Mögliche Gründe:');
      console.log('   - Alle Texte bereits übersetzt');
      console.log('   - Keine deutschen Texte gefunden');
      console.log('   - Rate Limits verhindern Übersetzungen');
    }

    if (this.stats.foundGermanTexts > 0) {
      console.log('');
      console.log('📝 GEFUNDENE DEUTSCHE TEXTE:');
      let count = 0;
      for (const [key, textData] of this.germanTexts) {
        if (count >= 10) {
          console.log(`   ... und ${this.germanTexts.size - count} weitere`);
          break;
        }
        console.log(`   ${key}: "${textData.text.substring(0, 50)}..." (${textData.filePath})`);
        count++;
      }
    }
  }

  async run() {
    await this.initialize();
    await this.processFile();
  }
}

// Ausführung
if (require.main === module) {
  const tool = new GeminiOnlyTranslationTool();
  tool.run().catch(console.error);
}

module.exports = GeminiOnlyTranslationTool;
