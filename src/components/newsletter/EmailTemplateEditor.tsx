'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Type,
  Image,
  Square,
  Columns,
  Link2,
  List,
  Minus,
  MousePointerClick,
  Eye,
  Code,
  Smartphone,
  Monitor,
  Palette,
  Save,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings,
  Undo,
  Redo,
} from 'lucide-react';
import { toast } from 'sonner';

// Block Types
type BlockType = 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'spacer' | 'social' | 'footer';

interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, unknown>;
  styles: Record<string, string>;
}

interface EmailTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template?: {
    id?: string;
    name: string;
    description: string;
    category: string;
    htmlContent: string;
  } | null;
  onSave: (template: {
    name: string;
    description: string;
    category: string;
    htmlContent: string;
  }) => Promise<void>;
}

// Default Blocks Configuration
const blockConfigs: Record<BlockType, { icon: React.ElementType; label: string; defaultContent: Record<string, unknown>; defaultStyles: Record<string, string> }> = {
  header: {
    icon: Type,
    label: 'Überschrift',
    defaultContent: { text: 'Überschrift hier eingeben', level: 'h1' },
    defaultStyles: { color: '#111827', fontSize: '28px', fontWeight: '700', textAlign: 'center', padding: '20px' },
  },
  text: {
    icon: Type,
    label: 'Text',
    defaultContent: { text: 'Ihr Text hier. Verwenden Sie {{firstName}}, {{lastName}} oder {{email}} für Personalisierung.' },
    defaultStyles: { color: '#4b5563', fontSize: '16px', lineHeight: '1.6', padding: '10px 20px' },
  },
  image: {
    icon: Image,
    label: 'Bild',
    defaultContent: { src: 'https://via.placeholder.com/600x200/14b8a6/ffffff?text=Ihr+Bild', alt: 'Bild', link: '' },
    defaultStyles: { width: '100%', borderRadius: '8px', padding: '10px 20px' },
  },
  button: {
    icon: MousePointerClick,
    label: 'Button',
    defaultContent: { text: 'Jetzt starten', link: 'https://taskilo.de' },
    defaultStyles: { 
      backgroundColor: '#14b8a6', 
      color: '#ffffff', 
      padding: '16px 32px', 
      borderRadius: '12px', 
      fontSize: '16px', 
      fontWeight: '600',
      textAlign: 'center',
      margin: '20px auto',
      display: 'block',
      width: 'fit-content',
    },
  },
  divider: {
    icon: Minus,
    label: 'Trennlinie',
    defaultContent: {},
    defaultStyles: { borderTop: '1px solid #e5e7eb', margin: '20px 40px' },
  },
  columns: {
    icon: Columns,
    label: '2 Spalten',
    defaultContent: { 
      left: 'Linke Spalte Inhalt',
      right: 'Rechte Spalte Inhalt',
    },
    defaultStyles: { padding: '20px', gap: '20px' },
  },
  spacer: {
    icon: Square,
    label: 'Abstand',
    defaultContent: { height: '40px' },
    defaultStyles: {},
  },
  social: {
    icon: Link2,
    label: 'Social Links',
    defaultContent: { 
      linkedin: 'https://linkedin.com/company/taskilo',
      twitter: '',
      facebook: '',
      instagram: '',
    },
    defaultStyles: { textAlign: 'center', padding: '20px' },
  },
  footer: {
    icon: List,
    label: 'Footer',
    defaultContent: { 
      company: 'Taskilo GmbH',
      address: 'Musterstraße 1, 12345 Berlin',
      unsubscribe: true,
    },
    defaultStyles: { 
      backgroundColor: '#f9fafb', 
      padding: '30px 40px', 
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: '14px',
    },
  },
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// Parse existing HTML to blocks (simplified)
const parseHtmlToBlocks = (html: string): EmailBlock[] => {
  if (!html) return getDefaultBlocks();
  
  // For existing templates, create a single HTML block
  // A full parser would be more complex
  return [{
    id: generateId(),
    type: 'text',
    content: { text: 'Vorlage aus HTML importiert. Bearbeiten Sie im Code-Tab oder erstellen Sie neue Blöcke.' },
    styles: blockConfigs.text.defaultStyles,
  }];
};

// Get default blocks for new template
const getDefaultBlocks = (): EmailBlock[] => [
  {
    id: generateId(),
    type: 'header',
    content: { text: 'Willkommen bei Taskilo!', level: 'h1' },
    styles: blockConfigs.header.defaultStyles,
  },
  {
    id: generateId(),
    type: 'text',
    content: { text: 'Hallo {{firstName}},\n\nvielen Dank für Ihr Interesse! Hier ist Ihr Newsletter-Inhalt.' },
    styles: blockConfigs.text.defaultStyles,
  },
  {
    id: generateId(),
    type: 'button',
    content: { text: 'Mehr erfahren', link: 'https://taskilo.de' },
    styles: blockConfigs.button.defaultStyles,
  },
  {
    id: generateId(),
    type: 'footer',
    content: blockConfigs.footer.defaultContent,
    styles: blockConfigs.footer.defaultStyles,
  },
];

// Convert blocks to HTML
const blocksToHtml = (blocks: EmailBlock[]): string => {
  const renderBlock = (block: EmailBlock): string => {
    const { type, content, styles } = block;
    const styleStr = Object.entries(styles).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`).join(';');

    switch (type) {
      case 'header':
        const level = (content.level as string) || 'h1';
        return `<${level} style="${styleStr}">${content.text}</${level}>`;
      
      case 'text':
        return `<p style="${styleStr}">${(content.text as string).replace(/\n/g, '<br>')}</p>`;
      
      case 'image':
        const imgHtml = `<img src="${content.src}" alt="${content.alt}" style="${styleStr}" />`;
        return content.link ? `<a href="${content.link}">${imgHtml}</a>` : imgHtml;
      
      case 'button':
        return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px auto;"><tr><td style="border-radius:${styles.borderRadius || '12px'};background:${styles.backgroundColor || '#14b8a6'};"><a href="${content.link}" style="display:inline-block;padding:${styles.padding || '16px 32px'};color:${styles.color || '#ffffff'};text-decoration:none;font-weight:${styles.fontWeight || '600'};font-size:${styles.fontSize || '16px'};">${content.text}</a></td></tr></table>`;
      
      case 'divider':
        return `<hr style="${styleStr}" />`;
      
      case 'columns':
        return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="48%" style="padding:20px;vertical-align:top;">${content.left}</td><td width="4%"></td><td width="48%" style="padding:20px;vertical-align:top;">${content.right}</td></tr></table>`;
      
      case 'spacer':
        return `<div style="height:${content.height};"></div>`;
      
      case 'social':
        const links: string[] = [];
        if (content.linkedin) links.push(`<a href="${content.linkedin}" style="color:#14b8a6;margin:0 10px;">LinkedIn</a>`);
        if (content.twitter) links.push(`<a href="${content.twitter}" style="color:#14b8a6;margin:0 10px;">Twitter</a>`);
        if (content.facebook) links.push(`<a href="${content.facebook}" style="color:#14b8a6;margin:0 10px;">Facebook</a>`);
        if (content.instagram) links.push(`<a href="${content.instagram}" style="color:#14b8a6;margin:0 10px;">Instagram</a>`);
        return `<div style="${styleStr}">${links.join('')}</div>`;
      
      case 'footer':
        return `<div style="${styleStr}"><p style="margin:0 0 10px;">${content.company}</p><p style="margin:0 0 10px;font-size:12px;">${content.address}</p>${content.unsubscribe ? '<p style="margin:0;font-size:12px;"><a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Abmelden</a></p>' : ''}</div>`;
      
      default:
        return '';
    }
  };

  const blocksHtml = blocks.map(renderBlock).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td>
${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export function EmailTemplateEditor({ isOpen, onClose, template, onSave }: EmailTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'general');
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => 
    template?.htmlContent ? parseHtmlToBlocks(template.htmlContent) : getDefaultBlocks()
  );
  const [htmlCode, setHtmlCode] = useState(template?.htmlContent || '');
  const [activeTab, setActiveTab] = useState<'design' | 'code'>('design');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<EmailBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Update HTML when blocks change
  const updateHtml = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    setHtmlCode(blocksToHtml(newBlocks));
    // Add to history
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newBlocks]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Add block
  const addBlock = (type: BlockType) => {
    const config = blockConfigs[type];
    const newBlock: EmailBlock = {
      id: generateId(),
      type,
      content: { ...config.defaultContent },
      styles: { ...config.defaultStyles },
    };
    updateHtml([...blocks, newBlock]);
  };

  // Remove block
  const removeBlock = (id: string) => {
    updateHtml(blocks.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  // Duplicate block
  const duplicateBlock = (id: string) => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    const block = blocks[index];
    const newBlock = { ...block, id: generateId() };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateHtml(newBlocks);
  };

  // Move block
  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    updateHtml(newBlocks);
  };

  // Update block content
  const updateBlockContent = (id: string, content: Record<string, unknown>) => {
    updateHtml(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, ...content } } : b));
  };

  // Update block styles
  const updateBlockStyles = (id: string, styles: Record<string, string>) => {
    updateHtml(blocks.map(b => b.id === id ? { ...b, styles: { ...b.styles, ...styles } } : b));
  };

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setBlocks(history[historyIndex - 1]);
      setHtmlCode(blocksToHtml(history[historyIndex - 1]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setBlocks(history[historyIndex + 1]);
      setHtmlCode(blocksToHtml(history[historyIndex + 1]));
    }
  };

  // Save template
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    setSaving(true);
    try {
      const finalHtml = activeTab === 'code' ? htmlCode : blocksToHtml(blocks);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        htmlContent: finalHtml,
      });
      toast.success('Vorlage gespeichert');
      onClose();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {template?.id ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <Button
                variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setPreviewMode('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setPreviewMode('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Blocks */}
          <div className="w-64 border-r bg-gray-50 flex flex-col shrink-0">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Blöcke hinzufügen</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(blockConfigs).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type as BlockType)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-200 bg-white hover:border-teal-500 hover:bg-teal-50 transition-colors"
                  >
                    <config.icon className="w-5 h-5 text-gray-600" />
                    <span className="text-xs text-gray-600">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Settings */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Vorlagenname *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z.B. Willkommens-E-Mail"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Beschreibung</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Kurze Beschreibung..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Kategorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welcome">Willkommen</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="update">Produkt-Update</SelectItem>
                      <SelectItem value="promotion">Angebot</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="general">Allgemein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Center - Editor/Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'design' | 'code')} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 w-fit">
                <TabsTrigger value="design" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="w-4 h-4" />
                  HTML-Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="flex-1 overflow-auto p-4">
                <div 
                  className={`mx-auto bg-gray-100 rounded-lg p-4 transition-all ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-[650px]'
                  }`}
                >
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {blocks.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">
                        <p className="mb-2">Keine Blöcke vorhanden</p>
                        <p className="text-sm">Fügen Sie Blöcke aus der linken Seitenleiste hinzu</p>
                      </div>
                    ) : (
                      blocks.map((block) => (
                        <div
                          key={block.id}
                          onClick={() => setSelectedBlockId(block.id)}
                          className={`relative group cursor-pointer transition-all ${
                            selectedBlockId === block.id 
                              ? 'ring-2 ring-teal-500 ring-inset' 
                              : 'hover:ring-2 hover:ring-teal-200 hover:ring-inset'
                          }`}
                        >
                          {/* Block Actions */}
                          <div className={`absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
                            selectedBlockId === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                              className="p-1 bg-white rounded shadow hover:bg-gray-100"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                              className="p-1 bg-white rounded shadow hover:bg-gray-100"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          <div className={`absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
                            selectedBlockId === block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                              className="p-1 bg-white rounded shadow hover:bg-gray-100"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                              className="p-1 bg-white rounded shadow hover:bg-red-100 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Block Preview */}
                          <BlockPreview block={block} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="code" className="flex-1 p-4">
                <Textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="h-full font-mono text-sm resize-none"
                  placeholder="HTML-Code hier eingeben..."
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Block Settings */}
          <div className="w-72 border-l bg-gray-50 shrink-0">
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Block-Einstellungen
              </h3>
            </div>
            <ScrollArea className="h-[calc(100%-57px)]">
              {selectedBlock ? (
                <BlockSettings
                  block={selectedBlock}
                  onUpdateContent={(content) => updateBlockContent(selectedBlock.id, content)}
                  onUpdateStyles={(styles) => updateBlockStyles(selectedBlock.id, styles)}
                />
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Wählen Sie einen Block aus, um ihn zu bearbeiten
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichern...' : 'Vorlage speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Block Preview Component
function BlockPreview({ block }: { block: EmailBlock }) {
  const { type, content, styles } = block;

  switch (type) {
    case 'header':
      return (
        <div style={{ padding: styles.padding || '20px', textAlign: styles.textAlign as 'center' | 'left' | 'right' || 'center' }}>
          <h1 style={{ 
            color: styles.color, 
            fontSize: styles.fontSize, 
            fontWeight: styles.fontWeight as 'bold' | 'normal' | '700',
            margin: 0,
          }}>
            {content.text as string}
          </h1>
        </div>
      );

    case 'text':
      return (
        <div style={{ padding: styles.padding || '10px 20px' }}>
          <p style={{ 
            color: styles.color, 
            fontSize: styles.fontSize, 
            lineHeight: styles.lineHeight,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}>
            {content.text as string}
          </p>
        </div>
      );

    case 'image':
      return (
        <div style={{ padding: styles.padding || '10px 20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={content.src as string} 
            alt={content.alt as string} 
            style={{ 
              width: '100%', 
              borderRadius: styles.borderRadius,
              display: 'block',
            }} 
          />
        </div>
      );

    case 'button':
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              display: 'inline-block',
              padding: styles.padding || '16px 32px',
              backgroundColor: styles.backgroundColor || '#14b8a6',
              color: styles.color || '#ffffff',
              borderRadius: styles.borderRadius || '12px',
              fontSize: styles.fontSize || '16px',
              fontWeight: styles.fontWeight as 'bold' | 'normal' | '600' || '600',
              textDecoration: 'none',
            }}
          >
            {content.text as string}
          </a>
        </div>
      );

    case 'divider':
      return <hr style={{ border: 'none', borderTop: styles.borderTop, margin: styles.margin }} />;

    case 'columns':
      return (
        <div style={{ display: 'flex', padding: styles.padding, gap: styles.gap }}>
          <div style={{ flex: 1, padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
            {content.left as string}
          </div>
          <div style={{ flex: 1, padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
            {content.right as string}
          </div>
        </div>
      );

    case 'spacer':
      return <div style={{ height: content.height as string, background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #f0f0f0 5px, #f0f0f0 10px)' }} />;

    case 'social':
      return (
        <div style={{ padding: styles.padding, textAlign: styles.textAlign as 'center' }}>
          {Boolean(content.linkedin) && <span style={{ margin: '0 10px', color: '#14b8a6' }}>LinkedIn</span>}
          {Boolean(content.twitter) && <span style={{ margin: '0 10px', color: '#14b8a6' }}>Twitter</span>}
          {Boolean(content.facebook) && <span style={{ margin: '0 10px', color: '#14b8a6' }}>Facebook</span>}
          {Boolean(content.instagram) && <span style={{ margin: '0 10px', color: '#14b8a6' }}>Instagram</span>}
          {!content.linkedin && !content.twitter && !content.facebook && !content.instagram && (
            <span style={{ color: '#9ca3af' }}>Soziale Links hier</span>
          )}
        </div>
      );

    case 'footer':
      return (
        <div style={{
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          textAlign: styles.textAlign as 'center',
          color: styles.color,
          fontSize: styles.fontSize,
          borderRadius: '0 0 16px 16px',
        }}>
          <p style={{ margin: '0 0 10px' }}>{content.company as string}</p>
          <p style={{ margin: '0 0 10px', fontSize: '12px' }}>{content.address as string}</p>
          {Boolean(content.unsubscribe) && (
            <p style={{ margin: 0, fontSize: '12px' }}>
              <a href="#" style={{ color: '#9ca3af' }}>Abmelden</a>
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

// Block Settings Component
function BlockSettings({
  block,
  onUpdateContent,
  onUpdateStyles,
}: {
  block: EmailBlock;
  onUpdateContent: (content: Record<string, unknown>) => void;
  onUpdateStyles: (styles: Record<string, string>) => void;
}) {
  const { type, content, styles } = block;

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {blockConfigs[type].label}
      </div>

      {/* Content Settings */}
      {(type === 'header' || type === 'text') && (
        <div>
          <Label className="text-xs">Text</Label>
          <Textarea
            value={content.text as string}
            onChange={(e) => onUpdateContent({ text: e.target.value })}
            rows={type === 'header' ? 2 : 4}
            className="mt-1"
          />
        </div>
      )}

      {type === 'header' && (
        <div>
          <Label className="text-xs">Überschrift-Level</Label>
          <Select value={content.level as string} onValueChange={(v) => onUpdateContent({ level: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="h1">H1 - Groß</SelectItem>
              <SelectItem value="h2">H2 - Mittel</SelectItem>
              <SelectItem value="h3">H3 - Klein</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {type === 'image' && (
        <>
          <div>
            <Label className="text-xs">Bild-URL</Label>
            <Input
              value={content.src as string}
              onChange={(e) => onUpdateContent({ src: e.target.value })}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Alt-Text</Label>
            <Input
              value={content.alt as string}
              onChange={(e) => onUpdateContent({ alt: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Link (optional)</Label>
            <Input
              value={content.link as string}
              onChange={(e) => onUpdateContent({ link: e.target.value })}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </>
      )}

      {type === 'button' && (
        <>
          <div>
            <Label className="text-xs">Button-Text</Label>
            <Input
              value={content.text as string}
              onChange={(e) => onUpdateContent({ text: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Link-URL</Label>
            <Input
              value={content.link as string}
              onChange={(e) => onUpdateContent({ link: e.target.value })}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </>
      )}

      {type === 'columns' && (
        <>
          <div>
            <Label className="text-xs">Linke Spalte</Label>
            <Textarea
              value={content.left as string}
              onChange={(e) => onUpdateContent({ left: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Rechte Spalte</Label>
            <Textarea
              value={content.right as string}
              onChange={(e) => onUpdateContent({ right: e.target.value })}
              rows={3}
              className="mt-1"
            />
          </div>
        </>
      )}

      {type === 'spacer' && (
        <div>
          <Label className="text-xs">Höhe</Label>
          <Select value={content.height as string} onValueChange={(v) => onUpdateContent({ height: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20px">Klein (20px)</SelectItem>
              <SelectItem value="40px">Mittel (40px)</SelectItem>
              <SelectItem value="60px">Groß (60px)</SelectItem>
              <SelectItem value="80px">Sehr Groß (80px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {type === 'social' && (
        <>
          <div>
            <Label className="text-xs">LinkedIn URL</Label>
            <Input
              value={content.linkedin as string}
              onChange={(e) => onUpdateContent({ linkedin: e.target.value })}
              placeholder="https://linkedin.com/..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Twitter URL</Label>
            <Input
              value={content.twitter as string}
              onChange={(e) => onUpdateContent({ twitter: e.target.value })}
              placeholder="https://twitter.com/..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Facebook URL</Label>
            <Input
              value={content.facebook as string}
              onChange={(e) => onUpdateContent({ facebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Instagram URL</Label>
            <Input
              value={content.instagram as string}
              onChange={(e) => onUpdateContent({ instagram: e.target.value })}
              placeholder="https://instagram.com/..."
              className="mt-1"
            />
          </div>
        </>
      )}

      {type === 'footer' && (
        <>
          <div>
            <Label className="text-xs">Firmenname</Label>
            <Input
              value={content.company as string}
              onChange={(e) => onUpdateContent({ company: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Adresse</Label>
            <Input
              value={content.address as string}
              onChange={(e) => onUpdateContent({ address: e.target.value })}
              className="mt-1"
            />
          </div>
        </>
      )}

      {/* Style Settings */}
      <div className="pt-4 border-t">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Palette className="w-3 h-3" />
          Stil
        </div>

        {(type === 'header' || type === 'text' || type === 'footer') && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Farbe</Label>
              <Input
                type="color"
                value={styles.color || '#111827'}
                onChange={(e) => onUpdateStyles({ color: e.target.value })}
                className="mt-1 h-10 p-1"
              />
            </div>
            <div>
              <Label className="text-xs">Schriftgröße</Label>
              <Select value={styles.fontSize || '16px'} onValueChange={(v) => onUpdateStyles({ fontSize: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12px">12px</SelectItem>
                  <SelectItem value="14px">14px</SelectItem>
                  <SelectItem value="16px">16px</SelectItem>
                  <SelectItem value="18px">18px</SelectItem>
                  <SelectItem value="20px">20px</SelectItem>
                  <SelectItem value="24px">24px</SelectItem>
                  <SelectItem value="28px">28px</SelectItem>
                  <SelectItem value="32px">32px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {type === 'button' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Hintergrund</Label>
                <Input
                  type="color"
                  value={styles.backgroundColor || '#14b8a6'}
                  onChange={(e) => onUpdateStyles({ backgroundColor: e.target.value })}
                  className="mt-1 h-10 p-1"
                />
              </div>
              <div>
                <Label className="text-xs">Textfarbe</Label>
                <Input
                  type="color"
                  value={styles.color || '#ffffff'}
                  onChange={(e) => onUpdateStyles({ color: e.target.value })}
                  className="mt-1 h-10 p-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Eckenradius</Label>
              <Select value={styles.borderRadius || '12px'} onValueChange={(v) => onUpdateStyles({ borderRadius: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0px">Eckig</SelectItem>
                  <SelectItem value="4px">Leicht gerundet</SelectItem>
                  <SelectItem value="8px">Gerundet</SelectItem>
                  <SelectItem value="12px">Stark gerundet</SelectItem>
                  <SelectItem value="24px">Pill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {(type === 'header' || type === 'text') && (
          <div className="mt-3">
            <Label className="text-xs">Ausrichtung</Label>
            <Select value={styles.textAlign || 'left'} onValueChange={(v) => onUpdateStyles({ textAlign: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Links</SelectItem>
                <SelectItem value="center">Zentriert</SelectItem>
                <SelectItem value="right">Rechts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
