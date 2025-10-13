'use client';

import React from 'react';

interface EmailContentViewerProps {
  htmlContent?: string;
  plainTextContent?: string;
  className?: string;
}

export function EmailContentViewer({
  htmlContent,
  plainTextContent,
  className = '',
}: EmailContentViewerProps) {
  // Bestimme Content-Typ
  const hasHtml = htmlContent && htmlContent.trim().length > 0;
  const hasText = plainTextContent && plainTextContent.trim().length > 0;

  if (!hasHtml && !hasText) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <p>📧 Keine E-Mail-Inhalte verfügbar</p>
      </div>
    );
  }

  // SICHERHEITS-ISOLATION: Nur Scripts entfernen, Styles BEHALTEN für originales Aussehen
  const sanitizeHtml = (html: string) => {
    return html.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/javascript:/gi, '');
  };

  return (
    <div className={`w-full ${className}`}>
      {hasHtml ? (
        // ORIGINAL Gmail HTML mit allen Styles - wie in Gmail!
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  margin: 0; 
                  padding: 16px;
                  font-family: Arial, sans-serif;
                  background: white;
                  color: #000;
                }
                img { max-width: 100% !important; height: auto !important; }
                table { max-width: 100% !important; }
                .gmail-quote { border-left: 1px solid #ccc; margin: 10px 0; padding-left: 10px; }
              </style>
            </head>
            <body>
              ${sanitizeHtml(htmlContent)}
            </body>
            </html>
          `}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
          title="Email Content"
        />
      ) : (
        // Plain Text Content
        <div className="p-4 w-full">
          <div className="email-text-content text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900">
            {plainTextContent}
          </div>
        </div>
      )}
    </div>
  );
}
