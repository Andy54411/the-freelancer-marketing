'use client';

import React from 'react';
import FinApiDebugComponent from '@/components/finapi/FinApiDebugComponent';
import { DatevDebugComponent } from '@/components/datev/DatevDebugComponent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube, Activity, Shield } from 'lucide-react';

export default function FinApiDebugPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-[#14ad9f]" />
          <h1 className="text-2xl font-bold text-gray-900">API Debug Center</h1>
        </div>
        <p className="text-gray-600">
          Comprehensive testing and debugging tools for finAPI and DATEV integrations
        </p>
      </div>

      <Tabs defaultValue="finapi" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="finapi" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            finAPI Debug
          </TabsTrigger>
          <TabsTrigger value="datev" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            DATEV Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finapi" className="mt-6">
          <FinApiDebugComponent />
        </TabsContent>

        <TabsContent value="datev" className="mt-6">
          <DatevDebugComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
