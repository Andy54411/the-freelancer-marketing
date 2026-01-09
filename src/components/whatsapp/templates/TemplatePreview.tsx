/**
 * TemplatePreview Component
 * 
 * Vorschau einer Vorlage vor dem Senden
 */
'use client';

import React from 'react';
import { Image as ImageIcon, FileText, Video, MapPin, Phone, ExternalLink } from 'lucide-react';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface TemplatePreviewProps {
  name: string;
  components: TemplateComponent[];
  variables?: Record<string, string>;
  className?: string;
}

export function TemplatePreview({ name, components, variables = {}, className = '' }: TemplatePreviewProps) {
  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `[${key}]`);
    });
    return result;
  };

  const header = components.find(c => c.type === 'HEADER');
  const body = components.find(c => c.type === 'BODY');
  const footer = components.find(c => c.type === 'FOOTER');
  const buttons = components.find(c => c.type === 'BUTTONS');

  const renderHeaderIcon = () => {
    switch (header?.format) {
      case 'IMAGE':
        return <ImageIcon className="w-8 h-8 text-gray-400" />;
      case 'VIDEO':
        return <Video className="w-8 h-8 text-gray-400" />;
      case 'DOCUMENT':
        return <FileText className="w-8 h-8 text-gray-400" />;
      case 'LOCATION':
        return <MapPin className="w-8 h-8 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-sm ${className}`}>
      {/* WhatsApp-Style Message Bubble */}
      <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none shadow-sm overflow-hidden">
        {/* Header */}
        {header && (
          <div className="border-b border-green-200">
            {header.format && header.format !== 'TEXT' ? (
              <div className="h-32 bg-gray-100 flex items-center justify-center">
                {renderHeaderIcon()}
              </div>
            ) : header.text ? (
              <p className="px-3 py-2 font-bold text-gray-900">
                {replaceVariables(header.text)}
              </p>
            ) : null}
          </div>
        )}

        {/* Body */}
        {body?.text && (
          <p className="px-3 py-2 text-gray-800 whitespace-pre-wrap text-sm">
            {replaceVariables(body.text)}
          </p>
        )}

        {/* Footer */}
        {footer?.text && (
          <p className="px-3 pb-2 text-xs text-gray-500">
            {replaceVariables(footer.text)}
          </p>
        )}

        {/* Timestamp */}
        <div className="px-3 pb-2 flex justify-end">
          <span className="text-[10px] text-gray-500">
            {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Buttons */}
      {buttons?.buttons && buttons.buttons.length > 0 && (
        <div className="mt-1 space-y-1">
          {buttons.buttons.map((btn, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-sm px-3 py-2 text-center text-sm text-[#14ad9f] flex items-center justify-center gap-2"
            >
              {btn.type === 'PHONE_NUMBER' && <Phone className="w-4 h-4" />}
              {btn.type === 'URL' && <ExternalLink className="w-4 h-4" />}
              {btn.text}
            </div>
          ))}
        </div>
      )}

      {/* Template Name */}
      <p className="mt-2 text-xs text-gray-400 text-center">
        Vorlage: {name}
      </p>
    </div>
  );
}
