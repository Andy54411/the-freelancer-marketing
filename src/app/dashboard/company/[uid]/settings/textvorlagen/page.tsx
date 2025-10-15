'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TextTemplateModal from '@/components/settings/TextTemplateModal';
import { TextTemplateService } from '@/services/TextTemplateService';
import { TextTemplate, DOCUMENT_USAGE_OPTIONS } from '@/types/textTemplates';
import { FileText, Loader2, ArrowLeft, Plus, Edit, Trash2, Type } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TextvorlagenPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  // State
  const [textTemplates, setTextTemplates] = useState<TextTemplate[]>([]);
  const [textTemplateModalOpen, setTextTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TextTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTextTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Textvorlagen laden
  const loadTextTemplates = async () => {
    if (!uid || !user?.uid) return;

    try {
      setLoading(true);

      // Standard-Templates erstellen falls noch keine vorhanden
      await TextTemplateService.createDefaultTemplatesIfNeeded(uid, user.uid);

      const templates = await TextTemplateService.getTextTemplates(uid);
      setTextTemplates(templates);
    } catch (error) {
      console.error('Fehler beim Laden der Textvorlagen:', error);
      toast.error('Fehler beim Laden der Textvorlagen');
    } finally {
      setLoading(false);
    }
  };

  // Textvorlagen Handler
  const handleCreateTextTemplate = async (
    templateData: Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    await TextTemplateService.createTextTemplate(templateData);
    await loadTextTemplates();
  };

  const handleUpdateTextTemplate = async (
    templateData: Omit<TextTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!editingTemplate || !uid) return;
    await TextTemplateService.updateTextTemplate(uid, editingTemplate.id, templateData);
    await loadTextTemplates();
    setEditingTemplate(null);
  };

  const handleDeleteTextTemplate = async (templateId: string) => {
    if (!uid) return;
    try {
      await TextTemplateService.deleteTextTemplate(uid, templateId);
      await loadTextTemplates();
      toast.success('Textvorlage erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen der Textvorlage');
    }
  };

  const openEditModal = (template: TextTemplate) => {
    setEditingTemplate(template);
    setTextTemplateModalOpen(true);
  };

  const closeModal = () => {
    setTextTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  // Hilfsfunktionen für SevDesk-ähnliches Layout
  const getTemplateTypeDisplay = (template: TextTemplate) => {
    const usage = DOCUMENT_USAGE_OPTIONS.find(opt => opt.value === template.objectType)?.label;
    const position =
      template.textType === 'HEAD'
        ? 'Kopf-Text'
        : template.textType === 'FOOT'
          ? 'Fuß-Text'
          : template.textType === 'BODY'
            ? 'Nachricht'
            : 'Betreff';

    if (template.category === 'EMAIL') {
      return `E-Mail (${usage}) ${position}`;
    }
    return `${usage} ${position}`;
  };

  const getTextPreview = (text: string, maxLength: number = 60) => {
    // HTML-Tags entfernen und Text kürzen
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/\n/g, ' ')
      .trim();
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Link
              href={`/dashboard/company/${uid}/settings`}
              className="inline-flex items-center text-[#14ad9f] hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Zurück zu Einstellungen
            </Link>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Type className="h-8 w-8 mr-3 text-[#14ad9f]" />
                Textvorlagen
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Verwalten Sie wiederverwendbare Textbausteine für Ihre Dokumente und E-Mails
              </p>
            </div>
            <Button
              onClick={() => setTextTemplateModalOpen(true)}
              className="bg-[#14ad9f] hover:bg-teal-600"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Textvorlage erstellen
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
          </div>
        ) : (
          <>
            {textTemplates.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="text-center py-16">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Noch keine Textvorlagen
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Erstellen Sie Ihre erste Textvorlage, um Zeit bei der Dokumentenerstellung zu
                    sparen.
                  </p>
                  <Button
                    onClick={() => setTextTemplateModalOpen(true)}
                    className="bg-[#14ad9f] hover:bg-teal-600"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Erste Textvorlage erstellen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* SevDesk-ähnliche Tabelle */
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Type className="h-5 w-5 mr-2 text-[#14ad9f]" />
                    Alle Textvorlagen ({textTemplates.length})
                  </CardTitle>
                  <CardDescription>
                    Verwalten Sie Ihre wiederverwendbaren Textbausteine
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead className="w-[250px]">Typ</TableHead>
                        <TableHead className="w-[300px]">Text-Vorschau</TableHead>
                        <TableHead className="w-[100px]">Standard</TableHead>
                        <TableHead className="w-[120px] text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {textTemplates.map(template => (
                        <TableRow key={template.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <span className="text-sm">{getTemplateTypeDisplay(template)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {getTextPreview(template.text)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {template.isDefault ? (
                              <span className="text-[#14ad9f] font-medium text-sm">Standard</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(template)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTextTemplate(template.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Modal */}
        <TextTemplateModal
          isOpen={textTemplateModalOpen}
          onClose={closeModal}
          onSave={editingTemplate ? handleUpdateTextTemplate : handleCreateTextTemplate}
          template={editingTemplate}
          companyId={uid}
          userId={user?.uid || ''}
        />
      </div>
    </div>
  );
}
