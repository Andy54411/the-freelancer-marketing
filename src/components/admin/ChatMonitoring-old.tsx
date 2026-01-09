'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  collectionGroup,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Users,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  text: string;
  timestamp: Timestamp;
  flagged?: boolean;
  escalated?: boolean;
}

interface ChatOverview {
  id: string;
  type: 'support' | 'order' | 'direct';
  lastMessage: string;
  lastUpdated: Timestamp;
  participants: string[];
  messageCount: number;
  status?: string;
  flagged?: boolean;
}

const ChatMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'analytics'>('overview');
  const [chats, setChats] = useState<ChatOverview[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatType, setSelectedChatType] = useState<'all' | 'support' | 'order' | 'direct'>(
    'all'
  );
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  // Real-time Chat Overview
  useEffect(() => {
    const queries = [
      // Support Chats
      query(collection(db, 'supportChats'), orderBy('lastUpdated', 'desc'), limit(50)),
      // Direct Chats
      query(collection(db, 'directChats'), orderBy('lastUpdated', 'desc'), limit(50)),
      // Order Chats
      query(collection(db, 'chats'), orderBy('lastUpdated', 'desc'), limit(50)),
    ];

    const unsubscribes = queries.map((q, index) => {
      return onSnapshot(q, snapshot => {
        const chatType = ['support', 'direct', 'order'][index] as 'support' | 'direct' | 'order';

        const newChats = snapshot.docs.map(doc => ({
          id: doc.id,
          type: chatType,
          lastMessage: doc.data().lastMessage?.text || '',
          lastUpdated: doc.data().lastUpdated || doc.data().timestamp,
          participants: doc.data().users || doc.data().participants || [],
          messageCount: 0, // Wird separat geladen
          status: doc.data().status,
          flagged: doc.data().flagged || false,
          ...doc.data(),
        })) as ChatOverview[];

        setChats(prev => {
          // Entferne alte Chats dieses Typs und füge neue hinzu
          const filtered = prev.filter(chat => chat.type !== chatType);
          return [...filtered, ...newChats].sort(
            (a, b) => b.lastUpdated?.toDate().getTime() - a.lastUpdated?.toDate().getTime()
          );
        });
        setLoading(false);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Real-time Messages Monitoring (alle Chats)
  useEffect(() => {
    const messagesQuery = query(
      collectionGroup(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, snapshot => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        chatId: doc.ref.parent.parent?.id || '',
        senderId: doc.data().senderId,
        senderName: doc.data().senderName,
        senderType: doc.data().senderType,
        text: doc.data().text,
        timestamp: doc.data().timestamp,
        flagged: checkMessageForFlags(doc.data().text),
        escalated: doc.data().escalated || false,
      })) as ChatMessage[];

      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, []);

  // Automatische Flagging-Logik
  const checkMessageForFlags = (text: string): boolean => {
    const flagPatterns = [
      // Kontaktdaten (sollten blockiert sein, aber zur Sicherheit flaggen)
      /\b\d{4,}\s*\d{4,}\b/g,
      /@/g,
      /\b\d{5}\b/g, // PLZ
      // Problematische Inhalte
      /\b(hilfe|problem|fehler|bug|beschwerde|reklamation|anwalt|gericht|klage|betrug|scam)\b/gi,
      // Finanzielle Probleme
      /\b(geld|zahlung|bezahlung|rechnung|kosten|teuer|billig|kostenlos|gratis)\b/gi,
    ];

    return flagPatterns.some(pattern => pattern.test(text));
  };

  // Filter Chats
  const filteredChats = chats.filter(chat => {
    if (selectedChatType !== 'all' && chat.type !== selectedChatType) return false;
    if (flaggedOnly && !chat.flagged) return false;
    if (searchQuery && !chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  // Filter Messages
  const filteredMessages = messages.filter(message => {
    if (flaggedOnly && !message.flagged) return false;
    if (searchQuery && !message.text.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  const formatTimestamp = (timestamp: Timestamp) => {
    return timestamp?.toDate().toLocaleString('de-DE') || 'Unbekannt';
  };

  const getChatTypeColor = (type: string) => {
    switch (type) {
      case 'support':
        return 'bg-red-100 text-red-800';
      case 'order':
        return 'bg-blue-100 text-blue-800';
      case 'direct':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-4">Lade Chat-Monitoring...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Chat Monitoring Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {chats.length} Aktive Chats
          </Badge>
          <Badge
            variant={flaggedOnly ? 'destructive' : 'outline'}
            className="flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            {messages.filter(m => m.flagged).length} Flagged
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Chat Übersicht', icon: MessageSquare },
          { id: 'messages', label: 'Live Nachrichten', icon: Eye },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Nachrichten durchsuchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <select
          value={selectedChatType}
          onChange={e => setSelectedChatType(e.target.value as any)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">Alle Chat-Typen</option>
          <option value="support">Support Chats</option>
          <option value="order">Auftragschats</option>
          <option value="direct">Direkte Chats</option>
        </select>

        <Button
          variant={flaggedOnly ? 'destructive' : 'outline'}
          onClick={() => setFlaggedOnly(!flaggedOnly)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {flaggedOnly ? 'Alle zeigen' : 'Nur Flagged'}
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Aktive Chats ({filteredChats.length})</h2>
          <div className="grid gap-4">
            {filteredChats.map(chat => (
              <div key={chat.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getChatTypeColor(chat.type)}>{chat.type}</Badge>
                    <span className="font-medium">{chat.id}</span>
                    {chat.flagged && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(chat.lastUpdated)}
                  </div>
                </div>

                <p className="text-gray-700 mb-2 line-clamp-2">
                  {chat.lastMessage || 'Keine Nachrichten'}
                </p>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{chat.participants.length} Teilnehmer</span>
                    {chat.status && <Badge variant="outline">{chat.status}</Badge>}
                  </div>
                  <Button variant="outline" size="sm">
                    Chat öffnen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Live Nachrichten ({filteredMessages.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMessages.map(message => (
              <div
                key={message.id}
                className={`p-3 border rounded-lg ${message.flagged ? 'border-red-200 bg-red-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{message.senderName}</span>
                    <Badge variant="outline" className="text-xs">
                      {message.senderType}
                    </Badge>
                    {message.flagged && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <p className="text-gray-700">{message.text}</p>
                <div className="mt-2 text-xs text-gray-500">Chat: {message.chatId}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Chat-Statistiken</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Support Chats:</span>
                <span className="font-medium">
                  {chats.filter(c => c.type === 'support').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Auftragschats:</span>
                <span className="font-medium">{chats.filter(c => c.type === 'order').length}</span>
              </div>
              <div className="flex justify-between">
                <span>Direkte Chats:</span>
                <span className="font-medium">{chats.filter(c => c.type === 'direct').length}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Flagged Content</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Flagged Nachrichten:</span>
                <span className="font-medium text-red-600">
                  {messages.filter(m => m.flagged).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Flagged Chats:</span>
                <span className="font-medium text-red-600">
                  {chats.filter(c => c.flagged).length}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Aktivität (heute)</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Neue Nachrichten:</span>
                <span className="font-medium">
                  {
                    messages.filter(m => {
                      const today = new Date();
                      const msgDate = m.timestamp?.toDate();
                      return msgDate && msgDate.toDateString() === today.toDateString();
                    }).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span>Neue Chats:</span>
                <span className="font-medium">
                  {
                    chats.filter(c => {
                      const today = new Date();
                      const chatDate = c.lastUpdated?.toDate();
                      return chatDate && chatDate.toDateString() === today.toDateString();
                    }).length
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMonitoring;
