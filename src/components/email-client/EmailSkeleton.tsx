'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailSkeletonProps {
  count?: number;
}

export function EmailListSkeleton({ count = 8 }: EmailSkeletonProps) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <EmailItemSkeleton key={i} delay={i * 50} />
      ))}
    </div>
  );
}

function EmailItemSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Checkbox */}
      <Skeleton className="h-4 w-4 rounded" />
      
      {/* Star */}
      <Skeleton className="h-4 w-4 rounded" />
      
      {/* Avatar */}
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          {/* Sender Name */}
          <Skeleton className="h-4 w-32" />
          {/* Date */}
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
        {/* Subject */}
        <Skeleton className="h-4 w-3/4" />
        {/* Preview */}
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function EmailViewerSkeleton() {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </div>
      
      {/* Body */}
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="h-4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function EmailLoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Animated mail icon */}
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
        </div>
        <span className="text-sm text-gray-600 animate-pulse">E-Mails werden geladen...</span>
      </div>
    </div>
  );
}

export function EmailFullPageSkeleton() {
  return (
    <div className="h-full flex bg-gray-50">
      {/* Email List */}
      <div className="w-96 border-r bg-white flex flex-col">
        {/* Toolbar */}
        <div className="p-3 border-b flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24 rounded" />
        </div>
        
        {/* Email Items */}
        <div className="flex-1 overflow-hidden">
          <EmailListSkeleton count={10} />
        </div>
      </div>
      
      {/* Email Viewer */}
      <div className="flex-1">
        <EmailViewerSkeleton />
      </div>
    </div>
  );
}
