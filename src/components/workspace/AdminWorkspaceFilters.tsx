'use client';

import React from 'react';
import { X, Shield, Database, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { AdminWorkspace } from '@/services/AdminWorkspaceService';

interface AdminWorkspaceFiltersProps {
  allTags: string[];
  selectedTags: string[];
  selectedStatus: string[];
  selectedPriority: string[];
  selectedSystemLevel: string[];
  onTagsChange: (tags: string[]) => void;
  onStatusChange: (status: string[]) => void;
  onPriorityChange: (priority: string[]) => void;
  onSystemLevelChange: (systemLevel: string[]) => void;
  onClose: () => void;
}

export function AdminWorkspaceFilters({
  allTags,
  selectedTags,
  selectedStatus,
  selectedPriority,
  selectedSystemLevel,
  onTagsChange,
  onStatusChange,
  onPriorityChange,
  onSystemLevelChange,
  onClose,
}: AdminWorkspaceFiltersProps) {
  const statusOptions = [
    { value: 'active', label: 'Aktiv' },
    { value: 'completed', label: 'Abgeschlossen' },
    { value: 'paused', label: 'Pausiert' },
    { value: 'archived', label: 'Archiviert' },
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Dringend' },
    { value: 'high', label: 'Hoch' },
    { value: 'medium', label: 'Mittel' },
    { value: 'low', label: 'Niedrig' },
  ];

  const systemLevelOptions = [
    { value: 'platform', label: 'Platform', icon: Shield },
    { value: 'company', label: 'Company', icon: Users },
    { value: 'user', label: 'User', icon: Activity },
    { value: 'system', label: 'System', icon: Database },
  ];

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleStatusToggle = (status: string) => {
    if (selectedStatus.includes(status)) {
      onStatusChange(selectedStatus.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatus, status]);
    }
  };

  const handlePriorityToggle = (priority: string) => {
    if (selectedPriority.includes(priority)) {
      onPriorityChange(selectedPriority.filter(p => p !== priority));
    } else {
      onPriorityChange([...selectedPriority, priority]);
    }
  };

  const handleSystemLevelToggle = (systemLevel: string) => {
    if (selectedSystemLevel.includes(systemLevel)) {
      onSystemLevelChange(selectedSystemLevel.filter(s => s !== systemLevel));
    } else {
      onSystemLevelChange([...selectedSystemLevel, systemLevel]);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filter</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* System Level Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">System Level</h4>
          <div className="space-y-2">
            {systemLevelOptions.map(option => {
              const IconComponent = option.icon;
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`systemLevel-${option.value}`}
                    checked={selectedSystemLevel.includes(option.value)}
                    onCheckedChange={() => handleSystemLevelToggle(option.value)}
                  />
                  <label
                    htmlFor={`systemLevel-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                  >
                    <IconComponent className="h-4 w-4" />
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Status</h4>
          <div className="space-y-2">
            {statusOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={selectedStatus.includes(option.value)}
                  onCheckedChange={() => handleStatusToggle(option.value)}
                />
                <label
                  htmlFor={`status-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Priorität</h4>
          <div className="space-y-2">
            {priorityOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${option.value}`}
                  checked={selectedPriority.includes(option.value)}
                  onCheckedChange={() => handlePriorityToggle(option.value)}
                />
                <label
                  htmlFor={`priority-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Tags</h4>
          <div className="space-y-2">
            {allTags.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Tags verfügbar</p>
            ) : (
              allTags.map(tag => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {tag}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            onTagsChange([]);
            onStatusChange([]);
            onPriorityChange([]);
            onSystemLevelChange([]);
          }}
        >
          Alle Filter zurücksetzen
        </Button>
        <Button onClick={onClose} className="bg-[#14ad9f] hover:bg-[#129488] text-white">
          Filter anwenden
        </Button>
      </div>
    </div>
  );
}
