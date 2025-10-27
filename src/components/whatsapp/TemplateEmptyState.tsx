'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateEmptyStateProps {
  onCreateClick: () => void;
}

export function TemplateEmptyState({ onCreateClick }: TemplateEmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-lg" style={{ minHeight: '600px' }}>
      {/* Skeleton Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px',
        }}
      >
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 overflow-hidden animate-pulse"
            style={{ opacity: 0.3 }}
          >
            {/* Header */}
            <div
              className="bg-gray-100 relative flex justify-center p-10"
              style={{ height: '200px' }}
            >
              <div className="w-4/5 bg-white rounded-xl" style={{ marginBottom: '-60px' }}></div>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(242, 244, 247, 0.5) 100%)',
                }}
              ></div>
            </div>
            {/* Footer */}
            <div className="bg-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-5 w-full">
                <div className="rounded-full h-10 w-10 bg-gray-100"></div>
                <div className="h-4 w-2/3 rounded-full bg-gray-100"></div>
              </div>
              <div className="text-gray-300">⋮</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fade Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(249, 250, 251, 0.9) 0%, rgba(249, 250, 251, 0.95) 100%)',
        }}
      ></div>

      {/* Centered Content */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ minHeight: '600px' }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8 max-w-md mx-auto">
          <div className="text-center">
            {/* Icon */}
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border-8 border-gray-100">
                <Plus className="w-6 h-6 text-teal-600" />
              </div>
            </div>

            {/* Heading */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Vorlagen gefunden.</h3>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-6">
              Du hast noch keine Vorlagen. Bitte erstelle zuerst eine Vorlage!
              <br />
            </p>

            {/* CTA Button */}
            <Button onClick={onCreateClick} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="w-5 h-5 mr-2" />
              Vorlage erstellen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
