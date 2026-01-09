'use client';

import { useState } from 'react';
import {
  Send,
  ChevronDown,
  Loader2,
  CheckCheck,
  Clock,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WhatsAppLogo from './WhatsAppLogo';
import ChatAvatar, { AgentAvatar } from './ChatAvatar';
import { formatMessageTime, formatDate } from './utils';
import ChatAssignmentDropdown from './ChatAssignmentDropdown';
import MessageScheduler from './MessageScheduler';
import ContactLinker from './ContactLinker';
import type { WhatsAppMessage } from './types';

interface ActiveChatPanelProps {
  selectedChat: {
    id?: string;
    phone: string;
    customerId?: string;
    customerName?: string;
    assignedTo?: string;
    assignedToName?: string;
  } | null;
  messages: WhatsAppMessage[];
  messageText: string;
  setMessageText: (text: string) => void;
  isSending: boolean;
  onSendMessage: () => void;
  onCloseChat: () => void;
  companyId: string;
  onChatUpdated?: () => void;
}

export default function ActiveChatPanel({
  selectedChat,
  messages,
  messageText,
  setMessageText,
  isSending,
  onSendMessage,
  onCloseChat,
  companyId,
  onChatUpdated,
}: ActiveChatPanelProps) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [showContactLinker, setShowContactLinker] = useState(false);
  // Kein Chat ausgewählt
  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#25D366]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <WhatsAppLogo className="w-10 h-10 text-[#25D366]" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp Business</h3>
          <p className="text-gray-500">Wähle einen Chat aus der Liste</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Chat Header - Fixed Height */}
      <div className="shrink-0 h-14 px-4 flex items-center justify-between bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">Active chat</h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Assigned To - Team-Inbox mit Seat-Integration */}
          <ChatAssignmentDropdown
            companyId={companyId}
            chatPhone={selectedChat.id || selectedChat.phone}
            currentAssignee={selectedChat.assignedTo}
            onAssignmentChange={onChatUpdated}
          />

          {/* CRM-Verknüpfung */}
          <Button
            onClick={() => setShowContactLinker(true)}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-600 hover:text-[#14ad9f]"
            title="CRM-Kontakt verknüpfen"
          >
            <Link2 className="w-4 h-4 mr-1" />
            {selectedChat.customerId ? 'Verknüpft' : 'Verknüpfen'}
          </Button>

          {/* Close Chat Button */}
          <Button
            onClick={onCloseChat}
            className="bg-red-500 hover:bg-red-600 text-white text-sm h-8 px-4"
          >
            Close chat
          </Button>

          <ChevronDown className="w-5 h-5 text-gray-400 cursor-pointer" />
        </div>
      </div>

      {/* Messages - Scrollable Area */}
      <div id="chat-messages" className="flex-1 overflow-y-auto p-6 min-h-0">
        {/* Date Separator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="px-4 text-xs text-gray-400">{formatDate(new Date())}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <WhatsAppLogo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Noch keine Nachrichten</p>
              <p className="text-sm text-gray-400">Schreibe die erste Nachricht</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[70%]">
                  {msg.direction === 'inbound' && (
                    <ChatAvatar name={selectedChat?.customerName || selectedChat?.phone || ''} size="sm" />
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      msg.direction === 'outbound'
                        ? 'bg-[#3B82F6] text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.body}</p>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 ${
                        msg.direction === 'outbound' ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      <span className="text-[10px]">{formatMessageTime(msg.createdAt)}</span>
                      {msg.direction === 'outbound' && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>
                  {msg.direction === 'outbound' && <AgentAvatar name="Andy" size="sm" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Message Separator */}
        {messages.length > 0 && (
          <div className="flex items-center justify-center mt-6">
            <div className="flex-1 h-px bg-blue-200" />
            <span className="px-4 text-xs text-blue-500 font-medium">New message</span>
            <div className="flex-1 h-px bg-blue-200" />
          </div>
        )}
      </div>

      {/* Input - Fixed at Bottom */}
      <div className="shrink-0 p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3">
          {/* Nachricht planen Button */}
          <Button
            onClick={() => setShowScheduler(true)}
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-gray-400 hover:text-[#14ad9f]"
            title="Nachricht planen"
          >
            <Clock className="w-5 h-5" />
          </Button>
          
          <Input
            placeholder="Nachricht eingeben..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSendMessage()}
            disabled={isSending}
            className="flex-1 h-11 bg-gray-50 border-gray-200"
          />
          <Button
            onClick={onSendMessage}
            disabled={isSending || !messageText.trim()}
            className="h-11 w-11 p-0 bg-[#3B82F6] hover:bg-blue-600"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <MessageScheduler
              companyId={companyId}
              recipientPhone={selectedChat.phone}
              recipientName={selectedChat.customerName}
              initialMessage={messageText}
              onScheduled={() => {
                setShowScheduler(false);
                setMessageText('');
              }}
              onClose={() => setShowScheduler(false)}
            />
          </div>
        </div>
      )}

      {/* Contact Linker Modal */}
      {showContactLinker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">CRM-Kontakt verknüpfen</h3>
              <Button
                onClick={() => setShowContactLinker(false)}
                variant="ghost"
                size="sm"
              >
                Schließen
              </Button>
            </div>
            <ContactLinker
              companyId={companyId}
              contactPhone={selectedChat.phone}
              currentCustomerId={selectedChat.customerId}
              currentCustomerName={selectedChat.customerName}
              onLink={() => {
                setShowContactLinker(false);
                onChatUpdated?.();
              }}
              onUnlink={() => {
                setShowContactLinker(false);
                onChatUpdated?.();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
