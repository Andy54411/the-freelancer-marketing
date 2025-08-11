'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Employee } from '@/services/personalService';
import VacationTab from './VacationTab';
import VacationSettingsTab from './VacationSettingsTab';

interface VacationContainerProps {
  employee: Employee;
  companyId: string;
  isEditing?: boolean;
  onUpdate?: (updates: Partial<Employee>) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
}

export default function VacationContainer({
  employee,
  companyId,
  isEditing = false,
  onUpdate,
  onSave,
  onCancel,
  onEdit,
}: VacationContainerProps) {
  const [activeSubTab, setActiveSubTab] = useState('overview');

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Urlaubsübersicht</TabsTrigger>
          <TabsTrigger value="settings">Urlaubseinstellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <VacationTab employee={employee} companyId={companyId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <VacationSettingsTab
            employee={employee}
            companyId={companyId}
            isEditing={isEditing}
            onUpdate={onUpdate}
            onSave={onSave}
            onCancel={onCancel}
            onEdit={onEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
