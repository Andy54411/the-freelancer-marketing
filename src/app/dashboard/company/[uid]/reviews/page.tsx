'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ReviewsPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Bewertungen</h1>
        <p className="text-gray-600 mt-1">
          Verwalten Sie Ihre Kundenbewertungen und antworten Sie auf Feedback
        </p>
      </div>

      {/* Reviews Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v10a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bewertungen vorhanden</h3>
          <p className="text-gray-500">
            Sobald Kunden Ihr Unternehmen bewerten, werden die Bewertungen hier angezeigt.
          </p>
        </div>
      </div>
    </div>
  );
}
