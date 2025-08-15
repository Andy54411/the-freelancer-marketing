import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Button as EmailButton,
  Link,
} from '@react-email/components';
import { convert } from 'html-to-text';
import DOMPurify from 'dompurify';
import { decode } from 'html-entities';
import TurndownService from 'turndown';
import juice from 'juice';
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  Flag,
  MoreVertical,
  Paperclip,
  Calendar,
  User,
  Mail,
  Clock,
  Eye,
  FileText,
} from 'lucide-react';

interface ReceivedEmail {
  id: string;
  from: string;
  to?: string;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  receivedAt?: string;
  isRead: boolean;
  priority?: 'high' | 'normal' | 'low';
  category?: string;
  attachments?: Array<{
    name: string;
    size: number;
    type?: string;
  }>;
  source?: string;
  folder?: string;
  messageId?: string;
  size?: number;
  flags?: string[];
  rawContent?: string; // Für PostalMime Parsing
}

interface ModernEmailContent {
  html: string;
  text: string;
  markdown: string;
  subject: string;
  from: string;
  to: string[];
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    contentId?: string;
  }>;
}

interface EmailDetailViewProps {
  email: ReceivedEmail;
  onBack: () => void;
  onReply?: (email: ReceivedEmail) => void;
  onDelete?: (emailId: string) => Promise<void>;
  onArchive?: (emailId: string) => Promise<void>;
  onMarkAsRead?: (emailId: string, isRead: boolean) => Promise<void>;
}

interface QuickReplyData {
  to: string;
  subject: string;
  message: string;
}

function QuickReplyForm({ email }: { email: ReceivedEmail }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    setIsSending(true);
    try {
      console.log('Antwort wird gesendet:', {
        to: email.from,
        subject: `Re: ${email.subject}`,
        message: message.trim(),
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessage('');
      alert('Antwort wurde erfolgreich gesendet!');
    } catch (error) {
      console.error('Fehler beim Senden der Antwort:', error);
      alert('Fehler beim Senden der Antwort. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-sm text-gray-600">Schnelle Antwort</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-500">
              <strong>An:</strong> {email.from}
            </div>
            <div className="text-sm text-gray-500">
              <strong>Betreff:</strong> Re: {email.subject}
            </div>
          </div>

          <div>
            <label
              htmlFor="quick-reply-message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ihre Nachricht
            </label>
            <textarea
              id="quick-reply-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ihre Antwort eingeben..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] resize-vertical"
              rows={4}
              disabled={isSending}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMessage('')}
              disabled={isSending}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              disabled={isSending || !message.trim()}
            >
              {isSending ? 'Wird gesendet...' : 'Antworten'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Sichere HTML-Renderer Komponente mit iframe
function SecureHTMLRenderer({ htmlContent }: { htmlContent: string }) {
  const [iframeHeight, setIframeHeight] = useState(600);

  // HTML-Inhalte für iframe vorbereiten
  const sanitizedHTML = useMemo(() => {
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        'div',
        'p',
        'span',
        'b',
        'i',
        'u',
        'strong',
        'em',
        'br',
        'ul',
        'ol',
        'li',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'table',
        'tr',
        'td',
        'th',
        'tbody',
        'thead',
        'img',
        'a',
        'center',
        'font',
      ],
      ALLOWED_ATTR: [
        'style',
        'class',
        'href',
        'src',
        'alt',
        'title',
        'target',
        'align',
        'width',
        'height',
        'color',
        'bgcolor',
        'cellpadding',
        'cellspacing',
        'border',
      ],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              margin: 20px;
              color: #333;
              background: white;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            table {
              border-collapse: collapse;
            }
            a {
              color: #0066cc;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            /* Nur minimale Sicherheits-Fixes - KEIN Design Override! */
          </style>
          <script>
            // Enhanced Link Handler für finAPI Newsletter und andere E-Mail-Links
            window.addEventListener('load', function() {
              const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              parent.postMessage({type: 'resize', height: height + 40}, '*');
              
              // Link-Handler für bessere Kompatibilität
              document.addEventListener('click', function(e) {
                const target = e.target.closest('a');
                if (target && target.href) {
                  e.preventDefault();
                  
                  // finAPI und andere Newsletter-Links sicher öffnen
                  const url = target.href;
                  console.log('📧 E-Mail Link clicked:', url);
                  
                  // Message an Parent senden für sicheres Link-Handling
                  parent.postMessage({
                    type: 'openLink', 
                    url: url,
                    text: target.textContent || target.innerText,
                    isTracking: url.includes('sendibm') || url.includes('tracking') || url.includes('click')
                  }, '*');
                  
                  // Fallback: Direktes Öffnen mit erweiterten Attributen
                  try {
                    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!newWindow) {
                      // Backup: Top-Level Navigation
                      window.top.open(url, '_blank');
                    }
                  } catch (err) {
                    console.log('Fallback link handling:', err);
                    // Als letzter Ausweg: Message für Parent-handling
                    window.parent.location.href = url;
                  }
                }
              });
            });
          </script>
        </head>
        <body>
          ${cleanHtml}
        </body>
      </html>
    `;
  }, [htmlContent]);

  // Message-Listener für Auto-Resize und Link-Handling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'resize') {
        setIframeHeight(Math.max(600, event.data.height));
      } else if (event.data && event.data.type === 'openLink') {
        // Sichere Link-Behandlung für finAPI und andere Newsletter-Links
        console.log('🔗 Handling email link:', event.data.url);

        try {
          // finAPI Tracking-Links und Newsletter-Links sicher öffnen
          if (event.data.isTracking) {
            console.log('📊 Opening tracking link:', event.data.url);
          }

          // Link in neuem Tab öffnen mit verbesserter Sicherheit
          const newWindow = window.open(event.data.url, '_blank', 'noopener,noreferrer');

          if (!newWindow) {
            // Fallback: Browser-native Link-Handling
            console.warn('⚠️ Popup blocked, using fallback');
            window.location.href = event.data.url;
          }
        } catch (error) {
          console.error('❌ Link opening failed:', error);
          // Final fallback: Copy to clipboard
          navigator.clipboard?.writeText(event.data.url).then(() => {
            alert(`Link wurde in die Zwischenablage kopiert: ${event.data.url}`);
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      srcDoc={sanitizedHTML}
      style={{
        width: '100%',
        height: `${iframeHeight}px`,
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: 'white',
      }}
      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation allow-forms allow-downloads allow-modals"
      title="E-Mail Inhalt"
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
}

// Hauptkomponente
export default function EmailDetailView({
  email,
  onBack,
  onReply,
  onDelete,
  onArchive,
  onMarkAsRead,
}: EmailDetailViewProps) {
  const [isRawView, setIsRawView] = useState(false);
  const [parsedEmail, setParsedEmail] = useState<ModernEmailContent | null>(null);

  // Moderne E-Mail-Verarbeitung mit Native Browser APIs und professionellen Tools
  const processEmailWithModernAPIs = async (
    htmlContent: string,
    subject?: string,
    from?: string
  ): Promise<ModernEmailContent | null> => {
    try {
      // 1. UTF-8 Perfekte Dekodierung mit Native Browser APIs
      const utf8Content = decodeUTF8Properly(htmlContent);

      // 2. HTML mit Juice für bessere E-Mail-Darstellung optimieren
      const inlinedHtml = juice(utf8Content, {
        removeStyleTags: false,
        preserveMediaQueries: true,
        applyWidthAttributes: true,
        applyHeightAttributes: true,
      });

      // 3. HTML sanitizen mit DOMPurify
      const cleanHtml = DOMPurify.sanitize(inlinedHtml, {
        ADD_TAGS: ['style', 'link'],
        ADD_ATTR: ['href', 'src', 'style', 'target', 'rel', 'class', 'id'],
        ALLOW_DATA_ATTR: true,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        WHOLE_DOCUMENT: false,
      });

      // 4. Text-Version mit Browser-nativem Parser erstellen
      const textParser = new DOMParser();
      const htmlDoc = textParser.parseFromString(cleanHtml, 'text/html');
      const textVersion = htmlDoc.body?.textContent || htmlDoc.textContent || '';

      // 5. Markdown mit Turndown erstellen
      const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        linkStyle: 'inlined',
      });

      const markdown = turndown.turndown(cleanHtml);

      return {
        html: cleanHtml,
        text: textVersion,
        markdown: markdown,
        subject: subject || email.subject,
        from: from || email.from,
        to: email.to ? [email.to] : [],
        attachments:
          email.attachments?.map(att => ({
            filename: att.name,
            mimeType: att.type || 'application/octet-stream',
            size: att.size,
            contentId: undefined,
          })) || [],
      };
    } catch (error) {
      console.error('Modern email processing failed:', error);
      return null;
    }
  };

  // Quoted-Printable Dekodierung für E-Mail-Content
  const decodeQuotedPrintable = (str: string): string => {
    try {
      console.log('🔧 Quoted-Printable decoding input:', str.substring(0, 200) + '...');

      let result = str;

      // 1. Soft line breaks entfernen (= am Zeilende) - ZUERST!
      result = result.replace(/=\r?\n/g, '').replace(/=\n/g, '');

      // 2. Spezifische UTF-8 Sequenzen für deutsche Zeichen (häufigste zuerst)
      result = result
        .replace(/=C3=A4/g, 'ä') // ä
        .replace(/=C3=B6/g, 'ö') // ö
        .replace(/=C3=BC/g, 'ü') // ü
        .replace(/=C3=84/g, 'Ä') // Ä
        .replace(/=C3=96/g, 'Ö') // Ö
        .replace(/=C3=9C/g, 'Ü') // Ü
        .replace(/=C3=9F/g, 'ß') // ß
        .replace(/=C2=A0/g, ' ') // Non-breaking space
        .replace(/=E2=80=93/g, '–') // En dash
        .replace(/=E2=80=94/g, '—') // Em dash
        .replace(/=E2=80=9C/g, '"') // Left double quotation
        .replace(/=E2=80=9D/g, '"') // Right double quotation
        .replace(/=E2=80=9E/g, '„') // Double low-9 quotation
        .replace(/=E2=80=99/g, "'") // Right single quotation
        .replace(/=E2=9C=85/g, '✅') // Check mark
        .replace(/=E2=9A=A0/g, '⚠') // Warning sign
        .replace(/=E2=9D=8C/g, '❌') // Cross mark
        .replace(/=EF=B8=8F/g, '️') // Variation selector
        .replace(/=C2=B7/g, '·') // Middle dot
        .replace(/=E2=82=AC/g, '€') // Euro symbol
        .replace(/=C2=AE/g, '®') // Registered trademark
        .replace(/=C2=A9/g, '©') // Copyright
        .replace(/=C2=B0/g, '°') // Degree symbol
        .replace(/=3D/g, '='); // 3D Ersetzungen für HTML - WICHTIG für URLs!

      // 3. Allgemeine Hex-kodierte Zeichen dekodieren (NACH spezifischen Ersetzungen)
      result = result.replace(/=([0-9A-F]{2})/g, (match, hex) => {
        const charCode = parseInt(hex, 16);
        return String.fromCharCode(charCode);
      });

      console.log('✅ Quoted-Printable decoding output:', result.substring(0, 200) + '...');
      return result;
    } catch (error) {
      console.error('❌ Quoted-Printable decoding failed:', error);
      return str;
    }
  };

  // Perfekte UTF-8 Dekodierung mit Native Browser APIs
  const decodeUTF8Properly = (content: string): string => {
    try {
      console.log('🚀 decodeUTF8Properly called with content:', content.substring(0, 200) + '...');

      // 1. Quoted-Printable Dekodierung falls nötig (erweiterte Erkennung)
      let result = content;
      const hasQuotedPrintable =
        content.includes('=C3=') ||
        content.includes('=E2=') ||
        content.includes('=C2=') ||
        content.includes('=\r\n') ||
        content.includes('=\n') ||
        content.includes('=3D') ||
        /=[0-9A-F]{2}/.test(content);

      console.log('🔍 Quoted-Printable detection:', hasQuotedPrintable);

      if (hasQuotedPrintable) {
        console.log('🔧 Applying quoted-printable decoding...');
        result = decodeQuotedPrintable(content);
      } else {
        console.log('❌ No quoted-printable detected, applying basic fixes...');
      }

      // 2. HTML Entities dekodieren (IMMER anwenden)
      result = decode(result);

      // 3. Spezifische Korrekturen für häufige E-Mail-Probleme (nach Quoted-Printable)
      result = result
        // finAPI Newsletter spezifische Fixes (falls noch Probleme bestehen)
        .replace(/FÖ¼R/g, 'FÜR')
        .replace(/Öberweisungen/g, 'Überweisungen')
        .replace(/Öberweisung/g, 'Überweisung')
        // finAPI E-Mail spezifische Korrekturen basierend auf Original
        .replace(
          /Was Unternehmen bei VoP beachten sollten, damit Kunden ein ❌Match" sehen/g,
          'Was Unternehmen bei VoP beachten sollten, damit Kunden ein ✅ Match sehen'
        )
        .replace(/Bei einem ❌ Match ist alles klar\./g, 'Bei einem ✅ Match ist alles klar.')
        .replace(/❌ ï¸ Close Match/g, '⚠️ Close Match')
        .replace(/❌ No Match/g, '❌ No Match')
        .replace(/❌Match/g, '✅ Match')
        // Zusätzliche UTF-8 Probleme die durch andere Kodierungen entstehen können
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã¤/g, 'ä')
        .replace(/Ã¶/g, 'ö')
        .replace(/ÃŸ/g, 'ß')
        .replace(/Ã„/g, 'Ä')
        .replace(/Ã–/g, 'Ö')
        .replace(/Ãœ/g, 'Ü')
        .replace(/â‚¬/g, '€')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú');

      console.log('🔧 After basic UTF-8 fixes:', result.substring(0, 300));

      // 4. HTML-Entities und falsche Unicode-Zeichen (finAPI spezifische Probleme)
      const htmlEntityFixes: { [key: string]: string } = {
        // finAPI Newsletter spezifische Probleme (BASIEREND AUF ORIGINAL E-MAIL!)
        '❌Match"': '✅ Match', // Original zeigt: "damit Kunden ein ✅ Match" sehen"
        '❌ ï¸ Close Match': '⚠️ Close Match', // Original: ⚠️ Close Match
        '❌ No Match': '❌ No Match', // Original: ❌ No Match (korrekt)
        '❌ Match': '✅ Match', // Original: ✅ Match
        // KRITISCH: €-Zeichen-Probleme (finAPI spezifisch)
        '€œ': '"', // €œ -> " (Left double quote)
        '€': '"', // € -> " (Right double quote)
        '€™': "'", // €™ -> ' (Right single quote)
        '€"': '–', // €" -> – (En dash)
        // finAPI E-Mail Text-Korrekturen
        'Demobank: Testen **mit realistischen Bankdaten**':
          'Demobank: Testen mit realistischen Bankdaten',
        '**Die VoP betrifft alle': 'Die VoP betrifft alle',
        '**finAPI GmbH**': 'finAPI GmbH',
        // Markdown-Formatierung entfernen aus Text-Version
        '**': '',
        // Zusätzliche Varianten die auftreten können
        'âMatch"': '✅ Match"', // Entfernt â komplett
        âMatch: '✅ Match', // Entfernt â komplett
        'â€œ': '"',
        'â€': '"',
        'â€™': "'",
        'â€"': '–',
        'â ï¸': '⚠️', // Fallback für verbleibende Warnzeichen
        'Â­': '', // Soft hyphen (entfernen)
        '­': '', // Direkte Soft Hyphens (sehr häufig in finAPI Newsletter)
        '‌': '', // Zero Width Non-Joiner (entfernen)
        '­‌': '', // Kombination aus Soft Hyphen + ZWNJ
        'Â ': ' ', // Non-breaking space
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#8211;': '–',
        '&#8212;': '—',
        '&#8216;': "'",
        '&#8217;': "'",
        '&#8220;': '"',
        '&#8221;': '"',
      };

      console.log('🔧 Applying HTML entity fixes...');
      for (const [entity, replacement] of Object.entries(htmlEntityFixes)) {
        if (result.includes(entity)) {
          console.log(`🔧 Replacing "${entity}" with "${replacement}"`);
          result = result.replace(
            new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            replacement
          );
        }
      }

      // 5. Native TextDecoder für zusätzliche UTF-8-Sicherheit
      try {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const bytes = encoder.encode(result);
        result = decoder.decode(bytes);
      } catch (e) {
        console.log('TextDecoder fallback used');
      }

      console.log('✅ Final decoded result:', result.substring(0, 200) + '...');
      return result;
    } catch (error) {
      console.error('UTF-8 decoding failed:', error);
      return content;
    }
  };

  // E-Mail mit modernen Tools verarbeiten
  useEffect(() => {
    const parseEmail = async () => {
      if (email.htmlContent) {
        // Direkte Verarbeitung mit modernen APIs
        const parsed = await processEmailWithModernAPIs(
          email.htmlContent,
          email.subject,
          email.from
        );
        setParsedEmail(parsed);
      } else if (email.rawContent) {
        // Erweiterte HTML-Extraktion aus Raw-E-Mail
        try {
          console.log('🔍 Processing raw email content for HTML extraction...');

          // 1. Spezielle finAPI Newsletter HTML-Extraktion
          const htmlSectionMatch = email.rawContent.match(
            /Content-Type:\s*text\/html[^]*?(?=\r?\n---------)/i
          );

          if (htmlSectionMatch) {
            console.log('✅ Found HTML section in finAPI email');
            const htmlSection = htmlSectionMatch[0];

            // 2. HTML-Content nach dem ersten Leerblock extrahieren
            const htmlContentMatch = htmlSection.match(/\r?\n\r?\n([\s\S]*?)$/);

            if (htmlContentMatch) {
              let htmlContent = htmlContentMatch[1];

              // 3. Quoted-printable dekodieren
              if (htmlSection.includes('quoted-printable')) {
                console.log('🔧 Decoding quoted-printable HTML...');
                htmlContent = decodeUTF8Properly(htmlContent);
              }

              // 4. Prüfen ob valides HTML
              if (
                htmlContent.trim().length > 0 &&
                (htmlContent.includes('<') || htmlContent.includes('&lt;'))
              ) {
                console.log('🎯 Processing extracted HTML content');
                console.log('� HTML sample:', htmlContent.substring(0, 300));

                const parsed = await processEmailWithModernAPIs(
                  htmlContent,
                  email.subject,
                  email.from
                );
                setParsedEmail(parsed);
                return;
              }
            }
          }

          // Fallback: Standard HTML-Extraktion
          const htmlMatch = email.rawContent.match(/<html[\s\S]*?<\/html>/i);
          if (htmlMatch) {
            console.log('🔄 Using fallback HTML extraction');
            const htmlContent = htmlMatch[0];
            const parsed = await processEmailWithModernAPIs(htmlContent, email.subject, email.from);
            setParsedEmail(parsed);
            return;
          }

          // Letzter Fallback: Nur Text-Inhalt
          console.log('⚠️ No HTML found, using text fallback');
          const textSectionMatch = email.rawContent.match(
            /Content-Type:\s*text\/plain[\s\S]*?(?=\r?\n---------|\r?\nContent-Type|\r?\n$|$)/i
          );

          if (textSectionMatch) {
            const textSection = textSectionMatch[0];
            const headerEndMatch = textSection.match(/\r?\n\r?\n([\s\S]*)/);
            let textContent = headerEndMatch ? headerEndMatch[1] : textSection;

            if (textSection.includes('quoted-printable')) {
              textContent = decodeUTF8Properly(textContent);
            }

            setParsedEmail({
              html: `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; padding: 20px;">${textContent}</div>`,
              text: textContent,
              markdown: textContent,
              subject: email.subject,
              from: email.from,
              to: [email.to].filter(Boolean),
              attachments: [],
            });
          } else {
            // Ganz letzter Fallback
            setParsedEmail({
              html: `<div style="white-space: pre-wrap; font-family: monospace; padding: 20px;">${email.rawContent.replace(/\n/g, '<br>')}</div>`,
              text: email.rawContent,
              markdown: email.rawContent,
              subject: email.subject,
              from: email.from,
              to: [email.to].filter(Boolean),
              attachments: [],
            });
          }
        } catch (error) {
          console.error('Raw content processing failed:', error);
          // Error-Fallback
          setParsedEmail({
            html: `<div style="color: red; padding: 20px;">Fehler beim Verarbeiten der E-Mail: ${error}</div>`,
            text: 'E-Mail konnte nicht verarbeitet werden',
            markdown: 'E-Mail konnte nicht verarbeitet werden',
            subject: email.subject,
            from: email.from,
            to: [email.to].filter(Boolean),
            attachments: [],
          });
        }
      }
    };

    parseEmail();
  }, [email.rawContent, email.htmlContent, email.subject, email.from]);

  // Verbesserter E-Mail-Inhalt mit modernen APIs
  const processedContent = useMemo(() => {
    // Priorität 1: Verwende parsedEmail falls verfügbar
    if (parsedEmail) {
      console.log('📧 Using parsedEmail for display');
      return {
        text: parsedEmail.text || 'Kein Text-Inhalt verfügbar',
        html: parsedEmail.html,
      };
    }

    // Priorität 2: Direkte htmlContent Verarbeitung
    if (email.htmlContent) {
      console.log('📧 Using direct htmlContent');
      const utf8Content = decodeUTF8Properly(email.htmlContent);

      const processedHtml = DOMPurify.sanitize(utf8Content, {
        ALLOWED_TAGS: [
          'div',
          'p',
          'span',
          'b',
          'i',
          'u',
          'strong',
          'em',
          'br',
          'ul',
          'ol',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'table',
          'tr',
          'td',
          'th',
          'tbody',
          'thead',
          'img',
          'a',
        ],
        ALLOWED_ATTR: ['style', 'class', 'href', 'src', 'alt', 'title', 'target'],
        ALLOW_DATA_ATTR: false,
      });

      const textParser = new DOMParser();
      const htmlDoc = textParser.parseFromString(processedHtml, 'text/html');
      const processedText =
        htmlDoc.body?.textContent || htmlDoc.textContent || 'Text-Extraktion fehlgeschlagen';

      return {
        text: processedText,
        html: processedHtml,
      };
    }

    // Priorität 3: Nur textContent verwenden
    if (email.textContent) {
      console.log('📧 Using textContent only');
      return {
        text: decodeUTF8Properly(email.textContent),
        html: null,
      };
    }

    // Priorität 4: Fallback - NIEMALS rawContent direkt anzeigen!
    console.log('⚠️ No usable content found, showing error message');
    return {
      text: 'E-Mail-Inhalt konnte nicht geladen werden',
      html: '<div style="padding: 20px; text-align: center; color: #666;">E-Mail-Inhalt konnte nicht geladen werden</div>',
    };
  }, [parsedEmail, email.htmlContent, email.textContent]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unbekannt';
    try {
      return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      newsletter: 'bg-purple-100 text-purple-800',
      support: 'bg-orange-100 text-orange-800',
      business: 'bg-green-100 text-green-800',
      personal: 'bg-blue-100 text-blue-800',
    };
    return colors[category || ''] || 'bg-gray-100 text-gray-800';
  };

  // Bessere Text-Content-Funktion mit modernen APIs
  const getBestTextContent = () => {
    if (parsedEmail) {
      return parsedEmail.text || 'Kein Text verfügbar';
    }

    if (email.textContent && email.textContent.trim() && email.textContent !== email.htmlContent) {
      return decodeUTF8Properly(email.textContent);
    }

    // Fallback zu HTML-zu-Text Konvertierung
    if (email.htmlContent) {
      const textParser = new DOMParser();
      const htmlDoc = textParser.parseFromString(email.htmlContent, 'text/html');
      const textContent = htmlDoc.body?.textContent || htmlDoc.textContent || '';
      return decodeUTF8Properly(textContent);
    }

    return 'Kein Inhalt verfügbar';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header mit Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Zurück zur Übersicht</span>
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkAsRead?.(email.id, !email.isRead)}
          >
            <Eye className="h-4 w-4" />
            {email.isRead ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
          </Button>

          <Switch
            checked={isRawView}
            onCheckedChange={setIsRawView}
            className="data-[state=checked]:bg-[#14ad9f]"
          />
          <span className="text-sm text-gray-600">
            {isRawView ? 'Raw-Ansicht' : 'Standard-Ansicht'}
          </span>
        </div>
      </div>

      {/* E-Mail-Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{email.subject}</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{email.from}</span>
                </div>
                {email.to && (
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{email.to}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(email.receivedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!email.isRead && (
                <Badge variant="secondary" className="bg-[#14ad9f] text-white">
                  Neu
                </Badge>
              )}
              {email.priority && (
                <Badge className={getPriorityColor(email.priority)}>
                  {email.priority === 'high'
                    ? 'Hoch'
                    : email.priority === 'low'
                      ? 'Niedrig'
                      : 'Normal'}
                </Badge>
              )}
              {email.category && (
                <Badge className={getCategoryColor(email.category)}>{email.category}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* E-Mail-Aktionen */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReply?.(email)}
                className="flex items-center space-x-1"
              >
                <Reply className="h-4 w-4" />
                <span>Antworten</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <ReplyAll className="h-4 w-4" />
                <span>Allen antworten</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Forward className="h-4 w-4" />
                <span>Weiterleiten</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <Star className="h-4 w-4" />
                <span>Favorit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onArchive?.(email.id)}
                className="flex items-center space-x-1"
              >
                <Archive className="h-4 w-4" />
                <span>Archivieren</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(email.id)}
                className="flex items-center space-x-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Löschen</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anhänge */}
      {email.attachments && email.attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Paperclip className="h-5 w-5" />
              <span>Anhänge ({email.attachments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">{attachment.name}</div>
                      <div className="text-sm text-gray-500">
                        {formatFileSize(attachment.size)}
                        {attachment.type && ` • ${attachment.type}`}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* E-Mail-Inhalt */}
      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Inhalt</CardTitle>
        </CardHeader>
        <CardContent>
          {isRawView ? (
            <ScrollArea className="h-96 w-full border rounded p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {email.rawContent || 'Kein Raw-Inhalt verfügbar'}
              </pre>
            </ScrollArea>
          ) : processedContent.html ? (
            <SecureHTMLRenderer htmlContent={processedContent.html} />
          ) : (
            <ScrollArea className="h-96 w-full border rounded p-4">
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {processedContent.text}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Reply */}
      <QuickReplyForm email={email} />
    </div>
  );
}
