'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Extension } from '@tiptap/core';
import { useCallback, useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  Undo,
  Redo,
  Trash2,
  List,
  ListOrdered,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SignatureEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDark?: boolean;
  minHeight?: string;
}

// Custom FontSize Extension
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: { chain: () => any }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: { chain: () => any }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

const FONT_SIZES = [
  { label: 'Klein', value: '11px' },
  { label: 'Normal', value: '14px' },
  { label: 'Groß', value: '18px' },
  { label: 'Größer', value: '24px' },
  { label: 'Riesig', value: '32px' },
];

const TEXT_COLORS = [
  { label: 'Schwarz', value: '#000000' },
  { label: 'Grau', value: '#6b7280' },
  { label: 'Rot', value: '#dc2626' },
  { label: 'Blau', value: '#2563eb' },
  { label: 'Grün', value: '#16a34a' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Lila', value: '#9333ea' },
  { label: 'Teal', value: '#14ad9f' },
];

// Custom Resizable Image Extension
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || element.style.width?.replace('px', ''),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { 
            width: attributes.width,
            style: `width: ${attributes.width}px`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height') || element.style.height?.replace('px', ''),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { 
            height: attributes.height,
            style: `height: ${attributes.height}px`,
          };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }: any) => {
      const updateAttributes = (attrs: Record<string, any>) => {
        const pos = getPos();
        if (typeof pos === 'number') {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              ...attrs,
            })
          );
        }
      };
      const dom = document.createElement('span');
      dom.className = 'resizable-image-wrapper inline-block relative';
      dom.contentEditable = 'false';
      
      const container = document.createElement('span');
      container.className = 'relative inline-block resizable-image-container';
      
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.className = 'max-w-full h-auto cursor-pointer';
      img.draggable = false;
      
      if (node.attrs.width) {
        img.style.width = `${node.attrs.width}px`;
      }
      if (node.attrs.height) {
        img.style.height = `${node.attrs.height}px`;
      }
      
      // Click handler to select image
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.classList.add('selected');
        showHandles();
      });
      
      // Click outside to deselect
      const handleClickOutside = (e: MouseEvent) => {
        if (!dom.contains(e.target as Node)) {
          container.classList.remove('selected');
          hideHandles();
        }
      };
      document.addEventListener('click', handleClickOutside);
      
      container.appendChild(img);
      
      // Resize handles
      const handles: HTMLDivElement[] = [];
      const corners = [
        { name: 'se', cursor: 'se-resize', position: 'bottom: -4px; right: -4px;' },
        { name: 'sw', cursor: 'sw-resize', position: 'bottom: -4px; left: -4px;' },
        { name: 'ne', cursor: 'ne-resize', position: 'top: -4px; right: -4px;' },
        { name: 'nw', cursor: 'nw-resize', position: 'top: -4px; left: -4px;' },
      ];
      
      corners.forEach(corner => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${corner.name}`;
        handle.style.cssText = `
          ${corner.position}
          position: absolute;
          width: 10px;
          height: 10px;
          background: white;
          border: 2px solid #14ad9f;
          border-radius: 2px;
          cursor: ${corner.cursor};
          display: none;
          z-index: 10;
        `;
        
        let startX = 0, startY = 0, startWidth = 0, startHeight = 0;
        
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          startX = e.clientX;
          startY = e.clientY;
          startWidth = img.offsetWidth;
          startHeight = img.offsetHeight;
          
          handle.style.background = '#14ad9f';
          
          const onMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;
            const aspectRatio = startWidth / startHeight;
            
            let newWidth = startWidth;
            
            if (corner.name.includes('e')) {
              newWidth = Math.max(30, startWidth + deltaX);
            } else {
              newWidth = Math.max(30, startWidth - deltaX);
            }
            
            const newHeight = Math.round(newWidth / aspectRatio);
            
            // Live preview
            img.style.width = `${newWidth}px`;
            img.style.height = `${newHeight}px`;
            
            // Update size indicator
            if (sizeIndicator) {
              sizeIndicator.textContent = `${Math.round(newWidth)} × ${newHeight}`;
            }
          };
          
          const onMouseUp = (upEvent: MouseEvent) => {
            handle.style.background = 'white';
            
            // Save final dimensions
            const finalWidth = img.offsetWidth;
            const finalHeight = img.offsetHeight;
            
            updateAttributes({
              width: Math.round(finalWidth),
              height: Math.round(finalHeight),
            });
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };
          
          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
        
        handles.push(handle);
        container.appendChild(handle);
      });
      
      // Size indicator
      const sizeIndicator = document.createElement('div');
      sizeIndicator.className = 'size-indicator';
      sizeIndicator.style.cssText = `
        position: absolute;
        bottom: -22px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
        display: none;
        z-index: 10;
      `;
      sizeIndicator.textContent = `${node.attrs.width || img.naturalWidth} × ${node.attrs.height || img.naturalHeight}`;
      container.appendChild(sizeIndicator);
      
      const showHandles = () => {
        handles.forEach(h => h.style.display = 'block');
        sizeIndicator.style.display = 'block';
        container.style.outline = '2px solid #14ad9f';
        container.style.outlineOffset = '2px';
      };
      
      const hideHandles = () => {
        handles.forEach(h => h.style.display = 'none');
        sizeIndicator.style.display = 'none';
        container.style.outline = 'none';
      };
      
      dom.appendChild(container);
      
      return {
        dom,
        contentDOM: null,
        destroy: () => {
          document.removeEventListener('click', handleClickOutside);
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') return false;
          
          img.src = updatedNode.attrs.src;
          if (updatedNode.attrs.width) {
            img.style.width = `${updatedNode.attrs.width}px`;
          }
          if (updatedNode.attrs.height) {
            img.style.height = `${updatedNode.attrs.height}px`;
          }
          sizeIndicator.textContent = `${updatedNode.attrs.width || '?'} × ${updatedNode.attrs.height || '?'}`;
          return true;
        },
      };
    };
  },
});

export function SignatureEditor({ 
  value, 
  onChange, 
  placeholder = 'Signaturtext eingeben...',
  isDark = false,
  minHeight = '120px',
}: SignatureEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto inline-block',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontSize,
    ],
    content: value,
    editable: true,
    editorProps: {
      attributes: {
        class: cn(
          'w-full rounded-b-md bg-transparent px-3 py-2 text-sm focus:outline-none prose prose-sm max-w-none',
          isDark ? 'prose-invert' : ''
        ),
        style: `min-height: ${minHeight}`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    // Max 2MB für Signaturbilder
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      
      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        // Scale down if too large (max 400px width)
        let width = img.width;
        let height = img.height;
        const maxWidth = 400;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        
        editor.chain().focus().setImage({ 
          src: base64,
          width,
          height,
        } as any).run();
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    
    // Input zurücksetzen
    e.target.value = '';
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL eingeben:', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className={cn(
        'border rounded-md animate-pulse',
        isDark ? 'border-[#5f6368] bg-[#3c4043]' : 'border-gray-300 bg-gray-100'
      )} style={{ minHeight }} />
    );
  }

  return (
    <div className={cn(
      'border rounded-md overflow-hidden',
      isDark ? 'border-[#5f6368] bg-[#2d2e30]' : 'border-gray-300 bg-white'
    )}>
      {/* Toolbar */}
      <div className={cn(
        'flex items-center gap-0.5 p-1 border-b flex-wrap',
        isDark ? 'border-[#5f6368] bg-[#3c4043]' : 'border-gray-200 bg-gray-50'
      )}>
        {/* Font Family */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'h-7 px-2 flex items-center justify-center gap-1 rounded text-xs hover:bg-gray-200',
              isDark && 'hover:bg-[#5f6368] text-white'
            )}>
              <span>Sans Serif</span>
              <span className="text-gray-400">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={isDark ? 'bg-[#3c4043] border-[#5f6368]' : ''}>
            <DropdownMenuItem className={cn('text-xs', isDark && 'text-white hover:bg-[#5f6368]')}>
              Sans Serif
            </DropdownMenuItem>
            <DropdownMenuItem className={cn('text-xs font-serif', isDark && 'text-white hover:bg-[#5f6368]')}>
              Serif
            </DropdownMenuItem>
            <DropdownMenuItem className={cn('text-xs font-mono', isDark && 'text-white hover:bg-[#5f6368]')}>
              Monospace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Schriftgröße */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'h-7 w-8 p-0 flex items-center justify-center rounded hover:bg-gray-200',
              isDark && 'hover:bg-[#5f6368]'
            )}>
              <Type className="h-3.5 w-3.5" />
              <span className="text-[10px] text-gray-400">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={isDark ? 'bg-[#3c4043] border-[#5f6368]' : ''}>
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem
                key={size.value}
                onClick={() => {
                  (editor.chain().focus() as any).setFontSize(size.value).run();
                }}
                className={cn('gap-2', isDark && 'text-white hover:bg-[#5f6368]')}
              >
                <span style={{ fontSize: size.value }}>{size.label}</span>
                <span className="text-xs text-gray-400 ml-auto">{size.value}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Formatierung */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Fett"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Kursiv"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Unterstrichen"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Toggle>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Textfarbe */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'h-7 w-7 p-0 flex items-center justify-center rounded hover:bg-gray-200',
              isDark && 'hover:bg-[#5f6368]'
            )}>
              <Palette className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={isDark ? 'bg-[#3c4043] border-[#5f6368]' : ''}>
            {TEXT_COLORS.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => editor.chain().focus().setColor(color.value).run()}
                className={cn('text-xs gap-2', isDark && 'text-white hover:bg-[#5f6368]')}
              >
                <div 
                  className="w-3 h-3 rounded-full border" 
                  style={{ backgroundColor: color.value }}
                />
                {color.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Link */}
        <Toggle
          size="sm"
          pressed={editor.isActive('link')}
          onPressedChange={setLink}
          aria-label="Link"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Toggle>

        {/* Bild einfügen */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'h-7 w-7 p-0 flex items-center justify-center rounded hover:bg-gray-200',
            isDark && 'hover:bg-[#5f6368]'
          )}
          aria-label="Bild einfügen"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Ausrichtung */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'left' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
          aria-label="Links"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'center' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
          aria-label="Zentriert"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: 'right' })}
          onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
          aria-label="Rechts"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Toggle>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Listen */}
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Aufzählung"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <List className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Nummerierung"
          className={cn('h-7 w-7 p-0', isDark && 'data-[state=on]:bg-[#5f6368]')}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Toggle>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={cn(
            'h-7 w-7 p-0 flex items-center justify-center rounded disabled:opacity-30',
            isDark ? 'hover:bg-[#5f6368]' : 'hover:bg-gray-200'
          )}
          aria-label="Rückgängig"
        >
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={cn(
            'h-7 w-7 p-0 flex items-center justify-center rounded disabled:opacity-30',
            isDark ? 'hover:bg-[#5f6368]' : 'hover:bg-gray-200'
          )}
          aria-label="Wiederholen"
        >
          <Redo className="h-3.5 w-3.5" />
        </button>

        {/* Alles löschen */}
        <button
          onClick={() => {
            if (window.confirm('Signatur wirklich löschen?')) {
              editor.chain().focus().clearContent().run();
            }
          }}
          className={cn(
            'h-7 w-7 p-0 flex items-center justify-center rounded ml-auto text-red-500',
            isDark ? 'hover:bg-[#5f6368]' : 'hover:bg-red-50'
          )}
          aria-label="Löschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={cn(
          'p-2 [&_.resizable-image-wrapper]:inline-block',
          isDark ? 'text-white' : 'text-gray-900'
        )}
      />
      
      {/* Hinweis */}
      <div className={cn(
        'text-[10px] px-3 py-1 border-t',
        isDark ? 'border-[#5f6368] text-gray-500' : 'border-gray-200 text-gray-400'
      )}>
        Klicken Sie auf ein Bild und ziehen Sie an den Ecken, um die Größe anzupassen
      </div>
    </div>
  );
}
