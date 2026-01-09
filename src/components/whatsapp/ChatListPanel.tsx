'use client';

import { Search, User, Clock, MoreVertical, Archive, Trash2, Wifi, WifiOff, MessageCircle, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import WhatsAppLogo from './WhatsAppLogo';
import ChatAvatar from './ChatAvatar';
import { getTimeAgo, formatPhoneNumber } from './utils';
import type { WhatsAppChat, ChatFilter, ChatStatus } from './types';

interface ChatListPanelProps {
  uid: string;
  chats: WhatsAppChat[];
  selectedChat: WhatsAppChat | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: ChatFilter;
  setActiveFilter: (filter: ChatFilter) => void;
  reorderByLatest: boolean;
  setReorderByLatest: (value: boolean) => void;
  phoneNumber?: string;
  onSelectChat: (chat: WhatsAppChat) => void;
  onArchiveChat: (phone: string, name: string) => void;
  onDeleteChat: (phone: string, name: string) => void;
  onDisconnect: () => void;
}

function getChatStatus(chat: WhatsAppChat): ChatStatus {
  if (chat.status && chat.status !== 'open') {
    return chat.status;
  }

  const lastMsg = chat.lastMessage;
  if (!lastMsg) return 'open';

  if (lastMsg.direction === 'inbound') {
    return 'waiting_on_me';
  }
  if (lastMsg.direction === 'outbound') {
    return 'waiting_on_user';
  }

  return 'open';
}

export default function ChatListPanel({
  uid,
  chats,
  selectedChat,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  reorderByLatest,
  setReorderByLatest,
  phoneNumber,
  onSelectChat,
  onArchiveChat,
  onDeleteChat,
  onDisconnect,
}: ChatListPanelProps) {
  // Filter-Logik
  const filteredChats = chats
    .filter((chat) => {
      if (chat.status === 'archived' || chat.status === 'closed') {
        return false;
      }

      const matchesSearch =
        searchQuery === '' ||
        (chat.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      const chatStatus = getChatStatus(chat);

      switch (activeFilter) {
        case 'open':
          return true;
        case 'waiting_on_me':
          return chatStatus === 'waiting_on_me';
        case 'waiting_on_user':
          return chatStatus === 'waiting_on_user';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      if (!reorderByLatest) {
        const nameA = a.customerName || a.phone;
        const nameB = b.customerName || b.phone;
        return nameA.localeCompare(nameB);
      }

      const getTimestamp = (msg: WhatsAppChat['lastMessage']): number => {
        if (!msg?.createdAt) return 0;
        if (msg.createdAt instanceof Date) return msg.createdAt.getTime();
        if (typeof msg.createdAt === 'object' && 'seconds' in msg.createdAt) {
          return msg.createdAt.seconds * 1000;
        }
        return new Date(msg.createdAt as string).getTime();
      };

      return getTimestamp(b.lastMessage) - getTimestamp(a.lastMessage);
    });

  const getFilterCount = (filter: ChatFilter): number => {
    return chats.filter((chat) => {
      if (chat.status === 'archived' || chat.status === 'closed') return false;
      const status = getChatStatus(chat);
      switch (filter) {
        case 'open':
          return true;
        case 'waiting_on_me':
          return status === 'waiting_on_me';
        case 'waiting_on_user':
          return status === 'waiting_on_user';
        default:
          return true;
      }
    }).length;
  };

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <WhatsAppLogo className="w-5 h-5 text-[#25D366]" />
          <h2 className="font-semibold text-gray-900">Aktive Chats</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-4">
          {[
            { key: 'open' as ChatFilter, label: 'Offen', icon: MessageCircle },
            { key: 'waiting_on_me' as ChatFilter, label: 'Wartet auf mich', icon: Clock },
            { key: 'waiting_on_user' as ChatFilter, label: 'Wartet auf Kunde', icon: Users },
          ].map((tab) => {
            const count = getFilterCount(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs transition-colors relative ${
                  activeFilter === tab.key
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <tab.icon className="w-4 h-4" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-3.5 h-3.5 bg-[#25D366] text-white text-[10px] font-medium rounded-full flex items-center justify-center px-0.5">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sortierung Toggle */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>Neueste Nachrichten oben</span>
          <button
            onClick={() => setReorderByLatest(!reorderByLatest)}
            className={`w-9 h-5 rounded-full transition-colors ${
              reorderByLatest ? 'bg-[#25D366]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                reorderByLatest ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Suche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Chats durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-gray-50 border-0 text-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Keine Chats gefunden</p>
            <p className="text-xs text-gray-400 mt-2">Sende eine Nachricht, um einen Chat zu starten</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.phone}
              onClick={() => onSelectChat(chat)}
              className={`group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                selectedChat?.phone === chat.phone ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}
            >
              <div className="relative">
                <ChatAvatar name={chat.customerName || chat.phone} size="md" />
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{chat.unreadCount}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {chat.customerName || formatPhoneNumber(chat.phone)}
                  </p>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(chat.lastMessage.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {chat.lastMessage.direction === 'outbound' ? 'Du: ' : ''}
                  {chat.lastMessage.body}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onArchiveChat(chat.phone, chat.customerName || chat.phone)}
                  >
                    <Archive className="w-4 h-4 mr-2" /> Archivieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteChat(chat.phone, chat.customerName || chat.phone)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Wifi className="w-3 h-3 text-[#25D366]" />
            <span>{phoneNumber}</span>
          </div>
          <button
            onClick={onDisconnect}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <WifiOff className="w-3 h-3" /> Trennen
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/company/${uid}/whatsapp/templates`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Vorlagen
          </a>
          <a
            href={`/dashboard/company/${uid}/whatsapp/settings`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Einstellungen
          </a>
        </div>
      </div>
    </div>
  );
}
