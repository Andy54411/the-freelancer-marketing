'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  Settings,
  Lock,
  FileX,
  BarChart3,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

// Import der modularen Komponenten
import { AutoLockSettings } from './AutoLockSettings';
import { SevDeskLockManager } from './SevDeskLockManager';
import { StornoManager } from './StornoManager';
import { ComplianceDashboard } from './ComplianceDashboard';

// Mock-Dokument für Demo-Zwecke
const mockDocument = {
  id: 'invoice-123',
  documentNumber: 'RE-2025-001',
  documentType: 'invoice' as const,
  createdAt: new Date('2025-10-15'),
  amount: 1190.00,
  customerId: 'customer-1',
  companyId: 'company-1',
  gobdStatus: {
    isLocked: true,
    lockedAt: new Date('2025-10-20'),
    lockedBy: 'user-1',
    lockReason: 'auto' as const,
    auditTrail: []
  }
};

interface GoBDSystemProps {
  companyId: string;
  userRole?: 'admin' | 'steuerberater' | 'user';
  className?: string;
}

export function GoBDSystem({ companyId, userRole = 'user', className }: GoBDSystemProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    {
      id: 'dashboard',
      label: 'Compliance-Übersicht',
      icon: <BarChart3 className="h-4 w-4" />,
      component: <ComplianceDashboard companyId={companyId} userRole={userRole} />
    },
    {
      id: 'settings',
      label: 'Auto-Festschreibung',
      icon: <Settings className="h-4 w-4" />,
      component: <AutoLockSettings companyId={companyId} />
    },
    {
      id: 'manual',
      label: 'Manuelle Festschreibung',
      icon: <Lock className="h-4 w-4" />,
      component: <SevDeskLockManager companyId={companyId} />
    },
    {
      id: 'storno',
      label: 'Storno & Gutschrift',
      icon: <FileX className="h-4 w-4" />,
      component: <StornoManager companyId={companyId} document={mockDocument} />
    }
  ];

  return (
    <div className={className}>
      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#14ad9f]/10 rounded-lg">
              <Shield className="h-6 w-6 text-[#14ad9f]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                GoBD-Festschreibungssystem
              </h1>
              <p className="text-gray-600">
                Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Shield className="h-3 w-3 mr-1" />
              GoBD-konform
            </Badge>
            <p className="text-sm text-gray-500 mt-1">
              Automatische Compliance-Sicherung
            </p>
          </div>
        </div>
      </Card>

      {/* Info-Banner für neue Benutzer */}
      <Card className="p-4 mb-6 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-1">
              Was ist GoBD-Festschreibung?
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Die GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern) 
              schreibt vor, dass Buchungsdaten unveränderbar gemacht werden müssen. 
              Taskilo automatisiert diesen Prozess für Sie.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Automatische Festschreibung bei Versand</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>30-Tage-Regel wird automatisch eingehalten</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Vollständige Audit-Trail Dokumentation</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Hauptinhalt mit Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 text-sm"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer-Hinweise */}
      <Card className="p-4 mt-6 border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <strong>Wichtiger Hinweis:</strong> Festgeschriebene Dokumente können nicht mehr 
            verändert oder gelöscht werden. Für Korrekturen nutzen Sie die Storno- oder 
            Gutschrift-Funktionen.
          </span>
        </div>
      </Card>
    </div>
  );
}