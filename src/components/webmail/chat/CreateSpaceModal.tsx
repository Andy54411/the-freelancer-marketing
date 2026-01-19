'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  X,
  Smile,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSpace?: (name: string, emoji: string) => void;
}

// Verfügbare Emojis für Gruppenbereiche
const SPACE_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊',
  '🎯', '🚀', '💡', '⭐', '🔥', '💪', '🎨', '📚',
  '💼', '📊', '🎬', '🎵', '🎮', '🏆', '🌟', '💫',
  '🔧', '⚙️', '🛠️', '📱', '💻', '🖥️', '📧', '📝',
];

export function CreateSpaceModal({
  isOpen,
  onClose,
  onCreateSpace,
}: CreateSpaceModalProps) {
  const { isDark } = useWebmailTheme();
  const [spaceName, setSpaceName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😀');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const maxLength = 128;

  // Fokus auf Input setzen wenn Modal öffnet
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // Reset state when modal opens
    if (isOpen) {
      setSpaceName('');
      setSelectedEmoji('😀');
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  // Schließen bei Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleCreate = () => {
    if (spaceName.trim() && onCreateSpace) {
      onCreateSpace(spaceName.trim(), selectedEmoji);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && spaceName.trim()) {
      handleCreate();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            "w-full max-w-md rounded-xl shadow-2xl overflow-hidden",
            isDark ? "bg-[#292a2d]" : "bg-white"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <h2 className={cn(
              "text-lg font-medium",
              isDark ? "text-white" : "text-gray-900"
            )}>
              Gruppenbereich erstellen
            </h2>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
              )}
            >
              <X className={cn("h-5 w-5", isDark ? "text-gray-400" : "text-gray-500")} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="flex items-start gap-4">
              {/* Emoji Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors relative group",
                    isDark 
                      ? "bg-[#3c4043] hover:bg-[#4a4d50]" 
                      : "bg-gray-100 hover:bg-gray-200"
                  )}
                >
                  {selectedEmoji}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                    isDark ? "bg-[#5f6368]" : "bg-gray-300",
                    "group-hover:bg-teal-500 transition-colors"
                  )}>
                    <Plus className="h-3 w-3 text-white" />
                  </div>
                </button>

                {/* Emoji Picker Dropdown */}
                {showEmojiPicker && (
                  <div className={cn(
                    "absolute top-14 left-0 z-10 p-2 rounded-lg shadow-lg border",
                    isDark 
                      ? "bg-[#292a2d] border-white/10" 
                      : "bg-white border-gray-200"
                  )}>
                    <div className="grid grid-cols-8 gap-1">
                      {SPACE_EMOJIS.map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSelectedEmoji(emoji);
                            setShowEmojiPicker(false);
                          }}
                          className={cn(
                            "w-8 h-8 rounded flex items-center justify-center text-lg transition-colors",
                            isDark ? "hover:bg-white/10" : "hover:bg-gray-100",
                            selectedEmoji === emoji && (isDark ? "bg-white/20" : "bg-gray-200")
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Name Input */}
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value.slice(0, maxLength))}
                  onKeyDown={handleKeyDown}
                  placeholder="Name des Gruppenbereichs"
                  maxLength={maxLength}
                  className={cn(
                    "w-full px-4 py-3 rounded-lg border-2 text-base outline-none transition-colors",
                    isDark 
                      ? "bg-[#3c4043] border-[#8ab4f8] text-white placeholder:text-gray-500" 
                      : "bg-white border-teal-500 text-gray-900 placeholder:text-gray-400",
                    "focus:ring-2",
                    isDark ? "focus:ring-[#8ab4f8]/30" : "focus:ring-teal-500/30"
                  )}
                />
                <div className={cn(
                  "text-right text-xs mt-1",
                  isDark ? "text-gray-500" : "text-gray-400"
                )}>
                  {spaceName.length}/{maxLength}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={cn(
            "flex items-center justify-end gap-3 px-6 py-4 border-t",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <button
              onClick={onClose}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-colors",
                isDark 
                  ? "text-[#8ab4f8] hover:bg-[#8ab4f8]/10" 
                  : "text-teal-600 hover:bg-teal-50"
              )}
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!spaceName.trim()}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-colors",
                spaceName.trim()
                  ? isDark
                    ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                  : isDark
                    ? "bg-[#3c4043] text-gray-500 cursor-not-allowed"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              Erstellen
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
