/**
 * MessageComposer Component
 * 
 * Nachrichten-Eingabe mit allen Features
 */
'use client';

import React from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  X, 
  ImageIcon, 
  FileText, 
  MapPin, 
  User,
  Zap,
  Reply
} from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { QuickReplies } from './QuickReplies';
import { VoiceRecorder } from './VoiceRecorder';
import { MediaUpload } from './MediaUpload';

interface ReplyToMessage {
  id: string;
  text?: string;
  from?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  isUploading?: boolean;
  error?: string;
  mediaId?: string;
}

interface MessageComposerProps {
  companyId: string;
  recipientPhone: string;
  replyTo?: ReplyToMessage | null;
  onClearReply?: () => void;
  onSend: (message: {
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts';
    text?: string;
    mediaId?: string;
    caption?: string;
    latitude?: number;
    longitude?: number;
    replyToMessageId?: string;
  }) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  companyId,
  recipientPhone: _recipientPhone,
  replyTo,
  onClearReply,
  onSend,
  disabled = false,
  placeholder = 'Nachricht schreiben...',
}: MessageComposerProps) {
  const [message, setMessage] = React.useState('');
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showQuickReplies, setShowQuickReplies] = React.useState(false);
  const [showAttachments, setShowAttachments] = React.useState(false);
  const [showMediaUpload, setShowMediaUpload] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Shortcut-Erkennung für Quick Replies
  React.useEffect(() => {
    if (message.startsWith('/') && message.length > 1) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  }, [message]);

  const handleSend = async () => {
    if ((!message.trim() && uploadedFiles.length === 0) || isSending || disabled) return;

    setIsSending(true);
    try {
      // Zuerst hochgeladene Dateien senden
      for (const file of uploadedFiles) {
        if (file.mediaId) {
          await onSend({
            type: file.type,
            mediaId: file.mediaId,
            caption: message.trim() || undefined,
            replyToMessageId: replyTo?.id,
          });
        }
      }

      // Dann Textnachricht senden (wenn keine Dateien oder zusätzlicher Text)
      if (message.trim() && uploadedFiles.length === 0) {
        await onSend({
          type: 'text',
          text: message.trim(),
          replyToMessageId: replyTo?.id,
        });
      }

      setMessage('');
      setUploadedFiles([]);
      onClearReply?.();
    } catch {
      // Fehler wird im Parent behandelt
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleQuickReplySelect = (quickReply: { content: string }) => {
    setMessage(quickReply.content);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const handleVoiceSend = async (audioBlob: Blob, _duration: number) => {
    setIsSending(true);
    try {
      // Audio hochladen
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.ogg');
      formData.append('companyId', companyId);

      const response = await fetch('/api/whatsapp/media', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await onSend({
          type: 'audio',
          mediaId: data.mediaId,
          replyToMessageId: replyTo?.id,
        });
        onClearReply?.();
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setIsSending(false);
      setIsRecording(false);
    }
  };

  const handleLocationSend = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation wird nicht unterstützt');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsSending(true);
        try {
          await onSend({
            type: 'location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            replyToMessageId: replyTo?.id,
          });
          onClearReply?.();
        } finally {
          setIsSending(false);
          setShowAttachments(false);
        }
      },
      () => {
        alert('Standort konnte nicht ermittelt werden');
      }
    );
  };

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowAttachments(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Voice Recording Mode
  if (isRecording) {
    return (
      <div className="border-t border-gray-200 p-3 bg-white">
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setIsRecording(false)}
          isRecording={isRecording}
          onStartRecording={() => {}}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="border-t border-gray-200 bg-white">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <Reply className="w-4 h-4 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Antwort auf</p>
            <p className="text-sm text-gray-700 truncate">{replyTo.text || 'Nachricht'}</p>
          </div>
          <button onClick={onClearReply} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <MediaUpload
            companyId={companyId}
            files={uploadedFiles}
            onUpload={setUploadedFiles}
            onRemove={(index) => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
          />
        </div>
      )}

      {/* Quick Replies Popup */}
      <div className="relative">
        <QuickReplies
          companyId={companyId}
          isOpen={showQuickReplies}
          onClose={() => setShowQuickReplies(false)}
          onSelect={handleQuickReplySelect}
          searchQuery={message}
        />
      </div>

      {/* Main Composer */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment Menu */}
          {showAttachments && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[180px] z-10">
              <button
                onClick={() => {
                  setShowMediaUpload(true);
                  setShowAttachments(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                </div>
                Bilder & Videos
              </button>
              <button
                onClick={() => {
                  setShowMediaUpload(true);
                  setShowAttachments(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                Dokumente
              </button>
              <button
                onClick={handleLocationSend}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                Standort
              </button>
              <button
                onClick={() => setShowAttachments(false)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                Kontakt
              </button>
            </div>
          )}
        </div>

        {/* Quick Replies Button */}
        <button
          onClick={() => setShowQuickReplies(!showQuickReplies)}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          disabled={disabled}
          title="Schnellantworten"
        >
          <Zap className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2.5 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 disabled:opacity-50"
            style={{ maxHeight: '150px' }}
          />
        </div>

        {/* Emoji Button */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            disabled={disabled}
          >
            <Smile className="w-5 h-5" />
          </button>
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={handleEmojiSelect}
          />
        </div>

        {/* Send or Voice Button */}
        {message.trim() || uploadedFiles.length > 0 ? (
          <button
            onClick={handleSend}
            disabled={isSending || disabled}
            className="p-2 bg-[#14ad9f] hover:bg-teal-600 rounded-full text-white disabled:opacity-50"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsRecording(true)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            disabled={disabled}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Media Upload Modal */}
      {showMediaUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Dateien hochladen</h3>
              <button onClick={() => setShowMediaUpload(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <MediaUpload
              companyId={companyId}
              files={uploadedFiles}
              onUpload={setUploadedFiles}
              onRemove={(index) => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowMediaUpload(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={() => setShowMediaUpload(false)}
                disabled={uploadedFiles.length === 0}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
