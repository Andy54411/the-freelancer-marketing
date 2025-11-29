'use client';

import React, { useEffect, useState } from 'react';
import { HoverCardContent } from "@/components/ui/hover-card";

interface AudienceHoverCardContentProps {
  segment: {
    id: string;
    name: string;
    description?: string;
    path?: string[];
  };
  companyId: string;
  typeLabel: string;
}

export function AudienceHoverCardContent({ segment, companyId, typeLabel }: AudienceHoverCardContentProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          `/api/multi-platform-advertising/google-ads/audiences/insights?companyId=${companyId}&audienceId=${segment.id}`
        );
        const result = await response.json();
        if (isMounted && result.success) {
          setDetails(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch audience details', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [segment.id, companyId]);

  return (
    <HoverCardContent className="w-80 p-0 overflow-hidden bg-white shadow-xl border-gray-200" align="start" side="right">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <h4 className="font-medium text-sm text-gray-900">{segment.name}</h4>
        <p className="text-xs text-gray-500 mt-1">{typeLabel}</p>
      </div>
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {/* Description */}
        <div>
          {details?.description || segment.description ? (
            <p className="text-sm text-gray-600 leading-relaxed">
              {details?.description || segment.description}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">Keine Beschreibung verfügbar</p>
          )}
        </div>

        {/* Weekly Impressions */}
        <div>
          <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 border-b border-gray-100 pb-1 border-dashed">
            Wöchentliche Impressionen
          </h5>
          {loading ? (
            <div className="h-4 bg-gray-100 rounded w-24 animate-pulse mt-1"></div>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-900 mt-1">
                {details?.weeklyImpressions || "Nicht verfügbar"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Schätzungen basierend auf Alle Länder, Alle Sprachen, Suchnetzwerk
              </p>
            </>
          )}
        </div>

        {/* Related Segments */}
        {details?.relatedSegments && details.relatedSegments.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 border-dashed">
              Wichtigste ähnliche Zielgruppensegmente
            </h5>
            <ul className="space-y-1">
              {details.relatedSegments.map((seg: any, idx: number) => (
                <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full shrink-0"></span>
                  <span className="truncate">{seg.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* YouTube Categories */}
        {details?.youtubeCategories && details.youtubeCategories.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 border-dashed">
              Relevanteste YouTube-Kategorien
            </h5>
            <ul className="space-y-1">
              {details.youtubeCategories.map((cat: any, idx: number) => (
                <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-500 rounded-full shrink-0"></span>
                  <span className="truncate">{cat.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </HoverCardContent>
  );
}
