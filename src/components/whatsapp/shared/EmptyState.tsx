/**
 * EmptyState Component
 * 
 * Leerer Zustand mit Icon und Nachricht
 */
'use client';

import React from 'react';
import { 
  MessageSquare, 
  Users, 
  FileText, 
  Inbox, 
  Search, 
  Settings, 
  Zap,
  Phone,
  Image,
  LucideIcon
} from 'lucide-react';

type EmptyStateType = 
  | 'messages' 
  | 'conversations' 
  | 'templates' 
  | 'contacts' 
  | 'search' 
  | 'settings' 
  | 'automation'
  | 'media'
  | 'connection'
  | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const PRESETS: Record<Exclude<EmptyStateType, 'custom'>, { 
  icon: LucideIcon; 
  title: string; 
  description: string; 
}> = {
  messages: {
    icon: MessageSquare,
    title: 'Keine Nachrichten',
    description: 'Starten Sie eine Konversation, indem Sie eine Nachricht senden.',
  },
  conversations: {
    icon: Inbox,
    title: 'Keine Konversationen',
    description: 'Es gibt noch keine WhatsApp-Konversationen.',
  },
  templates: {
    icon: FileText,
    title: 'Keine Vorlagen',
    description: 'Erstellen Sie Ihre erste Nachrichtenvorlage.',
  },
  contacts: {
    icon: Users,
    title: 'Keine Kontakte',
    description: 'Fügen Sie Kontakte hinzu, um Nachrichten zu senden.',
  },
  search: {
    icon: Search,
    title: 'Keine Ergebnisse',
    description: 'Für Ihre Suche wurden keine Ergebnisse gefunden.',
  },
  settings: {
    icon: Settings,
    title: 'Keine Einstellungen',
    description: 'Konfigurieren Sie hier Ihre WhatsApp-Einstellungen.',
  },
  automation: {
    icon: Zap,
    title: 'Keine Automatisierungen',
    description: 'Erstellen Sie automatische Antworten und Trigger.',
  },
  media: {
    icon: Image,
    title: 'Keine Medien',
    description: 'Es wurden noch keine Medien geteilt.',
  },
  connection: {
    icon: Phone,
    title: 'Nicht verbunden',
    description: 'Verbinden Sie Ihren WhatsApp Business Account.',
  },
};

export function EmptyState({ 
  type = 'custom', 
  title, 
  description, 
  icon: CustomIcon,
  action,
  className = ''
}: EmptyStateProps) {
  const preset = type !== 'custom' ? PRESETS[type] : null;
  const Icon = CustomIcon || preset?.icon || MessageSquare;
  const displayTitle = title || preset?.title || 'Keine Daten';
  const displayDescription = description || preset?.description || '';

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {displayTitle}
      </h3>
      
      {displayDescription && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          {displayDescription}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Variante für Inline-Verwendung
export function InlineEmptyState({ 
  message = 'Keine Daten verfügbar',
  className = ''
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={`text-center py-8 text-gray-500 ${className}`}>
      <p>{message}</p>
    </div>
  );
}

// Variante für Fehler-Zustand
export function ErrorState({ 
  title = 'Ein Fehler ist aufgetreten',
  description,
  onRetry,
  className = ''
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">
          {description}
        </p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
