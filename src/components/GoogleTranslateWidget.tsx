'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Erweitere das Window-Objekt für Google Translate
declare global {
    interface Window {
        googleTranslateElementInit?: () => void;
    }
}

// Spezifische Typen für Google Translate
interface GoogleTranslateAPI {
    translate: {
        TranslateElement: {
            new(options: any, elementId: string): any;
            InlineLayout: {
                SIMPLE: any;
            };
        };
    };
}

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
    const [currentLanguage, setCurrentLanguage] = useState('de');

    useEffect(() => {
        // Google Translate Script laden (mit verbesserter Fehlerbehandlung)
        if (!document.querySelector('#google-translate-script')) {
            const script = document.createElement('script');
            script.id = 'google-translate-script';
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            script.async = true;
            script.defer = true;

            // Fehlerbehandlung hinzufügen
            script.onerror = () => {
                console.warn('Google Translate konnte nicht geladen werden');
            };

            document.head.appendChild(script);
        }

        // Initialisierungsfunktion (verbessert)
        window.googleTranslateElementInit = function () {
            try {
                const googleTranslate = (window as any).google as GoogleTranslateAPI;
                if (googleTranslate && googleTranslate.translate) {
                    new googleTranslate.translate.TranslateElement({
                        pageLanguage: 'de',
                        includedLanguages: 'de,en,fr,es,it,pl,tr,ar,ru,zh',
                        layout: googleTranslate.translate.TranslateElement.InlineLayout.SIMPLE,
                        autoDisplay: false,
                        multilanguagePage: true
                    }, 'google_translate_element');
                }
            } catch (error) {
                console.warn('Google Translate Initialisierung fehlgeschlagen:', error);
            }
        };

        // Initialisierung aufrufen wenn Google bereits geladen ist
        const googleTranslate = (window as any).google as GoogleTranslateAPI;
        if (googleTranslate && googleTranslate.translate) {
            window.googleTranslateElementInit();
        }

        return () => {
            // Cleanup - optional property löschen
            if (window.googleTranslateElementInit) {
                window.googleTranslateElementInit = undefined;
            }
        };
    }, []); // Leere dependency array - lädt nur einmal

    const handleLanguageChange = (langCode: string) => {
        setCurrentLanguage(langCode);

        // Alle Sprachen über Google Translate
        setTimeout(() => {
            try {
                const googleSelect = document.querySelector('.goog-te-combo') as HTMLSelectElement;
                if (googleSelect) {
                    googleSelect.value = langCode;
                    googleSelect.dispatchEvent(new Event('change'));
                }
            } catch (error) {
                console.warn('Google Translate Aktivierung fehlgeschlagen:', error);
            }
        }, 200);
    };

    const getCurrentLanguage = () => {
        const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);
        return currentLang ? currentLang.flag : '🇩🇪';
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                        <span className="text-lg">{getCurrentLanguage()}</span>
                        <span className="sr-only">Toggle language</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {availableLanguages.map((lang) => (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                        >
                            {lang.flag} {lang.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Google Translate Element (versteckt) */}
            <div id="google_translate_element" style={{ display: 'none' }}></div>

            <style jsx global>{`
        /* Google Translate Banner verstecken */
        .goog-te-banner-frame {
          display: none !important;
        }
        
        /* Body-Top-Margin von Google Translate entfernen */
        body {
          top: 0 !important;
        }
        
        /* Google Translate Bar verstecken */
        .goog-te-ftab {
          display: none !important;
        }
        
        /* Übersetzungsicons verstecken */
        .goog-te-gadget-icon {
          display: none !important;
        }
        
        /* Pfeil-Symbol verstecken */
        .goog-te-gadget-simple .goog-te-menu-value span:first-child {
          display: none !important;
        }
      `}</style>
        </>
    );
}
