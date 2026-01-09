'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Plus, FileText } from 'lucide-react';
import { EmailTemplate } from './types';

interface EmailTemplatesProps {
  companyId: string;
  templates: EmailTemplate[];
  onCreateTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTemplate: (templateId: string, template: Partial<EmailTemplate>) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function EmailTemplates({ 
  companyId: _companyId, 
  templates, 
  onCreateTemplate, 
  onUpdateTemplate: _onUpdateTemplate, 
  onDeleteTemplate 
}: EmailTemplatesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [_editingId, setEditingId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'custom' as const,
    isDefault: false
  });

  const handleCreate = () => {
    if (newTemplate.name && newTemplate.subject && newTemplate.body) {
      onCreateTemplate(newTemplate);
      setNewTemplate({
        name: '',
        subject: '',
        body: '',
        type: 'custom',
        isDefault: false
      });
      setIsCreating(false);
    }
  };

  const templateTypeLabels = {
    invoice: 'Rechnung',
    quote: 'Angebot',
    reminder: 'Erinnerung',
    custom: 'Benutzerdefiniert'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-[#14ad9f]" />
            E-Mail-Vorlagen
          </CardTitle>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Vorlage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Create Template Form */}
        {isCreating && (
          <Card className="mb-6 border-[#14ad9f]">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Vorlagen-Name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Select value={newTemplate.type} onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Rechnung</SelectItem>
                      <SelectItem value="quote">Angebot</SelectItem>
                      <SelectItem value="reminder">Erinnerung</SelectItem>
                      <SelectItem value="custom">Benutzerdefiniert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Input
                  placeholder="E-Mail-Betreff"
                  value={newTemplate.subject}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                />
                
                <Textarea
                  placeholder="E-Mail-Text..."
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, body: e.target.value }))}
                  rows={6}
                />
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreate} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
                    Erstellen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates List */}
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Noch keine E-Mail-Vorlagen erstellt</p>
              <p className="text-sm">Erstellen Sie Ihre erste Vorlage für wiederkehrende E-Mails</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        <Badge variant={template.isDefault ? "default" : "secondary"}>
                          {templateTypeLabels[template.type]}
                        </Badge>
                        {template.isDefault && (
                          <Badge className="bg-[#14ad9f] text-white">
                            Standard
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Betreff:</strong> {template.subject}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {template.body}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(template.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => onDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}