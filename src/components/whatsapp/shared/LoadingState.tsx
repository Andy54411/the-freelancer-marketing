/**
 * LoadingState Component
 * 
 * Ladeindikator/Skeleton für WhatsApp-Komponenten
 */
'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'dots';
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  variant = 'spinner', 
  text, 
  size = 'md',
  className = '' 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center gap-1 ${className}`}>
        <span className="w-2 h-2 bg-[#14ad9f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-[#14ad9f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-[#14ad9f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  if (variant === 'spinner') {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
        <Loader2 className={`${sizeClasses[size]} text-[#14ad9f] animate-spin`} />
        {text && <p className="text-sm text-gray-500">{text}</p>}
      </div>
    );
  }

  // Skeleton variant
  return (
    <div className={`space-y-3 ${className}`}>
      <ConversationSkeleton />
      <ConversationSkeleton />
      <ConversationSkeleton />
    </div>
  );
}

// Skeleton für Konversationsliste
export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-full" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-10" />
    </div>
  );
}

// Skeleton für Nachrichten
export function MessageSkeleton({ isOutgoing = false }: { isOutgoing?: boolean }) {
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} animate-pulse`}>
      <div className={`max-w-[70%] ${isOutgoing ? 'bg-gray-200' : 'bg-gray-100'} rounded-xl p-3`}>
        <div className="h-4 bg-gray-300 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-300 rounded w-32" />
      </div>
    </div>
  );
}

// Skeleton für Template-Karten
export function TemplateSkeleton() {
  return (
    <div className="border rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

// Skeleton für Chat-Header
export function ChatHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-full" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    </div>
  );
}

// Full Page Loading
export function PageLoading({ text = 'Lädt...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingState variant="spinner" size="lg" text={text} />
    </div>
  );
}
