/**
 * TypingIndicator Component
 * 
 * Zeigt an, dass jemand tippt
 */
'use client';

import React from 'react';

interface TypingIndicatorProps {
  isTyping: boolean;
  name?: string;
}

export function TypingIndicator({ isTyping, name }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1 bg-white rounded-2xl px-4 py-2 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      {name && (
        <span className="text-xs text-gray-500">{name} tippt...</span>
      )}
    </div>
  );
}

/**
 * TypingIndicatorBubble - Inline Version für MessageList
 */
export function TypingIndicatorBubble() {
  return (
    <div className="flex justify-start mt-2">
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
