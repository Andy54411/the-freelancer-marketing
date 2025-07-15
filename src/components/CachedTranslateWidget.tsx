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

// Lade lokale Übersetzungen aus public/translations
async function loadLocalTranslations(sourceLanguage: string, targetLanguage: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`/translations/${sourceLanguage}-${targetLanguage}.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Fehler beim Laden der lokalen Übersetzungen:', error);
  }
  return {};
}

export default function CachedTranslateWidget() {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedLanguage') || 'de';
    }
    return 'de';
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [localTranslations, setLocalTranslations] = useState<Record<string, string>>({});

  // Lade lokale Übersetzungen beim Start
  useEffect(() => {
    if (currentLanguage !== 'de') {
      loadLocalTranslations('de', currentLanguage).then(setLocalTranslations);
    }
  }, [currentLanguage]);

  // Automatische Übersetzung beim Laden der Seite
  useEffect(() => {
    if (currentLanguage !== 'de' && typeof window !== 'undefined') {
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
      window.location.reload();
      return;
    }

    setIsTranslating(true);
    
    try {
      // Sammle alle Textknoten
      const textNodesToTranslate: { node: Text, originalText: string }[] = [];
      
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Text) => {
            const parent = node.parentElement;
            
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
            
            if (text && text.length > 1 && 
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
                !/^\d+$/.test(text) &&
                !/^[\d\s,.:;!?]+$/.test(text)) {
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

      console.log(`Gefundene Texte: ${textNodesToTranslate.length}`);

      // 1. Erst lokale Übersetzungen anwenden
      let localHits = 0;
      const textsForAPI: { node: Text, originalText: string }[] = [];

      textNodesToTranslate.forEach(({ node, originalText }) => {
        let translated = false;
        
        // Exakte Übereinstimmung prüfen
        if (localTranslations[originalText]) {
          node.textContent = localTranslations[originalText];
          localHits++;
          translated = true;
        } else {
          // Prüfe auf Teilübereinstimmungen und wende aggressive Ersetzung an
          let text = originalText;
          
          // Aggressive Ersetzung für häufige Begriffe
          const aggressiveReplacements = [
            { from: /\bDienstleister\b/g, to: 'Service providers' },
            { from: /\bKundenbewertung\b/g, to: 'Customer rating' },
            { from: /\bAnbieter\b/g, to: 'Providers' },
            { from: /\bHandwerker\b/g, to: 'Craftsmen' },
            { from: /\bReparaturen\b/g, to: 'Repairs' },
            { from: /\bprofessionelle\b/gi, to: 'Professional' },
            { from: /\bfür alle\b/gi, to: 'for all' },
            { from: /\bbeliebtesten\b/gi, to: 'most popular' },
            { from: /\bDienstleistungen\b/g, to: 'Services' },
            { from: /(\d+[\+\s]*)(Dienstleister)/g, to: '$1Service providers' },
            { from: /(\d+[\+\s]*)(Anbieter)/g, to: '$1Providers' },
            { from: /(\d+[\+\s]*)(Handwerker)/g, to: '$1Craftsmen' }
          ];
          
          aggressiveReplacements.forEach(({ from, to }) => {
            if (from.test(text)) {
              text = text.replace(from, to);
              translated = true;
            }
          });
          
          if (translated) {
            node.textContent = text;
            localHits++;
          }
        }
        
        if (!translated) {
          textsForAPI.push({ node, originalText });
        }
      });

      console.log(`Lokale Treffer: ${localHits}/${textNodesToTranslate.length}`);
      console.log(`Für API: ${textsForAPI.length}`);

      // 2. Dann API für verbleibende Texte
      if (textsForAPI.length === 0) {
        console.log('Alle Texte wurden lokal übersetzt!');
        setIsTranslating(false);
        return;
      }

      // Übersetze in Batches
      const batchSize = 10;
      for (let i = 0; i < textsForAPI.length; i += batchSize) {
        const batch = textsForAPI.slice(i, i + batchSize);
        
        console.log(`Übersetze Batch ${Math.floor(i/batchSize) + 1}:`, batch.map(item => item.originalText));
        
        const response = await fetch('/api/translate-with-cache', {
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
          const { translations, localHits: apiLocalHits, apiCalls } = await response.json();
          
          console.log(`API Response - Lokale Treffer: ${apiLocalHits}, API Aufrufe: ${apiCalls}`);
          
          // Wende Übersetzungen an
          translations.forEach((translation: string, index: number) => {
            const item = batch[index];
            if (item && item.node && item.node.textContent === item.originalText) {
              item.node.textContent = translation;
            }
          });

          // Aktualisiere lokale Übersetzungen
          const newLocalTranslations = { ...localTranslations };
          batch.forEach(({ originalText }, index) => {
            newLocalTranslations[originalText] = translations[index];
          });
          setLocalTranslations(newLocalTranslations);
        } else {
          console.error('Übersetzung fehlgeschlagen für Batch:', batch.map(item => item.originalText));
        }
      }

      // 3. Finale aggressive Ersetzung für verbleibende deutsche Begriffe
      const finalAggressiveReplacements = [
        { from: /\bDienstleister\b/g, to: 'Service providers' },
        { from: /\bKundenbewertung\b/g, to: 'Customer rating' },
        { from: /\bAnbieter\b/g, to: 'Providers' },
        { from: /\bHandwerker\b/g, to: 'Craftsmen' },
        { from: /\bReparaturen\b/g, to: 'Repairs' },
        { from: /\bprofessionelle\b/gi, to: 'Professional' },
        { from: /\bfür alle\b/gi, to: 'for all' },
        { from: /\bbeliebtesten\b/gi, to: 'most popular' },
        { from: /\bDienstleistungen\b/g, to: 'Services' },
        { from: /(\d+[\+\s]*)(Dienstleister)/g, to: '$1Service providers' },
        { from: /(\d+[\+\s]*)(Anbieter)/g, to: '$1Providers' },
        { from: /(\d+[\+\s]*)(Handwerker)/g, to: '$1Craftsmen' }
      ];

      // Führe finale Ersetzung durch
      let finalReplacements = 0;
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
            
            finalAggressiveReplacements.forEach(({ from, to }) => {
              text = text.replace(from, to);
            });
            
            if (text !== originalText) {
              textNode.textContent = text;
              finalReplacements++;
            }
          }
        }
      });

      if (finalReplacements > 0) {
        console.log(`Finale aggressive Ersetzungen: ${finalReplacements}`);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    
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
