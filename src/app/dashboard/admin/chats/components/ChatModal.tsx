'use client';

import { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Clock,
  MessageCircle,
  Send,
  Users,
  AlertTriangle,
  Shield,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: any;
  senderId: string;
  senderName?: string;
  isReadBySupport?: boolean;
}

interface ChatModalProps {
  chatId: string | null;
  chatType: 'user-company' | 'support' | 'direct';
  isOpen: boolean;
  onClose: () => void;
  chatData?: {
    userName?: string;
    companyName?: string;
    status?: string;
    lastMessage?: {
      text: string;
      timestamp: any;
      sender: string;
    };
  };
}

export function ChatModal({ chatId, chatType, isOpen, onClose, chatData }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [moderationResult, setModerationResult] = useState<any>(null);
  const [showModerationAlert, setShowModerationAlert] = useState(false);

  // Load chat messages
  const loadMessages = async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);

      // Hier würde normalerweise eine API-Route zum Laden der Chat-Nachrichten aufgerufen
      // Für jetzt simulieren wir Dummy-Daten basierend auf dem Chat-Typ
      const dummyMessages: ChatMessage[] = [
        {
          id: '1',
          text: chatData?.lastMessage?.text || 'Erste Nachricht im Chat',
          timestamp: chatData?.lastMessage?.timestamp || new Date(),
          senderId: chatType === 'support' ? 'user' : 'company',
          senderName: chatType === 'support' ? chatData?.userName : chatData?.companyName,
          isReadBySupport: true,
        },
      ];

      setMessages(dummyMessages);
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
      setError('Fehler beim Laden der Chat-Nachrichten');
    } finally {
      setLoading(false);
    }
  };

  // Check message with AI moderation
  const checkModeration = async (message: string) => {
    try {
      const response = await fetch('/api/chat-moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          chatId,
          senderId: 'admin',
          chatType,
        }),
      });

      if (!response.ok) {
        throw new Error('Moderation check failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Moderation check error:', error);
      // Bei Fehlern: Nachricht erlauben
      return {
        isViolation: false,
        severity: 'none',
        action: 'allow',
        reason: 'Moderation check failed - message allowed',
      };
    }
  };

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      setSending(true);
      setModerationResult(null);
      setShowModerationAlert(false);

      // Check message with AI moderation
      const moderation = await checkModeration(newMessage);
      setModerationResult(moderation);

      // Handle moderation result
      if (moderation.isViolation && moderation.action === 'block') {
        setShowModerationAlert(true);
        setSending(false);
        return;
      }

      // If flagged but not blocked, send with warning
      if (moderation.isViolation && moderation.action === 'flag') {
        // Show warning but allow sending
        setShowModerationAlert(true);
      }

      // Hier würde normalerweise eine API-Route zum Senden von Nachrichten aufgerufen
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        text: newMessage,
        timestamp: new Date(),
        senderId: 'admin',
        senderName: 'Admin',
        isReadBySupport: true,
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');

      // Auto-hide moderation alert after successful send
      if (showModerationAlert) {
        setTimeout(() => setShowModerationAlert(false), 3000);
      }
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (isOpen && chatId) {
      loadMessages();
    }
  }, [isOpen, chatId]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Invalid Date';

    try {
      let date;
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }

      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getChatTitle = () => {
    switch (chatType) {
      case 'support':
        return `Support-Chat mit ${chatData?.userName || 'Unbekannter User'}`;
      case 'user-company':
        return `Chat: ${chatData?.userName || 'User'} ↔ ${chatData?.companyName || 'Firma'}`;
      case 'direct':
        return 'Direkte Nachricht';
      default:
        return 'Chat';
    }
  };

  const getChatIcon = () => {
    switch (chatType) {
      case 'support':
        return <MessageCircle className="w-5 h-5 text-blue-600" />;
      case 'user-company':
        return <Users className="w-5 h-5 text-green-600" />;
      case 'direct':
        return <Send className="w-5 h-5 text-purple-600" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center">
            {getChatIcon()}
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900">{getChatTitle()}</h2>
              <p className="text-sm text-gray-500">
                Status: <span className="font-medium">{chatData?.status || 'Unbekannt'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg">{error}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 bg-gray-50 p-8 rounded-lg">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Keine Nachrichten in diesem Chat</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                    message.senderId === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.senderName || message.senderId}
                  </div>
                  <div className="text-sm">{message.text}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          {/* Moderation Alert */}
          {showModerationAlert && moderationResult && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                moderationResult.action === 'block'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : moderationResult.action === 'flag'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {moderationResult.action === 'block' ? (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  ) : (
                    <Shield className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">
                    {moderationResult.action === 'block'
                      ? '🚫 Nachricht blockiert'
                      : '⚠️ Nachricht markiert'}
                  </h3>
                  <div className="mt-1 text-sm">
                    <p>{moderationResult.reason}</p>
                    {moderationResult.suggestedResponse && (
                      <p className="mt-1 italic">
                        Empfehlung: {moderationResult.suggestedResponse}
                      </p>
                    )}
                    <p className="text-xs mt-1 opacity-75">
                      Schweregrad: {moderationResult.severity} | Konfidenz:{' '}
                      {moderationResult.confidence}%
                    </p>
                  </div>
                  {moderationResult.action === 'block' && (
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          setShowModerationAlert(false);
                          setNewMessage('');
                        }}
                        className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
                      >
                        Nachricht löschen
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowModerationAlert(false)}
                  className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !sending && sendMessage()}
              placeholder="Nachricht eingeben..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || moderationResult?.action === 'block'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
