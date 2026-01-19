'use client';

import { useState } from 'react';
import { 
  ArrowLeft,
  Search,
  Monitor,
  ChevronDown,
  UserPlus,
  FileUp,
  Sparkles,
  Plus,
  Type,
  Smile,
  AtSign,
  Upload,
  Mic,
  Send,
  MoreHorizontal,
  CheckSquare,
  Pin,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface Space {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  createdAt: Date;
}

interface SpaceViewProps {
  space: Space;
  onBack: () => void;
  onAddMembers?: () => void;
  onShareFile?: () => void;
  onAssignTask?: () => void;
}

// Illustration Component für die Willkommensnachricht
const WelcomeIllustration = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Gelbes Quadrat */}
    <rect x="20" y="30" width="25" height="25" rx="3" fill="#FBBC04" />
    {/* Person mit Megafon */}
    <ellipse cx="100" cy="90" rx="30" ry="15" fill="#E8F5E9" />
    <circle cx="90" cy="50" r="15" fill="#34A853" />
    <path d="M90 65 L75 100 L105 100 Z" fill="#34A853" />
    {/* Megafon */}
    <path d="M105 45 L140 30 L140 70 L105 55 Z" fill="#EA4335" />
    <rect x="100" y="42" width="8" height="16" rx="2" fill="#EA4335" />
    {/* Pflanze/Blätter */}
    <path d="M160 80 Q170 60 180 80" stroke="#34A853" strokeWidth="3" fill="none" />
    <path d="M165 85 Q175 65 185 85" stroke="#34A853" strokeWidth="3" fill="none" />
    <ellipse cx="170" cy="95" rx="15" ry="8" fill="#E8F5E9" />
  </svg>
);

// Mock empfohlene Apps
const recommendedApps = [
  { id: 'translator', name: 'Abang Translator', icon: '🌐' },
  { id: 'poll', name: 'Able Poll', icon: '📊' },
  { id: 'absolute', name: 'Absolute Poll', icon: '📈' },
];

export function SpaceView({
  space,
  onBack,
  onAddMembers,
  onShareFile,
  onAssignTask,
}: SpaceViewProps) {
  const { isDark } = useWebmailTheme();
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    if (message.trim()) {
      // TODO: Implementiere Nachrichtenversand
      setMessage('');
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    }
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col h-full overflow-hidden",
      isDark ? "bg-[#202124]" : "bg-white"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 border-b shrink-0",
        isDark ? "border-white/10" : "border-gray-200"
      )}>
        {/* Zurück Button */}
        <button
          onClick={onBack}
          className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )}
        >
          <ArrowLeft className={cn("h-5 w-5", isDark ? "text-white" : "text-gray-600")} />
        </button>

        {/* Space Avatar & Name */}
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center text-lg",
            isDark ? "bg-[#3c4043]" : "bg-gray-100"
          )}>
            {space.emoji}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className={cn(
                "font-medium",
                isDark ? "text-white" : "text-gray-900"
              )}>
                {space.name}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4",
                isDark ? "text-gray-400" : "text-gray-500"
              )} />
            </div>
            <span className={cn(
              "text-xs",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              {space.memberCount} Teilnehmer
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          <button className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )}>
            <Search className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
          <button className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )}>
            <Monitor className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
        </div>

        {/* Divider */}
        <div className={cn(
          "w-px h-6 mx-2",
          isDark ? "bg-white/10" : "bg-gray-200"
        )} />

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          <button className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )} title="Dateien">
            <FileUp className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
          <button className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )} title="Aufgaben">
            <CheckSquare className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
          <button className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )} title="Mitglieder">
            <Users className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
          <button className={cn(
            "p-2 rounded-full transition-colors",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )} title="Anheften">
            <Pin className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Welcome Illustration */}
          <div className="flex justify-center mb-6">
            <WelcomeIllustration className="w-48 h-32" />
          </div>

          {/* Date Divider */}
          <div className="flex items-center justify-center mb-6">
            <span className={cn(
              "text-xs px-3 py-1 rounded-full",
              isDark ? "bg-[#3c4043] text-gray-400" : "bg-gray-100 text-gray-500"
            )}>
              {formatDate(space.createdAt)}
            </span>
          </div>

          {/* Welcome Message */}
          <div className={cn(
            "rounded-2xl p-6 mb-6",
            isDark ? "bg-[#292a2d]" : "bg-gray-50"
          )}>
            <p className={cn(
              "text-center text-lg mb-6",
              isDark ? "text-white" : "text-gray-900"
            )}>
              <span className="font-medium">{space.name}</span>, willkommen in Ihrem neuen Gruppenbereich für die Zusammenarbeit!<br />
              <span className="font-medium">Los gehts!</span>
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                onClick={onAddMembers}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors",
                  isDark 
                    ? "bg-[#394457] text-[#8ab4f8] hover:bg-[#3d4a5c]" 
                    : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                )}
              >
                <UserPlus className="h-4 w-4" />
                Mitglieder hinzufüg...
              </button>
              <button
                onClick={onShareFile}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors",
                  isDark 
                    ? "bg-[#394457] text-[#8ab4f8] hover:bg-[#3d4a5c]" 
                    : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                )}
              >
                <FileUp className="h-4 w-4" />
                Datei teil...
              </button>
              <button
                onClick={onAssignTask}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors",
                  isDark 
                    ? "bg-[#394457] text-[#8ab4f8] hover:bg-[#3d4a5c]" 
                    : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                )}
              >
                <Sparkles className="h-4 w-4" />
                Aufgaben zuweis...
              </button>
            </div>

            {/* Recommended Apps */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className={cn(
                "text-sm",
                isDark ? "text-gray-400" : "text-gray-600"
              )}>
                Empfohlene Apps für<br />Ihren Gruppenbereich
              </span>
              {recommendedApps.map((app) => (
                <button
                  key={app.id}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg transition-colors",
                    isDark ? "hover:bg-white/5" : "hover:bg-gray-100"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-xl",
                    isDark ? "bg-[#3c4043]" : "bg-white border border-gray-200"
                  )}>
                    {app.icon}
                  </div>
                  <span className={cn(
                    "text-xs text-center max-w-[70px] truncate",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    {app.name}
                  </span>
                </button>
              ))}
              <button className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                isDark ? "bg-[#3c4043] hover:bg-[#4a4d50]" : "bg-gray-100 hover:bg-gray-200"
              )}>
                <MoreHorizontal className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
            </div>
          </div>

          {/* Created Info */}
          <p className={cn(
            "text-center text-sm",
            isDark ? "text-gray-500" : "text-gray-400"
          )}>
            Sie haben diesen Gruppenbereich heute erstellt
          </p>
        </div>
      </div>

      {/* Message Input */}
      <div className={cn(
        "px-4 py-3 border-t",
        isDark ? "border-white/10" : "border-gray-200"
      )}>
        <div className={cn(
          "flex items-center gap-2 max-w-3xl mx-auto"
        )}>
          {/* Plus Button */}
          <button className={cn(
            "p-2 rounded-full transition-colors shrink-0",
            isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
          )}>
            <Plus className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
          </button>

          {/* Input Container */}
          <div className={cn(
            "flex-1 flex items-center gap-2 px-4 py-2 rounded-full border",
            isDark 
              ? "bg-[#3c4043] border-transparent" 
              : "bg-gray-50 border-gray-200"
          )}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Verlauf ist aktiviert"
              className={cn(
                "flex-1 bg-transparent text-sm outline-none",
                isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
              )}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* Input Actions */}
            <div className="flex items-center gap-1">
              <button className={cn(
                "p-1.5 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
              )} title="Formatierung">
                <Type className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
              <button className={cn(
                "p-1.5 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
              )} title="Emoji">
                <Smile className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
              <button className={cn(
                "p-1.5 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
              )} title="Erwähnen">
                <AtSign className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
              <button className={cn(
                "p-1.5 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
              )} title="Hochladen">
                <Upload className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
              <button className={cn(
                "p-1.5 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-200"
              )} title="Spracheingabe">
                <Mic className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              message.trim()
                ? isDark
                  ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                  : "bg-teal-600 text-white hover:bg-teal-700"
                : isDark
                  ? "text-gray-500"
                  : "text-gray-400"
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
