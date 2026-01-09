/**
 * MessageList Component
 * 
 * Container für Nachrichten mit Scroll und Gruppierung
 */
'use client';

import React from 'react';
import { MessageBubble, WhatsAppMessage } from './MessageBubble';
import { ArrowDown, Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: WhatsAppMessage[];
  isLoading?: boolean;
  onReply?: (message: WhatsAppMessage) => void;
  onReact?: (message: WhatsAppMessage, emoji: string) => void;
  onCopy?: (text: string) => void;
  onDelete?: (message: WhatsAppMessage) => void;
  onForward?: (message: WhatsAppMessage) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessageList({
  messages,
  isLoading,
  onReply,
  onReact,
  onCopy,
  onDelete,
  onForward,
  onLoadMore,
  hasMore,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  // Gruppiere Nachrichten nach Datum
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: WhatsAppMessage[] }[] = [];
    
    messages.forEach(message => {
      const timestamp = typeof message.timestamp === 'string' 
        ? new Date(message.timestamp) 
        : message.timestamp;
      const dateStr = timestamp.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateStr) {
        lastGroup.messages.push(message);
      } else {
        groups.push({ date: dateStr, messages: [message] });
      }
    });

    return groups;
  }, [messages]);

  // Scroll-Handler
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    setIsAtBottom(distanceFromBottom < 100);
    setShowScrollButton(distanceFromBottom > 300);

    // Load more bei Scroll nach oben
    if (scrollTop < 100 && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  // Scroll nach unten
  const scrollToBottom = (smooth = true) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Auto-Scroll bei neuen Nachrichten (nur wenn bereits unten)
  React.useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    }
  }, [messages.length, isAtBottom]);

  // Initial scroll to bottom
  React.useEffect(() => {
    scrollToBottom(false);
  }, []);

  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    if (dateStr === today) return 'Heute';
    if (dateStr === yesterday) return 'Gestern';
    return dateStr;
  };

  // Prüfe ob Nachrichten gruppiert werden sollen (gleicher Absender, <2min Abstand)
  const shouldGroupWithPrevious = (current: WhatsAppMessage, previous: WhatsAppMessage | undefined) => {
    if (!previous) return false;
    if (current.direction !== previous.direction) return false;
    if (current.from !== previous.from) return false;

    const currentTime = typeof current.timestamp === 'string' 
      ? new Date(current.timestamp).getTime() 
      : current.timestamp.getTime();
    const previousTime = typeof previous.timestamp === 'string' 
      ? new Date(previous.timestamp).getTime() 
      : previous.timestamp.getTime();

    return (currentTime - previousTime) < 2 * 60 * 1000; // 2 Minuten
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#14ad9f] animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Nachrichten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Nachrichten</h3>
          <p className="text-gray-500 text-sm">
            Schreiben Sie eine Nachricht, um die Konversation zu starten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4 bg-[#e5ddd5] bg-[url('/whatsapp-bg.png')]"
      >
        {/* Load More Indicator */}
        {isLoading && hasMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
        )}

        {/* Grouped Messages */}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center my-4">
              <span className="px-3 py-1 bg-white/80 text-gray-600 text-xs rounded-lg shadow-sm">
                {formatDateHeader(group.date)}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((message, index) => {
              const previousMessage = index > 0 ? group.messages[index - 1] : undefined;
              const isGrouped = shouldGroupWithPrevious(message, previousMessage);

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isGrouped={isGrouped}
                  showAvatar={!isGrouped}
                  onReply={onReply}
                  onReact={onReact}
                  onCopy={onCopy}
                  onDelete={onDelete}
                  onForward={onForward}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ArrowDown className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  );
}
