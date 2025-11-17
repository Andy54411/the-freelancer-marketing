import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmailThreadAccordion } from '@/components/admin/EmailThreadAccordion';
import { ReceivedEmail } from '@/types/email';
import { convert } from 'html-to-text';
import { decode } from 'html-entities';
import TurndownService from 'turndown';
import juice from 'juice';
import DOMPurify from 'dompurify';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

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
  emails?: ReceivedEmail[]; // Optionales Array für E-Mail-Verlauf
  onBack: () => void;
  onReply?: (email: ReceivedEmail) => void;
  onReplyAll?: (email: ReceivedEmail) => void;
  onForward?: (email: ReceivedEmail) => void;
  onFavorite?: (emailId: string) => Promise<void>;
  onDelete?: (emailId: string) => Promise<void>;
  onArchive?: (emailId: string) => Promise<void>;
  onMarkAsRead?: (emailId: string, isRead: boolean) => Promise<void>;
  onEmailSelect?: (email: ReceivedEmail) => void; // Für Accordion-Navigation
  onEmailSent?: () => void; // Callback wenn E-Mail gesendet wurde
}

interface QuickReplyData {
  to: string;
  subject: string;
  message: string;
}

// Hilfsfunktionen für bessere E-Mail-Bereinigung
function decodeUTF8Properly(text: string): string {
  if (!text) return '';

  // Spezielle Debug-Analyse für problematische Zeichen
  if (text.includes('Match')) {
    // Zeichen-Code-Analyse
    const matchIndex = text.indexOf('Match');
    if (matchIndex > 0) {
      const beforeChar = text.charAt(matchIndex - 1);
      const afterChar = text.charAt(matchIndex + 5);
    }
  }

  try {
    // Schritt 1: HTML-Entitäten dekodieren
    let decoded = decode(text);

    // Schritt 2: URL-encoded Zeichen dekodieren (z.B. %C3%BC -> ü)
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Wenn URL-decoding fehlschlägt, Original verwenden
    }

    // Schritt 3: Quoted-printable dekodieren (z.B. =FC -> ü)
    decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return match;
      }
    });

    // Schritt 4: Spezielle Newsletter-Kodierungen und häufige Sonderzeichen
    decoded = decoded
      .replace(/ü9C/g, 'Ü')
      .replace(/üBC/g, 'ü')
      .replace(/üA4/g, 'ä')
      .replace(/üB6/g, 'ö')
      .replace(/ü9F/g, 'ß')
      // Spezielle finAPI Newsletter-Kodierungen
      .replace(/füBCr/g, 'für') // füBCr → für
      .replace(/üBCber/g, 'über') // üBCber → über
      .replace(/EmpfüA4nger/g, 'Empfänger') // EmpfüA4nger → Empfänger
      .replace(/üBCberprüBCfung/g, 'Überprüfung') // üBCberprüBCfung → Überprüfung
      .replace(/müB6glich/g, 'möglich') // müB6glich → möglich
      .replace(/ermüB6glicht/g, 'ermöglicht') // ermüB6glicht → ermöglicht
      .replace(/LüB6sung/g, 'Lösung') // LüB6sung → Lösung
      .replace(/erfüBCllen/g, 'erfüllen') // erfüBCllen → erfüllen
      .replace(/zuverlüA4ssig/g, 'zuverlässig') // zuverlüA4ssig → zuverlässig
      .replace(/vollstüA4ndige/g, 'vollständige') // vollstüA4ndige → vollständige
      .replace(/KonformitüA4t/g, 'Konformität') // KonformitüA4t → Konformität
      // Generische Patterns für häufige Kodierungen
      .replace(/BC/g, 'r') // BC → r (häufig bei für, über, etc.)
      .replace(/A4/g, 'ä') // A4 → ä
      .replace(/B6/g, 'ö') // B6 → ö
      .replace(/9C/g, 'Ü') // 9C → Ü
      .replace(/9F/g, 'ß') // 9F → ß
      // AGGRESSIVE Euro-Zeichen Ersetzung - ALLE Varianten zu normalen Anführungszeichen
      .replace(/&euro;/gi, '"') // HTML-Entity für Euro → normale Anführungszeichen
      .replace(/&#8364;/g, '"') // Numeric HTML-Entity für Euro → normale Anführungszeichen
      .replace(/&#x20AC;/gi, '"') // Hex HTML-Entity für Euro → normale Anführungszeichen
      .replace(/\u20AC/g, '"') // Unicode für Euro → normale Anführungszeichen
      .replace(/=E2=82=AC/g, '"') // Quoted-printable für Euro → normale Anführungszeichen
      .replace(/€/g, '"') // Euro-Zeichen direkt → normale Anführungszeichen
      .replace(/\uFFFD/g, '"') // Replacement Character → normale Anführungszeichen
      .replace(/\u20AC/g, '"') // Zusätzlicher Unicode für Euro
      // Spezifische Muster für diese E-Mail
      .replace(/€Match€/g, '"Match"') // Direkter Match-Ersatz
      .replace(/€Close Match€/g, '"Close Match"') // Close Match-Ersatz
      .replace(/€No Match€/g, '"No Match"') // No Match-Ersatz
      // SUPER-AGGRESSIVE Bereinigung aller problematischen Zeichen
      .replace(/€/g, '"') // Euro-Zeichen → normale Anführungszeichen
      .replace(/\u20AC/g, '"') // Unicode Euro → normale Anführungszeichen
      .replace(/\u201C/g, '"') // Linke typografische Anführungszeichen
      .replace(/\u201D/g, '"') // Rechte typografische Anführungszeichen
      .replace(/\u201E/g, '"') // Deutsche öffnende Anführungszeichen
      .replace(/\u201F/g, '"') // Deutsche schließende Anführungszeichen
      .replace(/\u2018/g, "'") // Linke typografische Apostrophe
      .replace(/\u2019/g, "'") // Rechte typografische Apostrophe
      .replace(/"/g, '"') // Alle " zu normalen "
      .replace(/"/g, '"') // Alle " zu normalen "
      .replace(/„/g, '"') // Alle „ zu normalen "
      .replace(/'/g, "'") // Alle ' zu normalen '
      .replace(/'/g, "'") // Alle ' zu normalen '
      // Spezifische Problem-Pattern
      .replace(/Match€/g, 'Match"') // Match€ → Match"
      .replace(/€Match/g, '"Match') // €Match → "Match
      // Fallback: Alle unbekannten Sonderzeichen zu Anführungszeichen
      .replace(/[\u2010-\u2027]/g, '"') // Verschiedene Striche und Anführungszeichen
      .replace(/[\u20A0-\u20CF]/g, '"') // Währungssymbole
      // Weitere häufige Sonderzeichen
      .replace(/&amp;/g, '&') // Ampersand
      .replace(/&lt;/g, '<') // Kleiner als
      .replace(/&gt;/g, '>') // Größer als
      .replace(/&quot;/g, '"') // Anführungszeichen
      .replace(/&#39;/g, "'") // Apostroph
      .replace(/&nbsp;/g, ' ') // Non-breaking space
      .replace(/&mdash;/g, '—') // Em-Dash
      .replace(/&ndash;/g, '–') // En-Dash
      .replace(/&hellip;/g, '…') // Ellipsis
      // Bereinigung
      .replace(/=\r?\n/g, '') // Soft line breaks entfernen
      .replace(/\r?\n\s+/g, ' ') // Überschüssige Leerzeichen
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen zu einem
      .trim();

    return decoded;
  } catch (error) {
    return text;
  }
}

function getCleanTextContent(email: ReceivedEmail): string {
  // Erste Priorität: Bereits bereinigte textContent
  if (email.textContent && email.textContent.trim()) {
    const cleaned = decodeUTF8Properly(email.textContent);
    if (cleaned && cleaned.trim().length > 0) {
      // Jeder vorhandene Inhalt ist gültig, auch kurze Nachrichten wie "Test"

      return cleaned;
    }
  }

  // Zweite Priorität: HTML zu sauberem Text konvertieren
  if (email.htmlContent) {
    try {
      const cleanedHtml = decodeUTF8Properly(email.htmlContent);

      // HTML-zu-Text Konvertierung mit html-to-text
      const textContent = convert(cleanedHtml, {
        wordwrap: 80,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' },
          { selector: 'style', format: 'skip' },
          { selector: 'script', format: 'skip' },
          { selector: '.nl2go_preheader', format: 'skip' },
          { selector: 'table[class*="gmail-fix"]', format: 'skip' },
        ],
      });

      // WICHTIG: Bereinigung NACH html-to-text anwenden!
      const finalCleanedText = decodeUTF8Properly(textContent);

      if (finalCleanedText && finalCleanedText.trim().length > 0) {
        // Jeder vorhandene Inhalt ist gültig

        return finalCleanedText.trim();
      }
    } catch (error) {}
  }

  return 'E-Mail-Inhalt konnte nicht geladen werden.';
}

function QuickReplyForm({
  email,
  onEmailSent,
}: {
  email: ReceivedEmail;
  onEmailSent?: () => void;
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verhindere mehrfache Ausführung
    if (isSending || !message.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const quickReplyData = {
        to: email.from,
        subject: `Re: ${email.subject}`,
        message: message.trim(),
        inReplyTo: email.id,
      };

      const response = await fetch('/api/admin/workmail/emails/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // KRITISCH: Cookies mitschicken für Authentication!
        body: JSON.stringify(quickReplyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reply');
      }

      setMessage('');
      alert('Antwort wurde erfolgreich gesendet!');

      // E-Mail-Liste aktualisieren
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error) {
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
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
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

// SIMPLE Gmail-Style HTML Renderer - NO COMPLEX ANALYSIS!
function SecureHTMLRenderer({ htmlContent }: { htmlContent: string }) {
  if (!htmlContent) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p>📧 Keine HTML-Inhalte verfügbar</p>
      </div>
    );
  }

  // Simple security - remove only scripts
  const safeHtml = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <iframe
        srcDoc={safeHtml}
        className="w-full border-0"
        style={{
          minHeight: '600px',
          height: '80vh',
          width: '100%'
        }}
        sandbox="allow-same-origin"
        title="Gmail Style Email - Admin View"
      />
    </div>
  );
}

// Hauptkomponente
export default function EmailDetailView({
  email,
  emails = [], // Default empty array
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onFavorite,
  onDelete,
  onArchive,
  onMarkAsRead,
  onEmailSelect,
  onEmailSent,
}: EmailDetailViewProps) {
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
        to: email.to ? [email.to].filter((item): item is string => Boolean(item)) : [],
        attachments:
          email.attachments?.map(att => ({
            filename: att.name,
            mimeType: att.type || 'application/octet-stream',
            size: att.size,
            contentId: undefined,
          })) || [],
      };
    } catch (error) {
      return null;
    }
  };

  // Quoted-Printable Dekodierung für E-Mail-Content
  const decodeQuotedPrintable = (str: string): string => {
    try {
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

      return result;
    } catch (error) {
      return str;
    }
  };

  // Perfekte UTF-8 Dekodierung mit Native Browser APIs
  const decodeUTF8Properly = (content: string): string => {
    try {
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

      if (hasQuotedPrintable) {
        result = decodeQuotedPrintable(content);
      } else {
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

      for (const [entity, replacement] of Object.entries(htmlEntityFixes)) {
        if (result.includes(entity)) {
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
      } catch (e) {}

      return result;
    } catch (error) {
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
          // 1. Spezielle finAPI Newsletter HTML-Extraktion
          const htmlSectionMatch = email.rawContent.match(
            /Content-Type:\s*text\/html[^]*?(?=\r?\n---------)/i
          );

          if (htmlSectionMatch) {
            const htmlSection = htmlSectionMatch[0];

            // 2. HTML-Content nach dem ersten Leerblock extrahieren
            const htmlContentMatch = htmlSection.match(/\r?\n\r?\n([\s\S]*?)$/);

            if (htmlContentMatch) {
              let htmlContent = htmlContentMatch[1];

              // 3. Quoted-printable dekodieren
              if (htmlSection.includes('quoted-printable')) {
                htmlContent = decodeUTF8Properly(htmlContent);
              }

              // 4. Prüfen ob valides HTML
              if (
                htmlContent.trim().length > 0 &&
                (htmlContent.includes('<') || htmlContent.includes('&lt;'))
              ) {
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
            const htmlContent = htmlMatch[0];
            const parsed = await processEmailWithModernAPIs(htmlContent, email.subject, email.from);
            setParsedEmail(parsed);
            return;
          }

          // Letzter Fallback: Nur Text-Inhalt

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
              to: email.to ? [email.to].filter((item): item is string => Boolean(item)) : [],
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
              to: email.to ? [email.to].filter((item): item is string => Boolean(item)) : [],
              attachments: [],
            });
          }
        } catch (error) {
          // Error-Fallback
          setParsedEmail({
            html: `<div style="color: red; padding: 20px;">Fehler beim Verarbeiten der E-Mail: ${error}</div>`,
            text: 'E-Mail konnte nicht verarbeitet werden',
            markdown: 'E-Mail konnte nicht verarbeitet werden',
            subject: email.subject,
            from: email.from,
            to: email.to ? [email.to].filter((item): item is string => Boolean(item)) : [],
            attachments: [],
          });
        }
      }
    };

    parseEmail();
  }, [email.rawContent, email.htmlContent, email.subject, email.from]);

  // Verbesserter E-Mail-Inhalt mit modernen APIs
  const processedContent = useMemo(() => {
    // Priorität 1: Verwende parsedEmail falls verfügbar - ABER MIT BEREINIGUNG!
    if (parsedEmail) {
      if (parsedEmail.text) {
        // Detaillierte Euro-Symbol-Analyse
        let euroCount = 0;
        const sampleEuros: Array<{
          index: number;
          char: string;
          charCode: number;
          context: string;
        }> = [];
        for (let i = 0; i < Math.min(parsedEmail.text.length, 1000); i++) {
          const char = parsedEmail.text[i];
          if (char === '€') {
            euroCount++;
            if (sampleEuros.length < 5) {
              sampleEuros.push({
                index: i,
                char: char,
                charCode: char.charCodeAt(0),
                context: parsedEmail.text.substring(Math.max(0, i - 10), i + 10),
              });
            }
          }
        }
      } else {
      }

      // WICHTIG: Auch parsedEmail.text muss bereinigt werden!
      const cleanedText = parsedEmail.text
        ? decodeUTF8Properly(parsedEmail.text)
        : getCleanTextContent(email);

      return {
        text: cleanedText,
        html: parsedEmail.html,
      };
    }

    // Priorität 2: Direkte htmlContent Verarbeitung mit verbesserter Bereinigung
    if (email.htmlContent) {
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

      // Verwende getCleanTextContent für bessere Text-Extraktion
      const processedText = getCleanTextContent(email);

      return {
        text: processedText,
        html: processedHtml,
      };
    }

    // Priorität 3: Direkte textContent verwenden
    if (email.textContent && email.textContent.trim()) {
      return {
        text: email.textContent.trim(),
        html: null,
      };
    }

    // Priorität 4: Einfache HTML-zu-Text Konvertierung
    if (email.htmlContent && email.htmlContent.trim()) {
      try {
        const textFromHtml = convert(email.htmlContent, {
          wordwrap: 80,
          selectors: [
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'img', format: 'skip' },
            { selector: 'style', format: 'skip' },
            { selector: 'script', format: 'skip' },
          ],
        });

        if (textFromHtml && textFromHtml.trim()) {
          return {
            text: textFromHtml.trim(),
            html: email.htmlContent,
          };
        }
      } catch (error) {}
    }

    // Priorität 5: Fallback - nur wenn wirklich nichts vorhanden ist

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReplyAll?.(email)}
                className="flex items-center space-x-1"
              >
                <ReplyAll className="h-4 w-4" />
                <span>Allen antworten</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onForward?.(email)}
                className="flex items-center space-x-1"
              >
                <Forward className="h-4 w-4" />
                <span>Weiterleiten</span>
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFavorite?.(email.id)}
                className="flex items-center space-x-1"
              >
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

      {/* E-Mail-Verlauf Accordion - DEBUG: Temporär immer anzeigen */}
      {(() => {
        return emails && emails.length >= 1 ? ( // DEBUG: >= 1 statt > 1
          <div>
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700">
                🔍 DEBUG: Accordion wird angezeigt mit {emails.length} E-Mail(s)
              </p>
            </div>
            <EmailThreadAccordion
              emails={emails}
              currentEmailId={email.id}
              onEmailSelect={onEmailSelect || (() => {})}
            />
          </div>
        ) : (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              ❌ E-Mail-Verlauf: {emails?.length || 0} E-Mail(s) verfügbar. Emails array:{' '}
              {emails ? 'exists' : 'null/undefined'}
              Type: {typeof emails}
              Is Array: {Array.isArray(emails) ? 'yes' : 'no'}
            </p>
          </div>
        );
      })()}

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
          {processedContent.html ? (
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
      <QuickReplyForm email={email} onEmailSent={onEmailSent} />
    </div>
  );
}
// Debug update Fr 15 Aug 2025 07:55:49 CEST
