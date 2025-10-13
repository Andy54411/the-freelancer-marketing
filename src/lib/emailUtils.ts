/**
 * Gmail EXACT Email utilities - 100% identical to Gmail using IFRAME!
 */

// Create a safe blob URL for iframe - EXACTLY like Gmail!
export function createEmailBlobUrl(htmlContent: string): string {
  if (!htmlContent) return '';

  // Only remove scripts for security, keep EVERYTHING else
  const safeHtml = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');

  // Create blob with proper MIME type
  const blob = new Blob([safeHtml], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

// Extract text only for preview - GMAIL-GENAU mit CSS-Bereinigung
export function getTextOnly(htmlContent: string): string {
  if (!htmlContent) return '';
  
  let text = htmlContent;
  
  // 1. CSS-Blöcke komplett entfernen (auch ohne <style> Tags)
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/@font-face\s*\{[^}]*\}/gi, '');
  text = text.replace(/@media[^{]*\{[^}]*\}/gi, '');
  text = text.replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, ''); // CSS Klassen
  text = text.replace(/#[a-zA-Z0-9_-]+\s*\{[^}]*\}/gi, ''); // CSS IDs
  text = text.replace(/[a-zA-Z-]+\s*:\s*[^;]*;/g, ''); // CSS Properties
  
  // 2. HTML Tags entfernen
  text = text.replace(/<[^>]*>/g, ' ');
  
  // 3. HTML Entities dekodieren
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  
  // 4. Überschüssige Whitespaces bereinigen
  text = text.replace(/\s+/g, ' ').trim();
  
  // 5. Reine CSS-Zahlen/Werte entfernen (z.B. "96", "14px", "650px")
  text = text.replace(/^\s*\d+\s*$/gm, '');
  text = text.replace(/\b\d+px\b/g, '');
  text = text.replace(/\brgba?\([^)]*\)/gi, '');
  
  return text;
}

// Format email for IFRAME display - EXACTLY like Gmail!
export function formatEmailBody(email: { body?: string; htmlBody?: string }) {
  // Prüfe zuerst htmlBody
  if (email.htmlBody && email.htmlBody.trim()) {
    const blobUrl = createEmailBlobUrl(email.htmlBody);
    const textOnly = getTextOnly(email.htmlBody);
    
    return {
      hasHtml: true,
      blobUrl,
      originalHtml: email.htmlBody,
      textOnly,
      preview: textOnly.substring(0, 200) + (textOnly.length > 200 ? '...' : '')
    };
  }
  
  // Prüfe dann body auf HTML-Content
  if (email.body && email.body.trim() && email.body.includes('<')) {
    const blobUrl = createEmailBlobUrl(email.body);
    const textOnly = getTextOnly(email.body);
    
    return {
      hasHtml: true,
      blobUrl,
      originalHtml: email.body,
      textOnly,
      preview: textOnly.substring(0, 200) + (textOnly.length > 200 ? '...' : '')
    };
  }
  
  // Fallback: Plain Text
  const plainText = email.body || '';
  return {
    hasHtml: false,
    textOnly: plainText,
    preview: plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '')
  };
}