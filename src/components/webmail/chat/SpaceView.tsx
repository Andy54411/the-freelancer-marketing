'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  CheckSquare,
  Pin,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { useE2EEncryption } from '@/hooks/useE2EEncryption';
import { EncryptedMessage } from '@/lib/crypto';

interface Space {
  id: string;
  name: string;
  emoji: string;
  memberCount: number;
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  spaceId: string;
  senderEmail: string;
  senderName: string;
  content: string;
  encrypted?: EncryptedMessage;
  isEncrypted: boolean;
  createdAt: Date;
}

interface SpaceViewProps {
  space: Space;
  userEmail?: string;
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

export function SpaceView({
  space,
  userEmail,
  onBack,
  onAddMembers,
  onShareFile,
  onAssignTask,
}: SpaceViewProps) {
  const { isDark } = useWebmailTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // E2E-Verschlüsselung Hook
  const e2e = useE2EEncryption({ 
    email: userEmail || '', 
    enabled: !!userEmail,
  });

  // Nachrichten laden - ohne e2e als Abhängigkeit um Endlosschleife zu vermeiden
  const loadMessages = useCallback(async (decryptFn?: (encrypted: EncryptedMessage) => Promise<string | null>) => {
    if (!userEmail) return;
    
    try {
      setIsLoadingMessages(true);
      const response = await fetch(`/api/webmail/chat/spaces/${space.id}/messages?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.success && data.messages) {
        const loadedMessages: ChatMessage[] = [];
        
        for (const msg of data.messages) {
          let content = msg.content;
          
          // Wenn Nachricht verschlüsselt ist, versuche zu entschlüsseln
          if (msg.isEncrypted && msg.encrypted && decryptFn) {
            try {
              const decrypted = await decryptFn(msg.encrypted);
              content = decrypted || '[Entschlüsselung fehlgeschlagen]';
            } catch {
              content = '[Verschlüsselte Nachricht]';
            }
          }
          
          loadedMessages.push({
            id: msg.id,
            spaceId: msg.spaceId,
            senderEmail: msg.senderEmail,
            senderName: msg.senderName || msg.senderEmail.split('@')[0],
            content,
            isEncrypted: msg.isEncrypted,
            createdAt: new Date(msg.createdAt),
          });
        }
        
        setMessages(loadedMessages);
      }
    } catch {
      // Fehler stillschweigend ignorieren
    } finally {
      setIsLoadingMessages(false);
    }
  }, [space.id, userEmail]);

  // Nachrichten beim Laden abrufen - einmalig wenn space.id sich ändert
  useEffect(() => {
    // Warte kurz auf E2E-Initialisierung, dann lade
    const timer = setTimeout(() => {
      loadMessages(e2e.isReady ? e2e.decrypt : undefined);
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space.id, userEmail]);

  // Auto-Scroll zum Ende bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !userEmail || isSending) return;
    
    setIsSending(true);
    
    try {
      let encryptedData: EncryptedMessage | undefined;
      let plainContent = message.trim();
      
      // Versuche Nachricht zu verschlüsseln wenn E2E bereit ist
      // Für Gruppenchats würden wir encryptForSpace verwenden
      // Hier erstmal einfache Implementierung ohne echte Empfänger-Keys
      const isEncrypted = e2e.isReady;
      
      if (isEncrypted && e2e.myPublicKey) {
        // Für Demo: Verschlüssele mit eigenem Schlüssel
        // In Produktion: Für jeden Empfänger separat verschlüsseln
        const encrypted = await e2e.encrypt(e2e.myPublicKey, plainContent);
        if (encrypted) {
          encryptedData = encrypted;
        }
      }
      
      const response = await fetch(`/api/webmail/chat/spaces/${space.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: userEmail,
          senderName: userEmail.split('@')[0],
          content: isEncrypted ? '[E2E Verschlüsselt]' : plainContent,
          encrypted: encryptedData,
          isEncrypted,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.message) {
        const newMessage: ChatMessage = {
          id: data.message.id,
          spaceId: space.id,
          senderEmail: userEmail,
          senderName: userEmail.split('@')[0],
          content: plainContent, // Lokale Anzeige mit Klartext
          isEncrypted,
          createdAt: new Date(),
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessage('');
      }
    } catch {
      // Fehler stillschweigend ignorieren
    } finally {
      setIsSending(false);
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
          {/* E2E Encryption Status Banner */}
          {e2e.isSupported && (
            <div className={cn(
              "flex items-center justify-center gap-2 py-2 px-4 mb-4 rounded-lg text-xs",
              e2e.isReady
                ? isDark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-700"
                : isDark ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-50 text-yellow-700"
            )}>
              {e2e.isReady ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Ende-zu-Ende-Verschlüsselung aktiv</span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  <span>E2E-Verschlüsselung wird initialisiert...</span>
                </>
              )}
            </div>
          )}

          {/* Welcome Illustration - nur anzeigen wenn keine Nachrichten */}
          {messages.length === 0 && !isLoadingMessages && (
            <>
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
                    Mitglieder hinzufügen
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
                    Datei teilen
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
                    Aufgaben zuweisen
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
            </>
          )}

          {/* Loading State */}
          {isLoadingMessages && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          )}

          {/* Messages List */}
          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isOwnMessage = msg.senderEmail === userEmail;
                const showDate = index === 0 || 
                  messages[index - 1].createdAt.toDateString() !== msg.createdAt.toDateString();
                
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <span className={cn(
                          "text-xs px-3 py-1 rounded-full",
                          isDark ? "bg-[#3c4043] text-gray-400" : "bg-gray-100 text-gray-500"
                        )}>
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <div className={cn(
                      "flex",
                      isOwnMessage ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        isOwnMessage
                          ? isDark ? "bg-[#8ab4f8] text-[#202124]" : "bg-teal-600 text-white"
                          : isDark ? "bg-[#3c4043] text-white" : "bg-gray-100 text-gray-900"
                      )}>
                        {!isOwnMessage && (
                          <p className={cn(
                            "text-xs font-medium mb-1",
                            isDark ? "text-gray-300" : "text-gray-600"
                          )}>
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOwnMessage
                            ? isDark ? "text-[#202124]/60" : "text-white/70"
                            : isDark ? "text-gray-400" : "text-gray-500"
                        )}>
                          <span className="text-xs">
                            {msg.createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.isEncrypted && (
                            <span title="Ende-zu-Ende verschlüsselt">
                              <Lock className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
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
            disabled={!message.trim() || isSending}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              message.trim() && !isSending
                ? isDark
                  ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                  : "bg-teal-600 text-white hover:bg-teal-700"
                : isDark
                  ? "text-gray-500"
                  : "text-gray-400"
            )}
          >
            {isSending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
