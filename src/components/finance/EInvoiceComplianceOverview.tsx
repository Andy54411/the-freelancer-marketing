/**
 * Deutsche E-Rechnungs-Compliance Übersicht
 * Zeigt den aktuellen Status bezüglich deutscher Gesetzgebung
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  Calendar,
  FileText,
  Users,
  Gavel,
} from 'lucide-react';

interface EInvoiceComplianceOverviewProps {
  totalInvoices: number;
  compliantInvoices: number;
  sentInvoices: number;
  companyTurnover?: number; // Für Übergangsregelungen
}

export function EInvoiceComplianceOverview({
  totalInvoices,
  compliantInvoices,
  sentInvoices,
  companyTurnover,
}: EInvoiceComplianceOverviewProps) {
  // Übergangsregelungen bestimmen
  const getCurrentTransitionPhase = () => {
    const now = new Date();
    const year = now.getFullYear();

    if (year === 2025) {
      return {
        phase: 'Übergangsphase 1',
        description: 'Freiwillige E-Rechnungen oder sonstige Rechnungen möglich',
        endDate: '31.12.2026',
        isSmallBusinessExtended: companyTurnover && companyTurnover <= 800000,
      };
    } else if (year === 2026) {
      return {
        phase: 'Übergangsphase 2',
        description: 'Noch sonstige Rechnungen möglich für kleine Unternehmen',
        endDate: companyTurnover && companyTurnover <= 800000 ? '31.12.2027' : '31.12.2026',
        isSmallBusinessExtended: companyTurnover && companyTurnover <= 800000,
      };
    } else if (year >= 2027) {
      return {
        phase: 'Vollständige Pflicht',
        description: 'E-Rechnungen zwischen inländischen Unternehmern verpflichtend',
        endDate: null,
        isSmallBusinessExtended: false,
      };
    }

    return {
      phase: 'Vorbereitung',
      description: 'E-Rechnungspflicht ab 01.01.2025',
      endDate: '01.01.2025',
      isSmallBusinessExtended: false,
    };
  };

  const transitionPhase = getCurrentTransitionPhase();
  const complianceRate = totalInvoices > 0 ? (compliantInvoices / totalInvoices) * 100 : 0;

  const getComplianceStatus = () => {
    if (complianceRate >= 95) return { status: 'excellent', color: 'green', icon: CheckCircle };
    if (complianceRate >= 80) return { status: 'good', color: 'blue', icon: CheckCircle };
    if (complianceRate >= 60) return { status: 'warning', color: 'yellow', icon: AlertTriangle };
    return { status: 'critical', color: 'red', icon: AlertTriangle };
  };

  const compliance = getComplianceStatus();

  return (
    <div className="space-y-6">
      {/* Aktuelle Rechtslage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-[#14ad9f]" />
            Deutsche E-Rechnungs-Rechtslage
          </CardTitle>
          <CardDescription>Aktueller Status der E-Rechnungspflicht nach UStG §14</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {transitionPhase.phase}
              </h4>
              <p className="text-sm text-gray-600">{transitionPhase.description}</p>
              {transitionPhase.endDate && (
                <Badge variant="outline">Bis {transitionPhase.endDate}</Badge>
              )}
            </div>

            {transitionPhase.isSmallBusinessExtended && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Kleine Unternehmen
                </h4>
                <p className="text-sm text-gray-600">Erweiterte Übergangsregelung bis 31.12.2027</p>
                <Badge className="bg-blue-100 text-blue-800">Umsatz ≤ 800.000€</Badge>
              </div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Rechtliche Grundlagen:</strong> UStG §14 (E-Rechnungspflicht), BMF-Schreiben
              vom 15.10.2024, EN 16931 (Europäischer Standard), Übergangsregelungen bis 2026/2027
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Compliance-Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#14ad9f]" />
            Ihr Compliance-Status
          </CardTitle>
          <CardDescription>Bewertung Ihrer E-Rechnungs-Konformität</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <compliance.icon className={`h-8 w-8 text-${compliance.color}-600`} />
              </div>
              <h4 className="font-medium">Konformitätsrate</h4>
              <p className="text-2xl font-bold">{complianceRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">
                {compliantInvoices} von {totalInvoices} E-Rechnungen
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-8 w-8 text-[#14ad9f]" />
              </div>
              <h4 className="font-medium">Versendungen</h4>
              <p className="text-2xl font-bold">{sentInvoices}</p>
              <p className="text-sm text-gray-600">UStG-konform übertragen</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-medium">Aufbewahrung</h4>
              <p className="text-2xl font-bold">8 Jahre</p>
              <p className="text-sm text-gray-600">UStG §14b Pflicht</p>
            </div>
          </div>

          {complianceRate < 100 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Handlungsbedarf:</strong> {totalInvoices - compliantInvoices} E-Rechnungen
                entsprechen noch nicht vollständig den UStG §14 Anforderungen. Überprüfen Sie diese
                vor der Versendung.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Rechtliche Anforderungen Checkliste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#14ad9f]" />
            UStG §14 Anforderungen
          </CardTitle>
          <CardDescription>Pflichtfelder für elektronische Rechnungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Grundlegende Pflichtangaben</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Fortlaufende Rechnungsnummer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Ausstellungsdatum</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Vollständige Anschrift Aussteller</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Vollständige Anschrift Empfänger</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Steuernummer oder USt-IdNr.</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Format-Anforderungen</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Strukturiertes elektronisches Format</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Elektronische Verarbeitung möglich</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>EN 16931 konform oder vereinbart</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>ZUGFeRD oder XRechnung Format</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Übertragungsnachweis (8 Jahre)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ausnahmen und Besonderheiten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-[#14ad9f]" />
            Ausnahmen und Besonderheiten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span>
                <strong>B2C-Rechnungen:</strong> Keine E-Rechnungspflicht an Endverbraucher
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span>
                <strong>Kleinbeträge:</strong> Bis 250€ keine E-Rechnungspflicht
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span>
                <strong>Kleinunternehmer:</strong> Ausnahme bei Leistungserbringung
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span>
                <strong>Steuerfreie Umsätze:</strong> Teilweise ausgenommen (§4 Nr. 8-29 UStG)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span>
                <strong>B2G-Rechnungen:</strong> Separate Regelungen über E-RechV (ZRE/OZG-RE)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
