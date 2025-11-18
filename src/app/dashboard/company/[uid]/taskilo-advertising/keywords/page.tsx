'use client';

// 🎯 KEYWORDS - Dedicated Page
// Keyword-Recherche und -Optimierung

import React from 'react';
import { useParams } from 'next/navigation';
import KeywordManager from '@/components/taskilo-advertising/KeywordManager';

export default function KeywordsPage() {
  const params = useParams();
  const companyId = params.uid as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Keywords Manager</h1>
          <p className="text-gray-600 mt-2">Keyword-Recherche und Performance-Optimierung</p>
        </div>
        <KeywordManager companyId={companyId} />
      </div>
    </div>
  );
}