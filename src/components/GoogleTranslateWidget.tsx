'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Verfügbare Sprachen
const availableLanguages = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export default function GoogleTranslateWidget() {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    // Lade gespeicherte Sprache aus localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedLanguage') || 'de';
    }
    return 'de';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  // Automatische Übersetzung beim Laden der Seite
  useEffect(() => {
    if (currentLanguage !== 'de' && typeof window !== 'undefined') {
      // Warte kurz, damit die Seite vollständig geladen ist
      setTimeout(() => {
        translatePage(currentLanguage);
      }, 500);
    }
  }, []);

  // Observer für dynamische Inhalte
  useEffect(() => {
    if (currentLanguage === 'de') return;

    const observer = new MutationObserver((mutations) => {
      let shouldTranslate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldTranslate = true;
            }
          });
        }
      });

      if (shouldTranslate) {
        // Verzögere die Übersetzung etwas, um mehrere Änderungen zu sammeln
        setTimeout(() => {
          translatePage(currentLanguage);
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [currentLanguage]);

  // Übersetze den gesamten Seiteninhalt
  const translatePage = async (targetLanguage: string) => {
    if (targetLanguage === 'de') {
      // Zurück zur Originalsprache
      window.location.reload();
      return;
    }

    setIsTranslating(true);
    
    try {
      // Definiere spezifische deutsche Begriffe mit ihren Übersetzungen
      const germanToEnglishMap: { [key: string]: string } = {
        'Möbelmontage': 'Furniture assembly',
        'Dienstleister': 'Service providers',
        'Zufriedene Kunden': 'Satisfied customers',
        'Verifizierte Anbieter': 'Verified providers',
        'Erfolgreiche Projekte': 'Successful projects',
        'Kundenbewertung': 'Customer rating',
        'Hausbesitzer': 'Homeowners',
        'Bewertungen': 'Reviews',
        'Über uns': 'About Us',
        'Kontakt': 'Contact',
        'AGB': 'Terms and Conditions',
        'Alle Rechte vorbehalten': 'All rights reserved',
        'Dienstleister und Kunden': 'Service providers and customers',
        'E-Mail-Adresse': 'Email address',
        'Haushaltsservice': 'Household service',
        'Reinigung, Gartenarbeit und mehr': 'Cleaning, gardening and more',
        'Autos & Mobilität': 'Cars & Mobility',
        'Autoservice, Reparaturen und Wartung': 'Car service, repairs and maintenance',
        'IT & Technologie': 'IT & Technology',
        'Computer, Software und technischer Support': 'Computers, software and technical support',
        'Garten & Landschaft': 'Garden & Landscape',
        'Gartenpflege, Landschaftsgestaltung und mehr': 'Garden care, landscaping and more',
        'Renovierung': 'renovation',
        'Umbau, Renovierung und Modernisierung': 'Conversion, renovation and modernization',
        'Service': 'Service',
        'Anbieter': 'Providers',
        'Kunden': 'Customers',
        'Projekte': 'Projects',
        'Bewertung': 'Rating',
        'Aufträge': 'Orders',
        'Auftrag': 'Order',
        'Preis': 'Price',
        'Kosten': 'Cost',
        'Stunde': 'Hour',
        'Stunden': 'Hours',
        'Tag': 'Day',
        'Tage': 'Days',
        'Woche': 'Week',
        'Wochen': 'Weeks',
        'Monat': 'Month',
        'Monate': 'Months',
        'Jahr': 'Year',
        'Jahre': 'Years',
        'Verfügbar': 'Available',
        'Nicht verfügbar': 'Not available',
        'Jetzt buchen': 'Book now',
        'Buchen': 'Book',
        'Anfrage': 'Request',
        'Anfragen': 'Requests',
        'Nachricht': 'Message',
        'Nachrichten': 'Messages',
        'Profil': 'Profile',
        'Einstellungen': 'Settings',
        'Suchen': 'Search',
        'Suche': 'Search',
        'Filter': 'Filter',
        'Sortieren': 'Sort',
        'Ergebnisse': 'Results',
        'Keine Ergebnisse': 'No results',
        'Laden': 'Loading',
        'Lädt': 'Loading',
        'Speichern': 'Save',
        'Abbrechen': 'Cancel',
        'Bestätigen': 'Confirm',
        'Löschen': 'Delete',
        'Bearbeiten': 'Edit',
        'Hinzufügen': 'Add',
        'Entfernen': 'Remove',
        'Schließen': 'Close',
        'Öffnen': 'Open',
        'Weiter': 'Next',
        'Zurück': 'Back',
        'Fertig': 'Done',
        'OK': 'OK',
        'Ja': 'Yes',
        'Nein': 'No',
        'Crafts': 'Services',
        'Handwerk': 'Crafts',
        'Gewerbe': 'Services',
        '1,500+ Dienstleister': '1,500+ Service providers',
        '2,500+ Dienstleister': '2,500+ Service providers',
        '1,800+ Dienstleister': '1,800+ Service providers',
        '900+ Dienstleister': '900+ Service providers',
        '1,200+ Dienstleister': '1,200+ Service providers',
        '800+ Dienstleister': '800+ Service providers',
        '1,500+Service providers': '1,500+ Service providers',
        '2,500+Service providers': '2,500+ Service providers',
        '1,800+Service providers': '1,800+ Service providers',
        '900+Service providers': '900+ Service providers',
        '1,200+Service providers': '1,200+ Service providers',
        '800+Service providers': '800+ Service providers'
      };

      // Sammle alle Textknoten
      const textNodesToTranslate: { node: Text, originalText: string }[] = [];
      
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Text) => {
            const parent = node.parentElement;
            
            // Überspringe bestimmte Elemente
            if (!parent || 
                parent.closest('script') ||
                parent.closest('style') ||
                parent.closest('noscript') ||
                parent.closest('[data-no-translate]') ||
                parent.tagName === 'SCRIPT' ||
                parent.tagName === 'STYLE' ||
                parent.tagName === 'NOSCRIPT') {
              return NodeFilter.FILTER_REJECT;
            }

            const text = node.textContent?.trim();
            
            // Akzeptiere alle Texte - auch kürzere
            if (text && text.length > 0 && 
                text !== 'TASKILO' && 
                text !== 'Toggle language' &&
                text !== 'Toggle theme' &&
                text !== 'Icon' &&
                text !== '©' &&
                text !== '✓' &&
                text !== '‚' &&
                text !== '+' &&
                text !== '-' &&
                text !== '×' &&
                text !== '/' &&
                text !== '\\' &&
                text !== '|' &&
                text !== '€' &&
                text !== '$' &&
                text !== '%' &&
                !/^\d+$/.test(text) && // Keine reinen Zahlen
                !/^[\d\s,.:;!?]+$/.test(text) && // Keine reinen Zahlen mit Satzzeichen
                text.length > 1) { // Mindestens 2 Zeichen
              return NodeFilter.FILTER_ACCEPT;
            }

            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      let node: Text | null;
      const seenTexts = new Set<string>();
      
      while (node = walker.nextNode() as Text) {
        const text = node.textContent?.trim();
        if (text && text.length > 0 && !seenTexts.has(text)) {
          seenTexts.add(text);
          textNodesToTranslate.push({ node, originalText: text });
        }
      }

      // Erst: Direkte Ersetzung der bekannten deutschen Begriffe
      console.log('Starte direkte Übersetzung...');
      let directTranslations = 0;
      
      textNodesToTranslate.forEach(({ node, originalText }) => {
        // Prüfe exakte Übereinstimmung
        if (germanToEnglishMap[originalText]) {
          node.textContent = germanToEnglishMap[originalText];
          directTranslations++;
        }
        // Prüfe auch Teilübereinstimmungen
        else {
          Object.keys(germanToEnglishMap).forEach(germanTerm => {
            if (originalText.includes(germanTerm)) {
              const translatedText = originalText.replace(germanTerm, germanToEnglishMap[germanTerm]);
              if (translatedText !== originalText) {
                node.textContent = translatedText;
                directTranslations++;
              }
            }
          });
        }
      });
      
      console.log(`Direkte Übersetzungen: ${directTranslations}`);

      // Dann: Übersetze alle anderen Texte über die API
      const remainingTexts = textNodesToTranslate.filter(({ node, originalText }) => {
        const currentText = node.textContent || '';
        // Prüfe, ob der Text bereits übersetzt wurde
        return currentText === originalText && !germanToEnglishMap[originalText];
      });
      
      if (remainingTexts.length === 0) {
        setIsTranslating(false);
        return;
      }

      console.log(`Gefundene Texte zum Übersetzen: ${remainingTexts.length}`);
      console.log('Verbleibende Texte:', remainingTexts.map(item => item.originalText));

      // Zusätzliche aggressive Ersetzung für häufige Begriffe
      const aggressiveReplacements = [
        { from: /\bDienstleister\b/g, to: 'Service providers' },
        { from: /\bKundenbewertung\b/g, to: 'Customer rating' },
        { from: /\bAnbieter\b/g, to: 'Providers' },
        { from: /\bKunden\b/g, to: 'Customers' },
        { from: /\bProjekte\b/g, to: 'Projects' },
        { from: /\bBewertungen\b/g, to: 'Reviews' },
        { from: /\bService\b/g, to: 'Service' },
        { from: /\bHandwerker\b/g, to: 'Craftsmen' },
        { from: /\bReparaturen\b/g, to: 'Repairs' },
        { from: /\bprofessionelle\b/gi, to: 'Professional' },
        { from: /\bfür alle\b/gi, to: 'for all' },
        { from: /\bCrafts\b/g, to: 'Services' },
        { from: /\bHandwerk\b/g, to: 'Crafts' },
        { from: /\bGewerbe\b/g, to: 'Services' },
        // Spezielle Behandlung für Zahlen + Dienstleister
        { from: /(\d+[\+\s]*)(Dienstleister)/g, to: '$1Service providers' },
        { from: /(\d+[\+\s]*)(Anbieter)/g, to: '$1Providers' },
        { from: /(\d+[\+\s]*)(Handwerker)/g, to: '$1Craftsmen' }
      ];

      // Führe aggressive Ersetzung durch - mehrere Durchgänge
      let totalReplacements = 0;
      
      // Durchgang 1: Normale Ersetzung
      document.querySelectorAll('*').forEach(element => {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let textNode;
          while (textNode = walker.nextNode()) {
            let text = textNode.textContent || '';
            let originalText = text;
            
            aggressiveReplacements.forEach(({ from, to }) => {
              text = text.replace(from, to);
            });
            
            if (text !== originalText) {
              textNode.textContent = text;
              totalReplacements++;
            }
          }
        }
      });
      
      // Durchgang 2: Spezielle Behandlung für Zahlen-Text-Kombinationen
      document.querySelectorAll('*').forEach(element => {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let textNode;
          while (textNode = walker.nextNode()) {
            let text = textNode.textContent || '';
            let originalText = text;
            
            // Spezielle Regex für Zahlen + deutsche Begriffe
            const specialReplacements = [
              { from: /(\d+[\+\s]*)(Dienstleister)/g, to: '$1Service providers' },
              { from: /(\d+[\+\s]*)(Anbieter)/g, to: '$1Providers' },
              { from: /(\d+[\+\s]*)(Handwerker)/g, to: '$1Craftsmen' },
              { from: /(\d+[\+\s]*)(Kunden)/g, to: '$1Customers' },
              { from: /(\d+[\+\s]*)(Projekte)/g, to: '$1Projects' }
            ];
            
            specialReplacements.forEach(({ from, to }) => {
              text = text.replace(from, to);
            });
            
            if (text !== originalText) {
              textNode.textContent = text;
              totalReplacements++;
            }
          }
        }
      });
      
      console.log(`Aggressive Ersetzungen: ${totalReplacements}`);

      // Übersetze in Batches
      const batchSize = 10;
      for (let i = 0; i < remainingTexts.length; i += batchSize) {
        const batch = remainingTexts.slice(i, i + batchSize);
        
        console.log(`Übersetze Batch ${Math.floor(i/batchSize) + 1}:`, batch.map(item => item.originalText));
        
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            texts: batch.map(item => item.originalText),
            targetLanguage: targetLanguage,
            sourceLanguage: 'de'
          }),
        });

        if (response.ok) {
          const { translations } = await response.json();
          
          // Wende Übersetzungen auf die entsprechenden Textknoten an
          translations.forEach((translation: string, index: number) => {
            const item = batch[index];
            if (item && item.node && item.node.textContent === item.originalText) {
              item.node.textContent = translation;
            }
          });
        } else {
          console.error('Übersetzung fehlgeschlagen für Batch:', batch.map(item => item.originalText));
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    
    // Speichere die Sprache in localStorage für Persistenz
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', langCode);
    }
    
    translatePage(langCode);
  };

  const getCurrentLanguage = () => {
    const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);
    return currentLang ? currentLang.flag : '🇩🇪';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isTranslating}>
          <span className="text-lg">{getCurrentLanguage()}</span>
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map(lang => (
          <DropdownMenuItem 
            key={lang.code} 
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isTranslating}
          >
            {lang.flag} {lang.name}
            {isTranslating && currentLanguage === lang.code && ' (übersetzt...)'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
