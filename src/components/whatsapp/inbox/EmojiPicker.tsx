/**
 * EmojiPicker Component
 * 
 * Emoji-Auswahl für WhatsApp-Nachrichten
 */
'use client';

import React from 'react';
import { X, Search, Clock, Smile, Heart, ThumbsUp, Utensils, Circle, Car, Lightbulb, Flag } from 'lucide-react';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  position?: 'top' | 'bottom';
}

// Emoji-Kategorien mit häufig verwendeten Emojis
const EMOJI_CATEGORIES = {
  recent: {
    icon: Clock,
    label: 'Zuletzt verwendet',
    emojis: [], // Wird dynamisch geladen
  },
  smileys: {
    icon: Smile,
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  },
  gestures: {
    icon: ThumbsUp,
    label: 'Gesten',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
  },
  love: {
    icon: Heart,
    label: 'Liebe',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'],
  },
  food: {
    icon: Utensils,
    label: 'Essen',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕'],
  },
  activities: {
    icon: Circle,
    label: 'Aktivitäten',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴'],
  },
  travel: {
    icon: Car,
    label: 'Reisen',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸'],
  },
  objects: {
    icon: Lightbulb,
    label: 'Objekte',
    emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴'],
  },
  symbols: {
    icon: Flag,
    label: 'Symbole',
    emojis: ['✅', '❌', '❓', '❗', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️'],
  },
};

const RECENT_KEY = 'whatsapp_recent_emojis';
const MAX_RECENT = 24;

export function EmojiPicker({ isOpen, onClose, onSelect, position = 'top' }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = React.useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Lade zuletzt verwendete Emojis
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch {
      // Ignoriere Fehler
    }
  }, [isOpen]);

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelect = (emoji: string) => {
    // Zu zuletzt verwendet hinzufügen
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecentEmojis(newRecent);
    
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    } catch {
      // Ignoriere Fehler
    }

    onSelect(emoji);
  };

  // Alle Emojis für die Suche
  const allEmojis = React.useMemo(() => {
    const emojis: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach(cat => {
      if ('emojis' in cat) {
        emojis.push(...cat.emojis);
      }
    });
    return emojis;
  }, []);

  // Gefilterte Emojis bei Suche
  const filteredEmojis = React.useMemo(() => {
    if (!searchQuery) return null;
    // Einfache Suche (in Produktion könnte man Emoji-Namen/Keywords verwenden)
    return allEmojis.filter(emoji => emoji.includes(searchQuery));
  }, [searchQuery, allEmojis]);

  // Aktuelle Kategorie-Emojis
  const currentEmojis = React.useMemo(() => {
    if (filteredEmojis !== null) return filteredEmojis;
    if (activeCategory === 'recent') return recentEmojis;
    return EMOJI_CATEGORIES[activeCategory].emojis;
  }, [activeCategory, filteredEmojis, recentEmojis]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50`}
    >
      {/* Header */}
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Emoji suchen..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f]"
              autoFocus
            />
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Kategorie-Tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 p-1 border-b border-gray-100 overflow-x-auto">
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const isActive = activeCategory === key;
            const hasEmojis = key === 'recent' ? recentEmojis.length > 0 : true;
            
            if (!hasEmojis && key === 'recent') return null;
            
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
                className={`p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-[#14ad9f]/10 text-[#14ad9f]' 
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                }`}
                title={category.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji-Grid */}
      <div className="p-2 h-[200px] overflow-y-auto">
        {currentEmojis.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {searchQuery ? 'Keine Emojis gefunden' : 'Noch keine zuletzt verwendeten Emojis'}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {currentEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => handleSelect(emoji)}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer mit Kategorie-Name */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {searchQuery 
            ? `${currentEmojis.length} Ergebnis${currentEmojis.length !== 1 ? 'se' : ''}`
            : EMOJI_CATEGORIES[activeCategory].label
          }
        </span>
      </div>
    </div>
  );
}
