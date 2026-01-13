'use client';

import { cn } from '@/lib/utils';
import { Tag, Plus, Trash2, Eye, EyeOff, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import type { SettingsTabProps } from './types';

interface Label {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  showInMessageList: boolean;
}

const defaultLabels: Label[] = [
  { id: 'inbox', name: 'Posteingang', color: '#4285f4', visible: true, showInMessageList: true },
  { id: 'starred', name: 'Markiert', color: '#fbbc04', visible: true, showInMessageList: true },
  { id: 'snoozed', name: 'Zurückgestellt', color: '#ea4335', visible: true, showInMessageList: true },
  { id: 'important', name: 'Wichtig', color: '#fbbc04', visible: true, showInMessageList: true },
  { id: 'sent', name: 'Gesendet', color: '#34a853', visible: true, showInMessageList: true },
  { id: 'drafts', name: 'Entwürfe', color: '#9e9e9e', visible: true, showInMessageList: true },
  { id: 'spam', name: 'Spam', color: '#ea4335', visible: true, showInMessageList: false },
  { id: 'trash', name: 'Papierkorb', color: '#9e9e9e', visible: true, showInMessageList: false },
];

const labelColors = [
  '#ea4335', '#fbbc04', '#34a853', '#4285f4', '#9334e6', 
  '#e91e63', '#00bcd4', '#ff5722', '#795548', '#607d8b'
];

export function LabelsSettings({ isDark }: SettingsTabProps) {
  const [labels, setLabels] = useState<Label[]>(defaultLabels);
  const [newLabelName, setNewLabelName] = useState('');
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    
    const newLabel: Label = {
      id: `custom-${Date.now()}`,
      name: newLabelName.trim(),
      color: labelColors[Math.floor(Math.random() * labelColors.length)],
      visible: true,
      showInMessageList: true,
    };
    
    setLabels([...labels, newLabel]);
    setNewLabelName('');
  };

  const handleDeleteLabel = (id: string) => {
    if (defaultLabels.some(l => l.id === id)) return; // Systemlabels nicht löschen
    setLabels(labels.filter(l => l.id !== id));
  };

  const toggleVisibility = (id: string, field: 'visible' | 'showInMessageList') => {
    setLabels(labels.map(l => 
      l.id === id ? { ...l, [field]: !l[field] } : l
    ));
  };

  return (
    <div className="space-y-4">
      {/* Labels-Übersicht */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h3 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Labels
        </h3>
        <p className={cn(
          "text-xs mb-4",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          Labels helfen Ihnen dabei, Ihre E-Mails zu organisieren. Sie können Labels erstellen, umbenennen und löschen.
        </p>
      </div>

      {/* Systemlabels */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h4 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          System-Labels
        </h4>
        <div className="space-y-1">
          <div className={cn(
            "grid grid-cols-12 gap-2 pb-2 text-xs font-medium",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            <div className="col-span-5">Label</div>
            <div className="col-span-3 text-center">In Labelliste anzeigen</div>
            <div className="col-span-3 text-center">In Nachrichtenliste anzeigen</div>
            <div className="col-span-1"></div>
          </div>
          
          {labels.filter(l => defaultLabels.some(dl => dl.id === l.id)).map((label) => (
            <div 
              key={label.id}
              className={cn(
                "grid grid-cols-12 gap-2 py-1.5 items-center text-xs rounded",
                isDark ? "hover:bg-[#3c4043]" : "hover:bg-gray-50"
              )}
            >
              <div className="col-span-5 flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: label.color }}
                />
                <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                  {label.name}
                </span>
              </div>
              <div className="col-span-3 flex justify-center">
                <button
                  onClick={() => toggleVisibility(label.id, 'visible')}
                  className={cn(
                    "p-1 rounded hover:bg-opacity-80",
                    label.visible 
                      ? "text-[#14ad9f]" 
                      : isDark ? "text-gray-500" : "text-gray-400"
                  )}
                >
                  {label.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="col-span-3 flex justify-center">
                <button
                  onClick={() => toggleVisibility(label.id, 'showInMessageList')}
                  className={cn(
                    "p-1 rounded hover:bg-opacity-80",
                    label.showInMessageList 
                      ? "text-[#14ad9f]" 
                      : isDark ? "text-gray-500" : "text-gray-400"
                  )}
                >
                  {label.showInMessageList ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="col-span-1"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Benutzerdefinierte Labels */}
      <div className={cn(
        "py-2 border-b",
        isDark ? "border-[#3c4043]" : "border-gray-200"
      )}>
        <h4 className={cn(
          "text-xs font-medium mb-3",
          isDark ? "text-gray-300" : "text-gray-700"
        )}>
          Benutzerdefinierte Labels
        </h4>
        
        {labels.filter(l => !defaultLabels.some(dl => dl.id === l.id)).length > 0 ? (
          <div className="space-y-1 mb-4">
            {labels.filter(l => !defaultLabels.some(dl => dl.id === l.id)).map((label) => (
              <div 
                key={label.id}
                className={cn(
                  "grid grid-cols-12 gap-2 py-1.5 items-center text-xs rounded",
                  isDark ? "hover:bg-[#3c4043]" : "hover:bg-gray-50"
                )}
              >
                <div className="col-span-5 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: label.color }}
                  />
                  {editingLabel === label.id ? (
                    <Input
                      value={label.name}
                      onChange={(e) => setLabels(labels.map(l => 
                        l.id === label.id ? { ...l, name: e.target.value } : l
                      ))}
                      onBlur={() => setEditingLabel(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingLabel(null)}
                      autoFocus
                      className={cn(
                        "h-6 text-xs",
                        isDark ? "bg-[#3c4043] border-[#5f6368] text-white" : "bg-white border-gray-300"
                      )}
                    />
                  ) : (
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>
                      {label.name}
                    </span>
                  )}
                </div>
                <div className="col-span-3 flex justify-center">
                  <button
                    onClick={() => toggleVisibility(label.id, 'visible')}
                    className={cn(
                      "p-1 rounded hover:bg-opacity-80",
                      label.visible 
                        ? "text-[#14ad9f]" 
                        : isDark ? "text-gray-500" : "text-gray-400"
                    )}
                  >
                    {label.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="col-span-3 flex justify-center">
                  <button
                    onClick={() => toggleVisibility(label.id, 'showInMessageList')}
                    className={cn(
                      "p-1 rounded hover:bg-opacity-80",
                      label.showInMessageList 
                        ? "text-[#14ad9f]" 
                        : isDark ? "text-gray-500" : "text-gray-400"
                    )}
                  >
                    {label.showInMessageList ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="col-span-1 flex justify-center gap-1">
                  <button
                    onClick={() => setEditingLabel(label.id)}
                    className={cn(
                      "p-1 rounded hover:bg-opacity-80",
                      isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteLabel(label.id)}
                    className={cn(
                      "p-1 rounded hover:bg-opacity-80",
                      isDark ? "text-gray-400 hover:text-red-400" : "text-gray-500 hover:text-red-600"
                    )}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn(
            "text-xs mb-4",
            isDark ? "text-gray-500" : "text-gray-400"
          )}>
            Keine benutzerdefinierten Labels vorhanden.
          </p>
        )}

        {/* Neues Label erstellen */}
        <div className="flex gap-2 items-center">
          <Tag className={cn(
            "w-4 h-4",
            isDark ? "text-gray-500" : "text-gray-400"
          )} />
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
            placeholder="Neues Label erstellen"
            className={cn(
              "h-7 text-xs flex-1 max-w-xs",
              isDark ? "bg-[#3c4043] border-[#5f6368] text-white placeholder:text-gray-500" : "bg-white border-gray-300"
            )}
          />
          <Button
            onClick={handleAddLabel}
            disabled={!newLabelName.trim()}
            size="sm"
            className="h-7 text-xs bg-[#14ad9f] hover:bg-teal-700"
          >
            <Plus className="w-3 h-3 mr-1" />
            Erstellen
          </Button>
        </div>
      </div>

      {/* Hinweis */}
      <div className={cn(
        "py-2 text-xs",
        isDark ? "text-gray-500" : "text-gray-400"
      )}>
        <p>
          Hinweis: System-Labels können nicht gelöscht werden. Sie können jedoch die Sichtbarkeit anpassen.
        </p>
      </div>
    </div>
  );
}
