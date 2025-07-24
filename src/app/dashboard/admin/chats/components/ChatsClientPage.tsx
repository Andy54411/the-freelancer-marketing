'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Users, HeadphonesIcon, Send, Clock, User, Building } from 'lucide-react';
import { ChatModal } from './ChatModal';

interface ChatData {
  id: string;
  type: 'user-company' | 'support' | 'direct';
  orderId?: string;
  userId?: string;
  companyId?: string;
  userName?: string;
  companyName?: string;
  status?: string;
  lastMessage?: {
    text: string;
    timestamp: any;
    sender: string;
  };
  messageCount?: number;
  createdAt?: any;
  participants?: string[];
}

interface ChatStats {
  userCompanyChats: number;
  supportChats: number;
  directChats: number;
  totalChats: number;
}

export function ChatsClientPage({ chats: initialChats }: { chats: ChatData[] }) {
  const [chats, setChats] = useState<ChatData[]>(initialChats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'user-company' | 'support' | 'direct'>(
    'all'
  );
  const [stats, setStats] = useState<ChatStats>({
    userCompanyChats: 0,
    supportChats: 0,
    directChats: 0,
    totalChats: 0,
  });

  // Modal states
  const [selectedChat, setSelectedChat] = useState<ChatData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load chats from API
  const loadChats = async (filter: string = 'all') => {
    try {
      setLoading(true);
      setError(null);

      const url = filter === 'all' ? '/api/admin/chats' : `/api/admin/chats?type=${filter}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Fehler beim Laden der Chats');
      }

      setChats(data.chats || []);
      setStats(data.stats || stats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading chats:', error);
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      setLoading(false);
    }
  };

  // Initial load and setup refresh
  useEffect(() => {
    loadChats(activeFilter);
  }, [activeFilter]);

  // Filter handlers
  const handleFilterChange = (filter: 'all' | 'user-company' | 'support' | 'direct') => {
    setActiveFilter(filter);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unbekannt';

    let date: Date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
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
  };

  // Modal handlers
  const handleViewChat = (chat: ChatData) => {
    setSelectedChat(chat);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChat(null);
  };

  const handleCloseChat = async (chatId: string) => {
    // Hier würde normalerweise eine API-Route zum Schließen des Chats aufgerufen
    console.log('Schließe Chat:', chatId);
    // TODO: Implementiere API-Call zum Schließen des Chats
  };

  // Get chat type icon
  const getChatTypeIcon = (type: string) => {
    switch (type) {
      case 'user-company':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'support':
        return <HeadphonesIcon className="w-4 h-4 text-green-500" />;
      case 'direct':
        return <Send className="w-4 h-4 text-purple-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-full font-medium';

    switch (status) {
      case 'active':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Aktiv</span>;
      case 'closed':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Geschlossen</span>;
      case 'human':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Support</span>;
      default:
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            {status || 'Unbekannt'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat-Verwaltung</h1>
        <p className="text-gray-600 mt-2">
          Übersicht aller Chat-Konversationen zwischen Usern und Unternehmen
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gesamt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalChats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">User-Company</p>
              <p className="text-2xl font-bold text-gray-900">{stats.userCompanyChats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <HeadphonesIcon className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Support</p>
              <p className="text-2xl font-bold text-gray-900">{stats.supportChats}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Send className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Direkt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.directChats}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {[
            { key: 'all', label: 'Alle Chats', count: stats.totalChats },
            { key: 'user-company', label: 'User-Company', count: stats.userCompanyChats },
            { key: 'support', label: 'Support', count: stats.supportChats },
            { key: 'direct', label: 'Direkt', count: stats.directChats },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Chats...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">Fehler: {error}</p>
            <button
              onClick={() => loadChats(activeFilter)}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Erneut versuchen
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto" />
            <p className="mt-4 text-gray-600">Keine Chats gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teilnehmer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzte Nachricht
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chats.map(chat => (
                  <tr key={chat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getChatTypeIcon(chat.type)}
                        <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                          {chat.type.replace('-', ' ')}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {chat.type === 'user-company' ? (
                          <div>
                            <div className="flex items-center text-gray-900 font-medium">
                              <User className="w-4 h-4 mr-1" />
                              {chat.userName || 'Unbekannter User'}
                            </div>
                            <div className="flex items-center text-gray-500 mt-1">
                              <Building className="w-4 h-4 mr-1" />
                              {chat.companyName || 'Unbekannte Firma'}
                            </div>
                            {chat.orderId && (
                              <div className="text-gray-400 text-xs mt-1">
                                Order: {chat.orderId}
                              </div>
                            )}
                          </div>
                        ) : chat.type === 'support' ? (
                          <div>
                            <div className="text-gray-900 font-medium">
                              {chat.userName || 'Unbekannter User'}
                            </div>
                            <div className="text-gray-500">Support-Chat</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-gray-900 font-medium">Direkter Chat</div>
                            <div className="text-gray-500">
                              {chat.participants?.length || 0} Teilnehmer
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 truncate max-w-xs">
                          {chat.lastMessage?.text || 'Keine Nachrichten'}
                        </div>
                        {chat.lastMessage?.sender && (
                          <div className="text-gray-500 text-xs mt-1">
                            von: {chat.lastMessage.sender}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(chat.status || 'active')}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTimestamp(chat.lastMessage?.timestamp || chat.createdAt)}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewChat(chat)}
                        className="text-blue-600 hover:text-blue-900 mr-3 hover:underline"
                      >
                        Ansehen
                      </button>
                      <button
                        onClick={() => handleCloseChat(chat.id)}
                        className="text-red-600 hover:text-red-900 hover:underline"
                      >
                        Schließen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      <ChatModal
        chatId={selectedChat?.id || null}
        chatType={selectedChat?.type || 'support'}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        chatData={{
          userName: selectedChat?.userName,
          companyName: selectedChat?.companyName,
          status: selectedChat?.status,
          lastMessage: selectedChat?.lastMessage,
        }}
      />
    </div>
  );
}
