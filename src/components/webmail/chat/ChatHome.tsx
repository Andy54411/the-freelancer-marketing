'use client';

import { useState } from 'react';
import { 
  MessageSquare,
  Users,
  Bot,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface ChatHomeProps {
  userName?: string;
  onStartChat?: () => void;
  onSearchSpaces?: () => void;
  onDiscoverApps?: () => void;
}

// Illustrationen als SVG-Komponenten (vereinfacht, basierend auf Google Chat Design)
const ChatIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hintergrund */}
    <rect x="40" y="20" width="120" height="90" rx="12" fill="#E8F5E9" />
    {/* Person 1 */}
    <circle cx="70" cy="55" r="18" fill="#81C784" />
    <circle cx="70" cy="50" r="8" fill="#fff" />
    <ellipse cx="70" cy="68" rx="12" ry="6" fill="#fff" />
    {/* Chat-Blase */}
    <rect x="95" y="35" width="55" height="30" rx="8" fill="#fff" />
    <circle cx="107" cy="50" r="3" fill="#81C784" />
    <circle cx="120" cy="50" r="3" fill="#81C784" />
    <circle cx="133" cy="50" r="3" fill="#81C784" />
    {/* Person 2 silhouette */}
    <circle cx="150" cy="85" r="12" fill="#A5D6A7" />
    <ellipse cx="150" cy="105" rx="14" ry="8" fill="#A5D6A7" />
  </svg>
);

const SpacesIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hintergrund */}
    <rect x="30" y="20" width="140" height="100" rx="12" fill="#E3F2FD" />
    {/* Dokument/Projekt Board */}
    <rect x="50" y="35" width="100" height="70" rx="6" fill="#fff" />
    {/* Grid Lines */}
    <rect x="58" y="45" width="35" height="20" rx="3" fill="#90CAF9" />
    <rect x="100" y="45" width="40" height="20" rx="3" fill="#64B5F6" />
    <rect x="58" y="72" width="82" height="8" rx="2" fill="#E3F2FD" />
    <rect x="58" y="85" width="60" height="8" rx="2" fill="#E3F2FD" />
    {/* Menschen-Icons */}
    <circle cx="55" cy="120" r="10" fill="#42A5F5" />
    <circle cx="80" cy="120" r="10" fill="#64B5F6" />
    <circle cx="105" cy="120" r="10" fill="#90CAF9" />
  </svg>
);

const AppsIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hintergrund */}
    <rect x="35" y="20" width="130" height="100" rx="12" fill="#FFF3E0" />
    {/* Gear/Settings */}
    <circle cx="70" cy="55" r="20" fill="#FFB74D" />
    <circle cx="70" cy="55" r="10" fill="#fff" />
    {/* Rechteck-Block */}
    <rect x="100" y="40" width="50" height="35" rx="4" fill="#FFA726" />
    <rect x="108" y="48" width="34" height="4" rx="2" fill="#fff" />
    <rect x="108" y="56" width="25" height="4" rx="2" fill="#fff" />
    <rect x="108" y="64" width="30" height="4" rx="2" fill="#fff" />
    {/* Bot Icon unten */}
    <rect x="70" y="85" width="60" height="25" rx="6" fill="#FFE0B2" />
    <circle cx="85" cy="97" r="5" fill="#FF9800" />
    <circle cx="115" cy="97" r="5" fill="#FF9800" />
  </svg>
);

export function ChatHome({ 
  userName = 'Benutzer',
  onStartChat,
  onSearchSpaces,
  onDiscoverApps,
}: ChatHomeProps) {
  const { isDark } = useWebmailTheme();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [conversationType, setConversationType] = useState<'all' | 'direct' | 'spaces'>('all');

  // Aktionskarten
  const actionCards = [
    {
      id: 'chat',
      title: 'Chat starten',
      description: 'Eine Nachricht an einen Kollegen oder Freund senden',
      illustration: ChatIllustration,
      bgColor: isDark ? 'bg-[#2d3a2d]' : 'bg-green-50',
      onClick: onStartChat,
    },
    {
      id: 'spaces',
      title: 'In Gruppenbereichen suchen',
      description: 'In Teams oder Gruppen an Projekten arbeiten',
      illustration: SpacesIllustration,
      bgColor: isDark ? 'bg-[#2a3441]' : 'bg-blue-50',
      onClick: onSearchSpaces,
    },
    {
      id: 'apps',
      title: 'Apps entdecken',
      description: 'Tools für die Optimierung Ihrer Workflows',
      illustration: AppsIllustration,
      bgColor: isDark ? 'bg-[#3d3428]' : 'bg-orange-50',
      onClick: onDiscoverApps,
    },
  ];

  return (
    <div className={cn(
      "flex-1 flex flex-col h-full overflow-hidden",
      isDark ? "bg-[#202124]" : "bg-white"
    )}>
      {/* Header mit Tabs */}
      <div className={cn(
        "flex items-center gap-4 px-6 py-3 border-b",
        isDark ? "border-white/10" : "border-gray-200"
      )}>
        {/* Übersicht Tab */}
        <button
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-full transition-colors",
            activeTab === 'all'
              ? isDark ? "bg-[#394457] text-[#8ab4f8]" : "bg-teal-100 text-teal-700"
              : isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-600 hover:bg-gray-100"
          )}
          onClick={() => setActiveTab('all')}
        >
          Übersicht
        </button>

        {/* Ungelesen Tab */}
        <button
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-full transition-colors",
            activeTab === 'unread'
              ? isDark ? "bg-[#394457] text-[#8ab4f8]" : "bg-teal-100 text-teal-700"
              : isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-600 hover:bg-gray-100"
          )}
          onClick={() => setActiveTab('unread')}
        >
          Ungelesen
        </button>

        <div className="flex-1" />

        {/* Unterhaltungstyp Filter */}
        <div className="flex items-center gap-2">
          <select
            value={conversationType}
            onChange={(e) => setConversationType(e.target.value as 'all' | 'direct' | 'spaces')}
            className={cn(
              "text-sm px-3 py-1.5 rounded-lg border appearance-none cursor-pointer",
              isDark 
                ? "bg-[#3c4043] border-[#5f6368] text-white" 
                : "bg-white border-gray-300 text-gray-700",
              "focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            )}
          >
            <option value="all">Unterhaltung</option>
            <option value="direct">Direktnachrichten</option>
            <option value="spaces">Gruppenbereiche</option>
          </select>
        </div>
      </div>

      {/* Hauptinhalt - Willkommensbereich */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Willkommenstitel */}
          <div className="text-center mb-12">
            <h1 className={cn(
              "text-3xl font-normal mb-3",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Willkommen, <span className="font-medium">{userName}</span>
            </h1>
            <p className={cn(
              "text-lg",
              isDark ? "text-gray-400" : "text-gray-600"
            )}>
              Achtung. Fertig. Chatten! Legen wir los!
            </p>
          </div>

          {/* Aktionskarten */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {actionCards.map((card) => {
              const Illustration = card.illustration;
              return (
                <button
                  key={card.id}
                  onClick={card.onClick}
                  className={cn(
                    "group flex flex-col rounded-2xl overflow-hidden transition-all duration-200",
                    "hover:shadow-lg hover:-translate-y-1",
                    isDark 
                      ? "bg-[#292a2d] hover:bg-[#35363a]" 
                      : "bg-white border border-gray-200 hover:border-gray-300"
                  )}
                >
                  {/* Illustration */}
                  <div className={cn(
                    "p-6 pb-4 flex items-center justify-center",
                    card.bgColor
                  )}>
                    <Illustration className="w-full h-32 object-contain" />
                  </div>
                  
                  {/* Text Content */}
                  <div className="p-5 text-left">
                    <h3 className={cn(
                      "text-base font-medium mb-2 flex items-center gap-2",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {card.id === 'chat' && <MessageSquare className="h-5 w-5 text-green-500" />}
                      {card.id === 'spaces' && <Users className="h-5 w-5 text-blue-500" />}
                      {card.id === 'apps' && <Bot className="h-5 w-5 text-orange-500" />}
                      {card.title}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}>
                      {card.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Download Links */}
          <div className={cn(
            "text-center pt-8 border-t",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <p className={cn(
              "text-sm mb-4",
              isDark ? "text-gray-400" : "text-gray-600"
            )}>
              Chatten Sie auch unterwegs
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {/* Play Store */}
              <a
                href="https://play.google.com/store/apps/details?id=com.google.android.apps.dynamite"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  isDark 
                    ? "border-[#5f6368] hover:bg-white/5 text-white" 
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                )}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <span className="text-sm font-medium">Play Store</span>
                <ExternalLink className="h-4 w-4 opacity-50" />
              </a>

              {/* App Store */}
              <a
                href="https://apps.apple.com/app/google-chat/id1163852619"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  isDark 
                    ? "border-[#5f6368] hover:bg-white/5 text-white" 
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                )}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-sm font-medium">App Store</span>
                <ExternalLink className="h-4 w-4 opacity-50" />
              </a>

              {/* Web-App */}
              <a
                href="https://chat.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  isDark 
                    ? "border-[#5f6368] hover:bg-white/5 text-white" 
                    : "border-gray-300 hover:bg-gray-50 text-gray-700"
                )}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm font-medium">Web-App verwenden</span>
                <ExternalLink className="h-4 w-4 opacity-50" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
