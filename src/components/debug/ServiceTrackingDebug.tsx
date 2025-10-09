'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceTrackingDebugger } from '@/services/serviceTrackingDebugger';
import { InvoiceInventoryRepair } from '@/services/invoiceInventoryRepair';
import { Badge } from '@/components/ui/badge';

interface ServiceTrackingDebugProps {
  companyId: string;
}

export function ServiceTrackingDebug({ companyId }: ServiceTrackingDebugProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [serviceCheck, setServiceCheck] = useState<any>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await ServiceTrackingDebugger.analyzeCompanyServices(companyId);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckService = async () => {
    if (!serviceId) return;
    setIsLoading(true);
    try {
      const result = await ServiceTrackingDebugger.checkService(companyId, serviceId);
      setServiceCheck(result);
    } catch (error) {
      console.error('Service check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualUpdate = async () => {
    if (!serviceId) return;
    setIsLoading(true);
    try {
      // Prüfe erst den Service-Typ
      const service = await ServiceTrackingDebugger.checkService(companyId, serviceId);
      if (service) {
        await ServiceTrackingDebugger.manualServiceUpdate(
          companyId,
          serviceId,
          service.type as 'servicePackage' | 'inlineService',
          1,
          200
        );

        // Refreshe die Analyse
        await handleAnalyze();
      }
    } catch (error) {
      console.error('Manual update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!serviceId) return;
    setIsLoading(true);
    try {
      // Prüfe erst den Service-Typ
      const service = await ServiceTrackingDebugger.checkService(companyId, serviceId);
      if (service) {
        await ServiceTrackingDebugger.simulateInvoiceUsage(
          companyId,
          serviceId,
          service.type as 'servicePackage' | 'inlineService',
          1,
          200
        );

        // Refreshe die Analyse
        await handleAnalyze();
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await ServiceTrackingDebugger.resetAllServiceStats(companyId);

      await handleAnalyze();
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 bg-yellow-50 border-yellow-200">
      <CardHeader>
        <CardTitle className="text-yellow-800">🔧 Service Tracking Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analyze Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            variant="outline"
            className="bg-blue-500 text-white hover:bg-blue-600">

            {isLoading ? 'Analysiere...' : 'Alle Services analysieren'}
          </Button>
          
          <Button
            onClick={handleReset}
            disabled={isLoading}
            variant="outline"
            className="bg-red-500 text-white hover:bg-red-600">

            Reset Stats
          </Button>
        </div>

        {/* Service ID Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Service ID eingeben (z.B. für Hochzeit Service)"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="flex-1" />

          <Button
            onClick={handleCheckService}
            disabled={isLoading || !serviceId}
            variant="outline">

            Prüfen
          </Button>
          <Button
            onClick={handleManualUpdate}
            disabled={isLoading || !serviceId}
            variant="outline"
            className="bg-green-500 text-white hover:bg-green-600">

            +1 Usage
          </Button>
          <Button
            onClick={handleSimulate}
            disabled={isLoading || !serviceId}
            variant="outline"
            className="bg-purple-500 text-white hover:bg-purple-600">

            Simulieren
          </Button>
        </div>

        {/* Analysis Results */}
        {analysis &&
        <div className="space-y-4">
            <h4 className="font-semibold text-yellow-800">ServicePackages:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysis.servicePackages.map((service: any) =>
            <div key={service.id} className="p-2 bg-white rounded border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{service.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="secondary">{service.usageCount || 0} Uses</Badge>
                      <Badge variant="outline">{service.totalRevenue || 0}€</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">ID: {service.id}</div>
                </div>
            )}
            </div>

            <h4 className="font-semibold text-yellow-800">Inline Services:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysis.inlineServices.map((service: any) =>
            <div key={service.id} className="p-2 bg-white rounded border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{service.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="secondary">{service.usageCount || 0} Uses</Badge>
                      <Badge variant="outline">{service.totalRevenue || 0}€</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">ID: {service.id}</div>
                </div>
            )}
            </div>
          </div>
        }

        {/* Service Check Result */}
        {serviceCheck &&
        <div className="p-3 bg-white rounded border">
            <h4 className="font-semibold mb-2">Service Check Result:</h4>
            <div className="space-y-1">
              <div>Type: <Badge>{serviceCheck.type}</Badge></div>
              <div>Name: <strong>{serviceCheck.data.name}</strong></div>
              <div>Usage Count: <Badge variant="secondary">{serviceCheck.data.usageCount || 0}</Badge></div>
              <div>Total Revenue: <Badge variant="outline">{serviceCheck.data.totalRevenue || 0}€</Badge></div>
              <div>Last Used: {serviceCheck.data.lastUsed ? new Date(serviceCheck.data.lastUsed.seconds * 1000).toLocaleString() : 'Nie'}</div>
            </div>
          </div>
        }
      </CardContent>
    </Card>);

}