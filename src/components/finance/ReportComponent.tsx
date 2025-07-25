'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Report {
  id: string;
  type: 'EÜR' | 'USTVA' | 'BWA' | 'CUSTOM';
  title: string;
  description?: string;
  status: 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  dateFrom: string;
  dateTo: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  language: string;
  generatedAt?: string;
  downloadUrl?: string;
  parameters?: Record<string, any>;
}

interface ReportComponentProps {
  reports: Report[];
}

export default function ReportComponent({ reports }: ReportComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Berichte</CardTitle>
        <CardDescription>Erstellen und verwalten Sie Finanzberichte</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.isArray(reports)
            ? reports.map(report => (
                <div
                  key={report.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{report.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {report.type} •{' '}
                      {report.generatedAt &&
                        (() => {
                          const date = new Date(report.generatedAt);
                          return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-DE');
                        })()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        const fromDate = new Date(report.dateFrom);
                        const toDate = new Date(report.dateTo);
                        const fromStr = isNaN(fromDate.getTime())
                          ? '-'
                          : fromDate.toLocaleDateString('de-DE');
                        const toStr = isNaN(toDate.getTime())
                          ? '-'
                          : toDate.toLocaleDateString('de-DE');
                        return `${fromStr} bis ${toStr}`;
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={report.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {report.status === 'COMPLETED'
                        ? 'Abgeschlossen'
                        : report.status === 'GENERATING'
                          ? 'Wird erstellt'
                          : report.status === 'FAILED'
                            ? 'Fehlgeschlagen'
                            : 'Entwurf'}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            : null}
        </div>
      </CardContent>
    </Card>
  );
}
