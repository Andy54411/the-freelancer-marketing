'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Type,
  ImageIcon,
  Upload,
  User,
  Calendar,
  Clock,
  GripVertical,
  Plus,
  Trash2,
  Table as TableIcon,
  CheckSquare,
  Image as ImageIcon2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// TipTap Imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import { Blockquote } from '@tiptap/extension-blockquote';
import { CodeBlock } from '@tiptap/extension-code-block';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Typography } from '@tiptap/extension-typography';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  coverImage?: string;
  onCoverChange?: (url: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  titleLevel?: 1 | 2 | 3 | 4;
  onTitleLevelChange?: (level: 1 | 2 | 3 | 4) => void;
  author?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Section {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code';
  level?: 1 | 2 | 3 | 4;
  content: string;
}

interface DraggableSectionProps {
  section: Section;
  index: number;
  moveSection: (dragIndex: number, hoverIndex: number) => void;
  updateSection: (id: string, content: string) => void;
  deleteSection: (id: string) => void;
}

interface HeadingOption {
  level: 1 | 2 | 3 | 4 | 'paragraph';
  label: string;
  icon: React.ComponentType<any>;
  command: (editor: any) => void;
}

interface DraggableHeadingProps {
  option: HeadingOption;
  editor: any;
  onSelect: () => void;
}

const DraggableHeading: React.FC<DraggableHeadingProps> = ({ option, editor, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<{ option: HeadingOption }, void, { handlerId: string | symbol | null }>({
    accept: 'heading',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    drop(item: { option: HeadingOption }) {
      // Führe den Command des gedragten Elements aus
      item.option.command(editor);
      onSelect();
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'heading',
    item: () => ({ option }),
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;

  // Connect drag and drop refs
  drag(drop(ref));

  const IconComponent = option.icon;

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`flex items-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-200 bg-white cursor-grab active:cursor-grabbing hover:border-[#14ad9f] hover:bg-[#14ad9f]/5 transition-all ${
        editor.isActive(
          option.level === 'paragraph' ? 'paragraph' : 'heading',
          option.level === 'paragraph' ? {} : { level: option.level }
        )
          ? 'border-[#14ad9f] bg-[#14ad9f]/10'
          : ''
      }`}
      style={{ opacity }}
      onClick={() => {
        option.command(editor);
        onSelect();
      }}
    >
      <GripVertical className="h-4 w-4 text-gray-400" />
      <IconComponent className="h-5 w-5 text-[#14ad9f]" />
      <span className="text-sm font-medium text-gray-700">{option.label}</span>
    </div>
  );
};

const DraggableSection: React.FC<DraggableSectionProps> = ({
  section,
  index,
  moveSection,
  updateSection,
  deleteSection,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'section',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: unknown, monitor) {
      const dragItem = item as { index: number; id: string };
      if (!ref.current) {
        return;
      }
      const dragIndex = dragItem.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset?.y ?? 0) - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveSection(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      dragItem.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag, _preview] = useDrag({
    type: 'section',
    item: () => {
      return { id: section.id, index };
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;

  // Connect drag and drop refs
  drag(dragRef);
  drop(ref);

  return (
    <div
      ref={ref}
      style={{ opacity }}
      data-handler-id={handlerId}
      className="group relative border border-gray-200 rounded-lg p-4 hover:border-[#14ad9f] hover:shadow-sm transition-all duration-200 bg-white"
    >
      {/* Drag Handle - jetzt korrekt verbunden */}
      <div
        ref={dragRef}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded p-1"
        title="Ziehen zum Verschieben"
      >
        <GripVertical className="h-4 w-4 text-gray-400 hover:text-[#14ad9f]" />
      </div>

      {/* Delete Button */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => deleteSection(section.id)}
          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center transition-colors"
          title="Section löschen"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Drag Indicator - zeigt beim Hover den Drag-Bereich */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#14ad9f] opacity-10 rounded-lg pointer-events-none" />
      )}

      {/* Section Content */}
      <div className="pr-12 pl-8">
        {section.type === 'heading' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">
                H{section.level} Überschrift
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <textarea
              value={section.content}
              onChange={e => updateSection(section.id, e.target.value)}
              className={`w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none font-bold text-gray-900 placeholder-gray-400 transition-all ${
                section.level === 1
                  ? 'text-3xl'
                  : section.level === 2
                    ? 'text-2xl'
                    : section.level === 3
                      ? 'text-xl'
                      : 'text-lg'
              }`}
              rows={1}
              placeholder="Überschrift eingeben..."
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
        )}

        {section.type === 'paragraph' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Absatz</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <textarea
              value={section.content}
              onChange={e => updateSection(section.id, e.target.value)}
              className="w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none text-gray-900 placeholder-gray-400 leading-relaxed transition-all"
              rows={3}
              placeholder="Absatz eingeben..."
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
        )}

        {section.type === 'quote' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Zitat</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="border-l-4 border-[#14ad9f] pl-4 bg-[#14ad9f]/5 py-3 rounded-r transition-all">
              <textarea
                value={section.content}
                onChange={e => updateSection(section.id, e.target.value)}
                className="w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none text-gray-700 italic placeholder-gray-400"
                rows={2}
                placeholder="Zitat eingeben..."
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
          </div>
        )}

        {section.type === 'list' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Liste</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <textarea
              value={section.content}
              onChange={e => updateSection(section.id, e.target.value)}
              className="w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none text-gray-900 placeholder-gray-400 transition-all"
              rows={3}
              placeholder="• Listenpunkt 1&#10;• Listenpunkt 2&#10;• Listenpunkt 3"
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
          </div>
        )}

        {section.type === 'code' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase">Code Block</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="bg-gray-100 rounded border transition-all">
              <textarea
                value={section.content}
                onChange={e => updateSection(section.id, e.target.value)}
                className="w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none text-gray-900 placeholder-gray-400 font-mono text-sm p-3"
                rows={4}
                placeholder="// Code eingeben..."
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Beginne mit dem Schreiben...',
  className = '',
  coverImage,
  onCoverChange,
  title = '',
  onTitleChange,
  titleLevel = 1,
  onTitleLevelChange,
  author = 'Unbekannt',
  createdAt,
  updatedAt,
}: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [_showCoverUpload, _setShowCoverUpload] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [showHeadingDropZone, setShowHeadingDropZone] = useState(false);
  const headingDropZoneRef = useRef<HTMLDivElement>(null);

  // Sections state für Drag & Drop
  const [sections, setSections] = useState<Section[]>([]);

  // TipTap Editor Setup (immer aufrufen, aber nur verwenden wenn mounted)
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Heading.configure({
          levels: [1, 2, 3, 4],
        }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        BulletList,
        OrderedList,
        ListItem,
        Blockquote,
        CodeBlock,
        Link.configure({
          openOnClick: false,
        }),
        Underline,
        Image.configure({
          HTMLAttributes: {
            class: 'max-w-full h-auto rounded-lg',
          },
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Typography,
      ],
      content: content,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none',
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    },
    [mounted]
  );

  // Drag & Drop Funktionen
  const moveSection = useCallback((dragIndex: number, hoverIndex: number) => {
    setSections(prevSections => {
      const newSections = [...prevSections];
      const draggedSection = newSections[dragIndex];
      newSections.splice(dragIndex, 1);
      newSections.splice(hoverIndex, 0, draggedSection);
      return newSections;
    });
  }, []);

  const addSection = useCallback(
    (type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code', level?: 1 | 2 | 3 | 4) => {
      const newSection: Section = {
        id: Date.now().toString(),
        type,
        level,
        content:
          type === 'heading'
            ? 'Neue Überschrift'
            : type === 'quote'
              ? 'Neues Zitat'
              : type === 'code'
                ? '// Neuer Code'
                : type === 'list'
                  ? '• Neuer Listenpunkt'
                  : 'Neuer Absatz',
      };
      setSections([...sections, newSection]);
    },
    [sections]
  );

  const updateSection = useCallback((id: string, content: string) => {
    setSections(sections => sections.map(s => (s.id === id ? { ...s, content } : s)));
  }, []);

  const deleteSection = useCallback((id: string) => {
    setSections(sections => sections.filter(s => s.id !== id));
  }, []);

  // SSR Protection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Click outside handler für Heading DropZone
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        headingDropZoneRef.current &&
        !headingDropZoneRef.current.contains(event.target as Node)
      ) {
        setShowHeadingDropZone(false);
      }
    };

    if (showHeadingDropZone) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeadingDropZone]);

  // Debug: Zeige welche Sections existieren
  useEffect(() => {
    if (sections.length > 0) {
    }
  }, [sections]);

  useEffect(() => {
    const sectionsContent = sections
      .map(section => {
        switch (section.type) {
          case 'heading':
            return `<h${section.level}>${section.content}</h${section.level}>`;
          case 'paragraph':
            return `<p>${section.content}</p>`;
          case 'quote':
            return `<blockquote><p>${section.content}</p></blockquote>`;
          case 'list':
            const listItems = section.content
              .split('\n')
              .filter(line => line.trim())
              .map(line => `<li>${line.replace(/^[•\-\*]\s*/, '')}</li>`)
              .join('');
            return `<ul>${listItems}</ul>`;
          case 'code':
            return `<pre><code>${section.content}</code></pre>`;
          default:
            return `<p>${section.content}</p>`;
        }
      })
      .join('');

    if (sectionsContent !== content) {
      onChange(sectionsContent);
    }
  }, [sections, content, onChange]);

  // Early return for SSR
  if (!mounted) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto mb-2"></div>
            <p>Editor wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  // Heading Options für Drag & Drop (nur client-side)
  const headingOptions: HeadingOption[] = [
    {
      level: 1,
      label: 'Überschrift 1',
      icon: Heading1,
      command: editor => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      level: 2,
      label: 'Überschrift 2',
      icon: Heading2,
      command: editor => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      level: 3,
      label: 'Überschrift 3',
      icon: Heading3,
      command: editor => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      level: 4,
      label: 'Überschrift 4',
      icon: Heading1, // Verwende H1 Icon für H4 da kein H4 Icon verfügbar
      command: editor => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      level: 'paragraph',
      label: 'Normaler Text',
      icon: Type,
      command: editor => editor.chain().focus().setParagraph().run(),
    },
  ];

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onCoverChange) {
      // Erstelle Preview-URL (Objekt-URL statt Base64)
      const previewUrl = URL.createObjectURL(file);
      onCoverChange(previewUrl);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTitleComponent = () => {
    const baseClasses =
      'w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none font-bold text-gray-900 placeholder-gray-400';
    const levelClasses = {
      1: 'text-4xl leading-tight',
      2: 'text-3xl leading-tight',
      3: 'text-2xl leading-snug',
      4: 'text-xl leading-snug',
    };

    return (
      <textarea
        value={title}
        onChange={e => onTitleChange?.(e.target.value)}
        placeholder="Titel eingeben..."
        className={`${baseClasses} ${levelClasses[titleLevel]}`}
        rows={1}
        style={{ minHeight: 'auto', height: 'auto' }}
        onInput={e => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = target.scrollHeight + 'px';
        }}
      />
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Cover Image Section */}
        <div className="relative">
          {coverImage ? (
            <div className="relative h-64 bg-gray-100 overflow-hidden">
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  className="bg-white/90 hover:bg-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Ändern
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onCoverChange?.('')}
                  className="bg-white/90 hover:bg-white"
                >
                  Entfernen
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="h-32 bg-linear-to-r from-[#14ad9f] to-taskilo-hover cursor-pointer flex items-center justify-center group hover:from-taskilo-hover hover:to-[#0f8a7e] transition-all"
              onClick={() => coverInputRef.current?.click()}
            >
              <div className="text-center text-white">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-70 group-hover:opacity-100" />
                <p className="text-sm opacity-70 group-hover:opacity-100">Cover-Bild hinzufügen</p>
              </div>
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
        </div>

        {/* Header Section */}
        <div className="p-6 border-b border-gray-200">
          {/* Title */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Select
                value={titleLevel.toString()}
                onValueChange={value => onTitleLevelChange?.(parseInt(value) as 1 | 2 | 3 | 4)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {getTitleComponent()}
          </div>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 border-t pt-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>
                Erstellt von: <strong>{author}</strong>
              </span>
            </div>
            {createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Erstellt: {formatDate(createdAt)}</span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Zuletzt aktualisiert: {formatDate(updatedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* TipTap Editor Toolbar */}
        {editor && (
          <div className="border-b border-gray-200 bg-white">
            <div className="flex items-center gap-1 p-3 flex-wrap">
              {/* Erweiterte Überschriften Drag & Drop */}
              <div className="relative" ref={headingDropZoneRef}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => setShowHeadingDropZone(!showHeadingDropZone)}
                >
                  <Heading1 className="h-4 w-4" />
                  <span className="text-xs">Überschrift</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showHeadingDropZone ? 'rotate-180' : ''}`}
                  />
                </Button>

                {showHeadingDropZone && (
                  <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[300px]">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Überschriften-Stile
                      </h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Klicke zum Anwenden oder ziehe ins Dokument
                      </p>
                    </div>

                    <div className="space-y-2">
                      {headingOptions.map(option => (
                        <DraggableHeading
                          key={option.level}
                          option={option}
                          editor={editor}
                          onSelect={() => setShowHeadingDropZone(false)}
                        />
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <GripVertical className="h-3 w-3" />
                        Ziehe Überschriften direkt ins Dokument
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Text Formatierung */}
              <Button
                variant={editor.isActive('bold') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <Bold className="h-4 w-4" />
              </Button>

              <Button
                variant={editor.isActive('italic') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <Italic className="h-4 w-4" />
              </Button>

              <Button
                variant={editor.isActive('underline') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Listen */}
              <Button
                variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <List className="h-4 w-4" />
              </Button>

              <Button
                variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Spezielle Formate */}
              <Button
                variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <Quote className="h-4 w-4" />
              </Button>

              <Button
                variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <Code2 className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Erweiterte Features */}
              <Button
                variant={editor.isActive('taskList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`h-8 w-8 p-0 ${editor.isActive('taskList') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = window.prompt('Bild-URL eingeben:');
                  if (url) {
                    editor.chain().focus().setImage({ src: url }).run();
                  }
                }}
                className="h-8 w-8 p-0 hover:bg-[#14ad9f]/10"
              >
                <ImageIcon2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
                className="h-8 w-8 p-0 hover:bg-[#14ad9f]/10"
              >
                <TableIcon className="h-4 w-4" />
              </Button>

              {/* Tabellen-Kontrollen (nur wenn Tabelle aktiv) */}
              {editor.isActive('table') && (
                <>
                  <Separator orientation="vertical" className="h-6" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <TableIcon className="h-4 w-4" />
                        <span className="text-xs">Tabelle</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                      >
                        Spalte links hinzufügen
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                      >
                        Spalte rechts hinzufügen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                        Spalte löschen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                        Zeile oben hinzufügen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                        Zeile unten hinzufügen
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                        Zeile löschen
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        className="text-red-600"
                      >
                        Tabelle löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        )}

        {/* TipTap Editor Content */}
        {editor && (
          <div className="border-b border-gray-200">
            <EditorContent
              editor={editor}
              className="prose prose-sm max-w-none p-6 focus:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:text-gray-900 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-gray-900 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:text-gray-900 [&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:font-bold [&_.ProseMirror_h4]:text-gray-900 [&_.ProseMirror_p]:text-gray-700 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-[#14ad9f] [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_pre]:bg-gray-100 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_code]:bg-gray-100 [&_.ProseMirror_code]:px-2 [&_.ProseMirror_code]:py-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:table-auto [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border [&_.ProseMirror_table]:border-gray-300 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-50 [&_.ProseMirror_th]:font-bold [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]_li]:flex [&_.ProseMirror_ul[data-type=taskList]_li]:items-start [&_.ProseMirror_ul[data-type=taskList]_li]:gap-2 [&_.ProseMirror_ul[data-type=taskList]_li>label]:flex [&_.ProseMirror_ul[data-type=taskList]_li>label]:items-center [&_.ProseMirror_ul[data-type=taskList]_li>label>input]:mr-2"
            />
          </div>
        )}

        {/* Section Toolbar */}
        <div className="border-b border-gray-100 bg-gray-25">
          <div className="flex items-center gap-2 p-3 text-sm text-gray-600">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Neue Section hinzufügen:
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 gap-1 text-gray-700 hover:text-[#14ad9f] hover:bg-[#14ad9f]/10"
                >
                  <Type className="h-3 w-3" />
                  Überschrift
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => addSection('paragraph')}>
                  <Type className="h-3 w-3 mr-2" />
                  Normaler Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addSection('heading', 1)}>
                  <Heading1 className="h-3 w-3 mr-2" />
                  H1 - Hauptüberschrift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addSection('heading', 2)}>
                  <Heading2 className="h-3 w-3 mr-2" />
                  H2 - Unterüberschrift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addSection('heading', 3)}>
                  <Heading3 className="h-3 w-3 mr-2" />
                  H3 - Abschnittsüberschrift
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => addSection('heading', 4)}>
                  <Heading1 className="h-3 w-3 mr-2" />
                  H4 - Kleinste Überschrift
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-4" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addSection('paragraph')}
              className="text-xs h-7 gap-1 text-gray-700 hover:text-[#14ad9f] hover:bg-[#14ad9f]/10"
            >
              <Type className="h-3 w-3" />
              Absatz
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addSection('quote')}
              className="text-xs h-7 gap-1 text-gray-700 hover:text-[#14ad9f] hover:bg-[#14ad9f]/10"
            >
              <Quote className="h-3 w-3" />
              Zitat
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addSection('list')}
              className="text-xs h-7 gap-1 text-gray-700 hover:text-[#14ad9f] hover:bg-[#14ad9f]/10"
            >
              <List className="h-3 w-3" />
              Liste
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => addSection('code')}
              className="text-xs h-7 gap-1 text-gray-700 hover:text-[#14ad9f] hover:bg-[#14ad9f]/10"
            >
              <Code2 className="h-3 w-3" />
              Code
            </Button>
          </div>
        </div>

        {/* Draggable Sections Area */}
        <div className="p-4 space-y-3 bg-white min-h-[200px] relative">
          {sections.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Plus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium mb-2 text-gray-400">Keine Sections vorhanden</p>
              <p className="text-sm text-gray-400">
                Füge eine neue Section hinzu, um mit dem Schreiben zu beginnen
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <GripVertical className="h-3 w-3" />
                <span>Sections sind per Drag & Drop verschiebbar</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map((section, index) => (
                <DraggableSection
                  key={section.id}
                  section={section}
                  index={index}
                  moveSection={moveSection}
                  updateSection={updateSection}
                  deleteSection={deleteSection}
                />
              ))}

              {/* Drag Drop Zone Indicator */}
              <div className="text-center py-4 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg hover:border-[#14ad9f] hover:bg-[#14ad9f]/5 transition-colors">
                <Plus className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Neue Section hinzufügen oder hier ablegen</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
