'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AnalyticsPageProps {
  params: Promise<{
    uid: string;
  }>;
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  const router = useRouter();
  const { uid: companyId } = React.use(params);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900">Google Ads Performance</h1>
        <p className="text-gray-600 mt-2">Überwachen Sie die Leistung Ihrer Google Ads Kampagnen</p>
      </div>

      <div className="grid gap-6">
        {/* Performance Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                Impressionen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-gray-500 mt-1">Wird mit API geladen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-blue-500" />
                Klicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-gray-500 mt-1">Wird mit API geladen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="w-4 h-4 mr-2 text-purple-500" />
                CTR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--%</div>
              <p className="text-xs text-gray-500 mt-1">Wird mit API geladen</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Performance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">📊 Analytics in Entwicklung</h3>
                <p className="text-blue-800 mb-4">
                  Detaillierte Performance-Berichte werden mit der vollständigen Google Ads API Integration verfügbar sein.
                </p>
                <div className="space-y-2 text-sm text-blue-700">
                  <p><strong>Geplante Metriken:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Echtzeitdaten zu Impressionen, Klicks, CTR</li>
                    <li>Conversion-Tracking und ROI-Analyse</li>
                    <li>Keyword-Performance und Quality Score</li>
                    <li>Demografische und geografische Aufschlüsselung</li>
                    <li>Historische Trends und Forecasting</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">✅ Sofort verfügbar</h4>
                <p className="text-green-800 text-sm mb-3">
                  Verwenden Sie das offizielle Google Ads Dashboard für detaillierte Analytics:
                </p>
                <Button
                  onClick={() => window.open('https://ads.google.com/aw/overview', '_blank')}
                >
                  Google Ads Dashboard öffnen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}