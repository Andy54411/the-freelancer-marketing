'use client';

import React from 'react';
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminWorkspaceFiltersProps {
  allTags: string[];
  selectedTags: string[];
  selectedStatus: string[];
  selectedPriority: string[];
  onTagsChange: (tags: string[]) => void;
  onStatusChange: (status: string[]) => void;
  onPriorityChange: (priority: string[]) => void;
  onClose: () => void;
}

export function AdminWorkspaceFilters({
  allTags,
  selectedTags,
  selectedStatus,
  selectedPriority,
  onTagsChange,
  onStatusChange,
  onPriorityChange,
  onClose,
}: AdminWorkspaceFiltersProps) {
  const statusOptions = [
    { value: 'active', label: 'Aktiv', color: 'bg-green-100 text-green-800' },
    { value: 'paused', label: 'Pausiert', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'completed', label: 'Abgeschlossen', color: 'bg-blue-100 text-blue-800' },
    { value: 'archived', label: 'Archiviert', color: 'bg-gray-100 text-gray-800' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Niedrig', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Mittel', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'Hoch', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Dringend', color: 'bg-red-100 text-red-800' },
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

  const clearAllFilters = () => {
    onTagsChange([]);
    onStatusChange([]);
    onPriorityChange([]);
  };

  const hasActiveFilters =
    selectedTags.length > 0 || selectedStatus.length > 0 || selectedPriority.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Filter</h3>
          {hasActiveFilters && (
            <Badge variant="secondary">
              {selectedTags.length + selectedStatus.length + selectedPriority.length} aktiv
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-[#14ad9f] hover:text-taskilo-hover"
            >
              Alle löschen
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={selectedStatus.includes(option.value)}
                  onCheckedChange={() => handleStatusToggle(option.value)}
                />
                <label
                  htmlFor={`status-${option.value}`}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Badge variant="outline" className={option.color}>
                    {option.label}
                  </Badge>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Priority Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900">Priorität</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityOptions.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${option.value}`}
                  checked={selectedPriority.includes(option.value)}
                  onCheckedChange={() => handlePriorityToggle(option.value)}
                />
                <label
                  htmlFor={`priority-${option.value}`}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Badge variant="outline" className={option.color}>
                    {option.label}
                  </Badge>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tags Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900">
              Tags {allTags.length > 0 && `(${allTags.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allTags.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Keine Tags verfügbar</p>
            ) : (
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {allTags.map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <label
                      htmlFor={`tag-${tag}`}
                      className="text-sm cursor-pointer hover:text-[#14ad9f] transition-colors"
                    >
                      {tag}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Schnellfilter:</div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(['active'])}
              className={
                selectedStatus.includes('active') && selectedStatus.length === 1
                  ? 'bg-[#14ad9f] text-white'
                  : ''
              }
            >
              Nur Aktive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPriorityChange(['urgent', 'high'])}
              className={
                selectedPriority.includes('urgent') &&
                selectedPriority.includes('high') &&
                selectedPriority.length === 2
                  ? 'bg-[#14ad9f] text-white'
                  : ''
              }
            >
              Hohe Priorität
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(['completed'])}
              className={
                selectedStatus.includes('completed') && selectedStatus.length === 1
                  ? 'bg-[#14ad9f] text-white'
                  : ''
              }
            >
              Abgeschlossen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
