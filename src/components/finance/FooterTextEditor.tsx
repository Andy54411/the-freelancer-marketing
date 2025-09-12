'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FooterTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

// Leichter TipTap-Editor speziell für Fuß-Text mit Basisformatierung und Platzhaltern
export default function FooterTextEditor({ value, onChange, className }: FooterTextEditorProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[140px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] bg-white',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!mounted || !editor) {
    return (
      <div className={className}>
        <div className="min-h-[140px] p-3 border rounded-md text-sm text-gray-400">
          Editor wird geladen…
        </div>
      </div>
    );
  }

  const insertPlaceholder = (token: string) => {
    editor.chain().focus().insertContent(token).run();
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          className={`h-8 px-2 ${editor.isActive('bold') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fett"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          className={`h-8 px-2 ${editor.isActive('italic') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          className={`h-8 px-2 ${editor.isActive('underline') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Unterstreichen"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          className={`h-8 px-2 ${editor.isActive('bulletList') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Aufzählung"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          className={`h-8 px-2 ${editor.isActive('orderedList') ? 'bg-[#14ad9f] text-white' : 'hover:bg-[#14ad9f]/10'}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Nummerierung"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8">
                Platzhalter
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => insertPlaceholder('[%KONTAKTPERSON%]')}>
                [%KONTAKTPERSON%]
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 border rounded-md">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
