'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  FileText,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import { GoBDComplianceReport } from '@/types/gobdTypes';
import { GoBDService } from '@/services/gobdService';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

interface ComplianceDashboardProps {
  companyId: string;
  userRole?: 'admin' | 'steuerberater' | 'user';
}

export function ComplianceDashboard({ companyId, userRole = 'user' }: ComplianceDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });
  
  const [report, setReport] = useState<GoBDComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadReport();
  }, [selectedPeriod, companyId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const complianceReport = await GoBDService.generateComplianceReport(companyId, selectedPeriod);
      setReport(complianceReport);
    } catch (error) {
      console.error('Failed to load compliance report:', error);
      toast.error('Compliance-Report konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      await loadReport();
      toast.success('Compliance-Report aktualisiert');
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error('Report-Generierung fehlgeschlagen');
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    
    const reportData = {
      ...report,
      exportDate: new Date().toISOString(),
      exportedBy: companyId
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gobd-compliance-${selectedPeriod}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Compliance-Report exportiert');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-700 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'non-compliant': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'non-compliant': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getIssueColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy', { locale: de });
    return { value, label };
  });

  if (loading && !report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#14ad9f]" />
            GoBD-Compliance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#14ad9f]" />
                GoBD-Compliance Dashboard
                {userRole === 'steuerberater' && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    Steuerberater-Ansicht
                  </Badge>
                )}
              </CardTitle>
              {report && (
                <p className="text-sm text-gray-600 mt-1">
                  Letzter Report: {format(report.generatedAt, 'dd.MM.yyyy HH:mm')}
                </p>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={generateReport}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generiere...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Aktualisieren
                    </>
                  )}
                </Button>
                
                {report && (
                  <Button
                    variant="outline"
                    onClick={exportReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {report && (
        <>
          {/* Status-Übersicht */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#14ad9f]" />
                Compliance-Status
                <Badge className={getStatusColor(report.status)}>
                  {getStatusIcon(report.status)}
                  <span className="ml-1 capitalize">{report.status}</span>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.summary.totalDocuments}
                  </div>
                  <p className="text-sm text-blue-700 flex items-center justify-center gap-1">
                    <FileText className="h-4 w-4" />
                    Gesamt-Dokumente
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {report.summary.lockedDocuments}
                  </div>
                  <p className="text-sm text-green-700 flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Festgeschrieben
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {report.summary.unlockedDocuments}
                  </div>
                  <p className="text-sm text-orange-700 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    Noch offen
                  </p>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {report.summary.overdueDocuments}
                  </div>
                  <p className="text-sm text-red-700 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Überfällig
                  </p>
                </div>
              </div>
              
              {/* Fortschrittsbalken */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Festschreibungs-Fortschritt</span>
                  <span className="text-sm text-gray-600">
                    {Math.round((report.summary.lockedDocuments / report.summary.totalDocuments) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(report.summary.lockedDocuments / report.summary.totalDocuments) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Compliance-Issues */}
          {report.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Compliance-Probleme
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                    {report.issues.length} Problem{report.issues.length !== 1 ? 'e' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Badge className={getIssueColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <div className="flex-1">
                          <h4 className="font-medium">{issue.message}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Betroffene Dokumente: {issue.documentIds.length}
                          </p>
                          {issue.resolution && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                              <strong>Lösung:</strong> {issue.resolution}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empfehlungen */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Empfehlungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-green-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Steuerberater-spezifische Informationen */}
          {userRole === 'steuerberater' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#14ad9f]" />
                  Steuerberater-Informationen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">DATEV-Export bereit</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Rechnungen:</span>
                        <span className="font-medium">{report.summary.lockedDocuments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Stornos:</span>
                        <span className="font-medium">{report.summary.stornoDocuments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Status:</span>
                        <Badge className={report.summary.unlockedDocuments === 0 ? 
                          "bg-green-100 text-green-700 border-green-200" :
                          "bg-orange-100 text-orange-700 border-orange-200"}>
                          {report.summary.unlockedDocuments === 0 ? 'Export möglich' : 'Unvollständig'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Prüfungshinweise</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Fortlaufende Nummerierung</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Unveränderbarkeit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.summary.overdueDocuments === 0 ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span>Zeitnahe Festschreibung</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Erfolgreiche Compliance */}
          {report.status === 'compliant' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Glückwunsch!</strong> Ihre Buchhaltung ist vollständig GoBD-konform. 
                Alle Dokumente sind ordnungsgemäß festgeschrieben.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}