'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X,
  Plus,
  Search,
  Clock,
  Smile,
  User,
  Dog,
  Coffee,
  Plane,
  Lightbulb,
  Hash,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSpace?: (name: string, emoji: string) => void;
}

// Emoji-Kategorien wie bei Google Chat
const EMOJI_CATEGORIES = {
  smileys: {
    icon: Smile,
    label: 'Smileys und Emotionen',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷'],
  },
  people: {
    icon: User,
    label: 'Menschen',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🦿'],
  },
  animals: {
    icon: Dog,
    label: 'Tiere und Natur',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🌸', '🌷', '🌹', '🌻', '🌺', '🌼', '🌳', '🌲', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃'],
  },
  food: {
    icon: Coffee,
    label: 'Essen und Trinken',
    emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾'],
  },
  travel: {
    icon: Plane,
    label: 'Reisen und Orte',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍️', '🛺', '🚲', '🛴', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋'],
  },
  objects: {
    icon: Lightbulb,
    label: 'Objekte',
    emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪'],
  },
  symbols: {
    icon: Hash,
    label: 'Symbole',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'],
  },
  flags: {
    icon: Flag,
    label: 'Flaggen',
    emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴', '🇦🇶', '🇦🇷', '🇦🇸', '🇦🇹', '🇦🇺', '🇦🇼', '🇦🇽', '🇦🇿', '🇧🇦', '🇧🇧', '🇧🇩', '🇧🇪', '🇧🇫', '🇧🇬', '🇧🇭', '🇧🇮', '🇧🇯', '🇧🇱', '🇧🇲', '🇧🇳', '🇧🇴', '🇧🇶', '🇧🇷', '🇧🇸', '🇧🇹', '🇧🇻', '🇧🇼', '🇧🇾', '🇧🇿', '🇨🇦', '🇨🇨', '🇨🇩', '🇨🇫', '🇨🇬', '🇨🇭', '🇨🇮', '🇨🇰', '🇨🇱', '🇨🇲', '🇨🇳', '🇨🇴', '🇨🇵', '🇨🇷', '🇨🇺', '🇨🇻', '🇨🇼', '🇨🇽', '🇨🇾', '🇨🇿', '🇩🇪', '🇩🇬', '🇩🇯', '🇩🇰', '🇩🇲', '🇩🇴', '🇩🇿', '🇪🇦', '🇪🇨', '🇪🇪', '🇪🇬', '🇪🇭', '🇪🇷', '🇪🇸', '🇪🇹', '🇪🇺', '🇫🇮', '🇫🇯', '🇫🇰', '🇫🇲', '🇫🇴', '🇫🇷', '🇬🇦', '🇬🇧', '🇬🇩', '🇬🇪', '🇬🇫', '🇬🇬', '🇬🇭', '🇬🇮', '🇬🇱', '🇬🇲', '🇬🇳', '🇬🇵', '🇬🇶', '🇬🇷', '🇬🇸', '🇬🇹', '🇬🇺', '🇬🇼', '🇬🇾', '🇭🇰', '🇭🇲', '🇭🇳', '🇭🇷', '🇭🇹', '🇭🇺', '🇮🇨', '🇮🇩', '🇮🇪', '🇮🇱', '🇮🇲', '🇮🇳', '🇮🇴', '🇮🇶', '🇮🇷', '🇮🇸', '🇮🇹', '🇯🇪', '🇯🇲', '🇯🇴', '🇯🇵', '🇰🇪', '🇰🇬', '🇰🇭', '🇰🇮', '🇰🇲', '🇰🇳', '🇰🇵', '🇰🇷', '🇰🇼', '🇰🇾', '🇰🇿', '🇱🇦', '🇱🇧', '🇱🇨', '🇱🇮', '🇱🇰', '🇱🇷', '🇱🇸', '🇱🇹', '🇱🇺', '🇱🇻', '🇱🇾', '🇲🇦', '🇲🇨', '🇲🇩', '🇲🇪', '🇲🇫', '🇲🇬', '🇲🇭', '🇲🇰', '🇲🇱', '🇲🇲', '🇲🇳', '🇲🇴', '🇲🇵', '🇲🇶', '🇲🇷', '🇲🇸', '🇲🇹', '🇲🇺', '🇲🇻', '🇲🇼', '🇲🇽', '🇲🇾', '🇲🇿', '🇳🇦', '🇳🇨', '🇳🇪', '🇳🇫', '🇳🇬', '🇳🇮', '🇳🇱', '🇳🇴', '🇳🇵', '🇳🇷', '🇳🇺', '🇳🇿', '🇴🇲', '🇵🇦', '🇵🇪', '🇵🇫', '🇵🇬', '🇵🇭', '🇵🇰', '🇵🇱', '🇵🇲', '🇵🇳', '🇵🇷', '🇵🇸', '🇵🇹', '🇵🇼', '🇵🇾', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇸', '🇷🇺', '🇷🇼', '🇸🇦', '🇸🇧', '🇸🇨', '🇸🇩', '🇸🇪', '🇸🇬', '🇸🇭', '🇸🇮', '🇸🇯', '🇸🇰', '🇸🇱', '🇸🇲', '🇸🇳', '🇸🇴', '🇸🇷', '🇸🇸', '🇸🇹', '🇸🇻', '🇸🇽', '🇸🇾', '🇸🇿', '🇹🇦', '🇹🇨', '🇹🇩', '🇹🇫', '🇹🇬', '🇹🇭', '🇹🇯', '🇹🇰', '🇹🇱', '🇹🇲', '🇹🇳', '🇹🇴', '🇹🇷', '🇹🇹', '🇹🇻', '🇹🇼', '🇹🇿', '🇺🇦', '🇺🇬', '🇺🇲', '🇺🇳', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇦', '🇻🇨', '🇻🇪', '🇻🇬', '🇻🇮', '🇻🇳', '🇻🇺', '🇼🇫', '🇼🇸', '🇽🇰', '🇾🇪', '🇾🇹', '🇿🇦', '🇿🇲', '🇿🇼', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  },
};

type CategoryKey = keyof typeof EMOJI_CATEGORIES;

export function CreateSpaceModal({
  isOpen,
  onClose,
  onCreateSpace,
}: CreateSpaceModalProps) {
  const { isDark } = useWebmailTheme();
  const [spaceName, setSpaceName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😀');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const maxLength = 128;

  // Kürzlich verwendete Emojis aus localStorage laden
  useEffect(() => {
    const stored = localStorage.getItem('taskilo-recent-emojis');
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch {
        setRecentEmojis([]);
      }
    }
  }, []);

  // Emoji zu kürzlich verwendet hinzufügen
  const addToRecent = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
    setRecentEmojis(updated);
    localStorage.setItem('taskilo-recent-emojis', JSON.stringify(updated));
  };

  // Emojis filtern basierend auf Suche
  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return null;
    const searchLower = emojiSearch.toLowerCase();
    const allEmojis: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach(cat => {
      allEmojis.push(...cat.emojis);
    });
    // Einfache Filterung - zeigt alle wenn gesucht wird
    return allEmojis.slice(0, 48);
  }, [emojiSearch]);

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
      setEmojiSearch('');
      setActiveCategory('smileys');
    }
  }, [isOpen]);

  // Schließen bei Escape oder Klick außerhalb
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, showEmojiPicker]);

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
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center overflow-visible"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className={cn(
            "w-full max-w-md rounded-xl shadow-2xl overflow-visible",
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
              <div className="relative" ref={emojiPickerRef}>
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

                {/* Emoji Picker Dropdown - Google Chat Style */}
                {showEmojiPicker && (
                  <div className={cn(
                    "absolute top-full left-0 mt-2 z-100 rounded-xl shadow-2xl border w-[340px]",
                    isDark 
                      ? "bg-[#292a2d] border-white/10" 
                      : "bg-white border-gray-200"
                  )}>
                    {/* Suchleiste */}
                    <div className={cn(
                      "p-3 border-b",
                      isDark ? "border-white/10" : "border-gray-100"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg",
                        isDark ? "bg-[#3c4043]" : "bg-gray-100"
                      )}>
                        <Search className={cn("h-4 w-4", isDark ? "text-gray-400" : "text-gray-500")} />
                        <input
                          type="text"
                          value={emojiSearch}
                          onChange={(e) => setEmojiSearch(e.target.value)}
                          placeholder="Suchen"
                          className={cn(
                            "flex-1 bg-transparent text-sm outline-none",
                            isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
                          )}
                        />
                      </div>
                    </div>

                    {/* Kategorie-Icons */}
                    <div className={cn(
                      "flex items-center gap-1 px-3 py-2 border-b overflow-x-auto",
                      isDark ? "border-white/10" : "border-gray-100"
                    )}>
                      {(Object.entries(EMOJI_CATEGORIES) as [CategoryKey, typeof EMOJI_CATEGORIES[CategoryKey]][]).map(([key, cat]) => {
                        const Icon = cat.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setActiveCategory(key);
                              setEmojiSearch('');
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-colors shrink-0",
                              activeCategory === key 
                                ? isDark 
                                  ? "bg-[#8ab4f8]/20 text-[#8ab4f8]" 
                                  : "bg-teal-50 text-teal-600"
                                : isDark 
                                  ? "text-gray-400 hover:bg-white/5" 
                                  : "text-gray-500 hover:bg-gray-50"
                            )}
                            title={cat.label}
                          >
                            <Icon className="h-5 w-5" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Emoji-Grid */}
                    <div className="p-3 max-h-[280px] overflow-y-auto">
                      {/* Kürzlich verwendet */}
                      {!emojiSearch && recentEmojis.length > 0 && (
                        <div className="mb-4">
                          <div className={cn(
                            "flex items-center gap-2 mb-2 text-xs font-medium uppercase tracking-wide",
                            isDark ? "text-gray-500" : "text-gray-400"
                          )}>
                            <Clock className="h-3 w-3" />
                            Häufig genutzt
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {recentEmojis.map((emoji, index) => (
                              <button
                                key={`recent-${index}`}
                                onClick={() => {
                                  setSelectedEmoji(emoji);
                                  addToRecent(emoji);
                                  setShowEmojiPicker(false);
                                }}
                                className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-110",
                                  isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                )}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suchergebnisse oder Kategorie */}
                      <div>
                        <div className={cn(
                          "mb-2 text-xs font-medium uppercase tracking-wide",
                          isDark ? "text-gray-500" : "text-gray-400"
                        )}>
                          {filteredEmojis ? 'Suchergebnisse' : EMOJI_CATEGORIES[activeCategory].label}
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                          {(filteredEmojis || EMOJI_CATEGORIES[activeCategory].emojis).map((emoji, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSelectedEmoji(emoji);
                                addToRecent(emoji);
                                setShowEmojiPicker(false);
                              }}
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-110",
                                isDark ? "hover:bg-white/10" : "hover:bg-gray-100",
                                selectedEmoji === emoji && (isDark ? "bg-white/20" : "bg-teal-50")
                              )}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
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
