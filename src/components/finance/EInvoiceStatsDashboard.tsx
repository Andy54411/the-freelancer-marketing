/**
 * Erweiterte E-Rechnungs-Statistiken Dashboard
 * Zeigt detaillierte Metriken und Trends für deutsche E-Rechnungen
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Send,
  Archive,
  Euro,
  Calendar,
  Users,
  Building,
} from 'lucide-react';

interface EInvoiceStatsData {
  totalInvoices: number;
  validInvoices: number;
  sentInvoices: number;
  pendingInvoices: number;
  totalAmount: number;
  averageProcessingTime: number;
  complianceRate: number;
  monthlyGrowth: number;
  formatDistribution: {
    zugferd: number;
    xrechnung: number;
  };
  transmissionMethods: {
    email: number;
    webservice: number;
    portal: number;
  };
  recipientTypes: {
    business: number;
    government: number;
  };
}

interface EInvoiceStatsDashboardProps {
  data: EInvoiceStatsData;
}

export function EInvoiceStatsDashboard({ data }: EInvoiceStatsDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-blue-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? TrendingUp : TrendingDown;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Haupt-Kennzahlen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-[#14ad9f]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">E-Rechnungen gesamt</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalInvoices}</p>
                <div className="flex items-center mt-1">
                  {React.createElement(getGrowthIcon(data.monthlyGrowth), {
                    className: `h-4 w-4 mr-1 ${getGrowthColor(data.monthlyGrowth)}`,
                  })}
                  <span className={`text-sm ${getGrowthColor(data.monthlyGrowth)}`}>
                    {formatPercentage(Math.abs(data.monthlyGrowth))} vs. Vormonat
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">UStG-konform</p>
                <p className="text-2xl font-bold text-gray-900">{data.validInvoices}</p>
                <p className={`text-sm font-medium ${getComplianceColor(data.complianceRate)}`}>
                  {formatPercentage(data.complianceRate)} Compliance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Send className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Versendet</p>
                <p className="text-2xl font-bold text-gray-900">{data.sentInvoices}</p>
                <p className="text-sm text-gray-600">{data.pendingInvoices} ausstehend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Euro className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gesamtwert</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.totalAmount)}
                </p>
                <p className="text-sm text-gray-600">
                  Ø {formatCurrency(data.totalAmount / data.totalInvoices)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailstatistiken */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format-Verteilung */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-[#14ad9f]" />
              Format-Verteilung
            </CardTitle>
            <CardDescription>Verwendung von ZUGFeRD vs. XRechnung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">ZUGFeRD</span>
                <span className="text-sm text-gray-600">
                  {data.formatDistribution.zugferd} (
                  {formatPercentage((data.formatDistribution.zugferd / data.totalInvoices) * 100)})
                </span>
              </div>
              <Progress
                value={(data.formatDistribution.zugferd / data.totalInvoices) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">XRechnung</span>
                <span className="text-sm text-gray-600">
                  {data.formatDistribution.xrechnung} (
                  {formatPercentage((data.formatDistribution.xrechnung / data.totalInvoices) * 100)}
                  )
                </span>
              </div>
              <Progress
                value={(data.formatDistribution.xrechnung / data.totalInvoices) * 100}
                className="h-2"
              />
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Empfehlung:</strong> ZUGFeRD für B2B-Geschäfte, XRechnung für
                Behördenverkehr (B2G)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Übertragungsmethoden */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-[#14ad9f]" />
              Übertragungsmethoden
            </CardTitle>
            <CardDescription>Wie E-Rechnungen versendet werden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">E-Mail</span>
                <span className="text-sm text-gray-600">
                  {data.transmissionMethods.email} (
                  {formatPercentage((data.transmissionMethods.email / data.sentInvoices) * 100)})
                </span>
              </div>
              <Progress
                value={(data.transmissionMethods.email / data.sentInvoices) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Webservice</span>
                <span className="text-sm text-gray-600">
                  {data.transmissionMethods.webservice} (
                  {formatPercentage(
                    (data.transmissionMethods.webservice / data.sentInvoices) * 100
                  )}
                  )
                </span>
              </div>
              <Progress
                value={(data.transmissionMethods.webservice / data.sentInvoices) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Portal</span>
                <span className="text-sm text-gray-600">
                  {data.transmissionMethods.portal} (
                  {formatPercentage((data.transmissionMethods.portal / data.sentInvoices) * 100)})
                </span>
              </div>
              <Progress
                value={(data.transmissionMethods.portal / data.sentInvoices) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Empfängertypen */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#14ad9f]" />
              Empfängertypen
            </CardTitle>
            <CardDescription>B2B vs. B2G Verteilung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Unternehmen (B2B)</span>
              </div>
              <div className="text-right">
                <p className="font-medium">{data.recipientTypes.business}</p>
                <p className="text-sm text-gray-600">
                  {formatPercentage((data.recipientTypes.business / data.totalInvoices) * 100)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Behörden (B2G)</span>
              </div>
              <div className="text-right">
                <p className="font-medium">{data.recipientTypes.government}</p>
                <p className="text-sm text-gray-600">
                  {formatPercentage((data.recipientTypes.government / data.totalInvoices) * 100)}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Hinweis:</strong> B2G-Rechnungen unterliegen besonderen
                Übermittlungsvorschriften (E-RechV, ZRE)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance-Metriken */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#14ad9f]" />
              Performance-Metriken
            </CardTitle>
            <CardDescription>Verarbeitungszeiten und Effizienz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Ø Bearbeitungszeit</p>
                <p className="text-xl font-bold text-gray-900">{data.averageProcessingTime}h</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Fehlerrate</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPercentage(100 - data.complianceRate)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Compliance-Ziel 2025</h4>
              <Progress value={data.complianceRate} className="h-2" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Aktuell: {formatPercentage(data.complianceRate)}</span>
                <span>Ziel: 95%</span>
              </div>
            </div>

            {data.complianceRate < 95 && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    <strong>Handlungsbedarf:</strong> {(95 - data.complianceRate).toFixed(1)}%
                    Verbesserung für UStG-Compliance erforderlich
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
