/**
 * E-Invoice Compliance Dashboard
 * Vollständige Übersicht der deutschen E-Rechnung-Compliance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  FileText,
  Globe,
  Zap,
  Settings,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
} from 'lucide-react';
import { AutoEInvoiceService } from '@/services/autoEInvoiceService';

interface ComplianceDashboardProps {
  companyId: string;
  onConfigureClick?: () => void;
}

export function EInvoiceComplianceDashboard({
  companyId,
  onConfigureClick,
}: ComplianceDashboardProps) {
  const [complianceData, setComplianceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComplianceData = async () => {
      try {
        const report = await AutoEInvoiceService.generateComplianceReport(companyId);
        setComplianceData(report);
      } catch (error) {
        console.error('Fehler beim Laden der Compliance-Daten:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      loadComplianceData();
    }
  }, [companyId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Compliance-Status wird geladen...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getComplianceLevel = (score: number) => {
    if (score >= 90) return { level: 'Vollständig', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 70) return { level: 'Gut vorbereitet', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 50) return { level: 'Grundlagen', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Konfiguration erforderlich', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const complianceLevel = getComplianceLevel(complianceData?.overallCompliance || 0);

  return (
    <div className="space-y-6">
      {/* Hauptstatus-Karte */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-[#14ad9f]" />
              <span>Deutsche E-Rechnung-Compliance</span>
            </div>
            <Badge
              variant="secondary"
              className={`${complianceLevel.bg} ${complianceLevel.color} border-0`}
            >
              {complianceData?.overallCompliance || 0}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Compliance-Level</span>
              <span className={`text-sm font-semibold ${complianceLevel.color}`}>
                {complianceLevel.level}
              </span>
            </div>
            <Progress value={complianceData?.overallCompliance || 0} className="h-3" />
          </div>

          {/* Feature-Status Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {complianceData?.zugferdReady ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <div className="text-sm">
                <div className="font-medium">ZUGFeRD</div>
                <div className="text-xs text-gray-500">PDF/A-3</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {complianceData?.xrechnungReady ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
              <div className="text-sm">
                <div className="font-medium">XRechnung</div>
                <div className="text-xs text-gray-500">UBL XML</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {complianceData?.tseConfigured ? (
                <Shield className="h-4 w-4 text-green-500" />
              ) : (
                <Shield className="h-4 w-4 text-gray-400" />
              )}
              <div className="text-sm">
                <div className="font-medium">TSE</div>
                <div className="text-xs text-gray-500">Digital signiert</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {complianceData?.peppolEnabled ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <Globe className="h-4 w-4 text-gray-400" />
              )}
              <div className="text-sm">
                <div className="font-medium">PEPPOL</div>
                <div className="text-xs text-gray-500">EU-Netzwerk</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Standards Compliance */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Deutsche Standards-Compliance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-800">EN 16931</div>
                  <div className="text-xs text-green-600">EU-Standard</div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-800">UStG §14</div>
                  <div className="text-xs text-green-600">Deutsche Gesetze</div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-800">GoBD</div>
                  <div className="text-xs text-green-600">Buchführung</div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Handlungsempfehlungen */}
          {complianceData?.recommendations?.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-amber-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Empfohlene Verbesserungen
                </h4>
                <div className="space-y-2">
                  {complianceData.recommendations.slice(0, 3).map((rec: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <ChevronRight className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Button onClick={onConfigureClick} className="w-full bg-[#14ad9f] hover:bg-taskilo-hover">
              <Settings className="h-4 w-4 mr-2" />
              {complianceData?.overallCompliance < 100
                ? 'Compliance vervollständigen'
                : 'Einstellungen verwalten'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Zusätzliche Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Technische Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              Technische Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>XML-Validierung</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>PDF/A-3 Generierung</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Automatische Übertragung</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Format-Konvertierung</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Rechtssicherheit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Rechnungspflichtangaben</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Vorsteuerabzug-berechtigt</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Archivierung (GoBD)</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Betriebsprüfung-sicher</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Erfolg-Indikator bei 100% */}
      {complianceData?.overallCompliance >= 100 && (
        <Card className="bg-linear-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">
                  🎉 Vollständige E-Rechnung-Compliance erreicht!
                </h3>
                <p className="text-sm text-green-600 mt-1">
                  Ihr System erfüllt alle deutschen E-Rechnung-Standards und ist bereit für die
                  automatische Generierung und Übertragung von E-Rechnungen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
