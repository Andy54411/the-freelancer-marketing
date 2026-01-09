// WhatsApp Komponenten - Index Export

export { default as WhatsAppLogo } from './WhatsAppLogo';
export { default as ChatAvatar, AgentAvatar } from './ChatAvatar';
export { default as SetupScreen } from './SetupScreen';
export { default as ChatListPanel } from './ChatListPanel';
export { default as ActiveChatPanel } from './ActiveChatPanel';
export { default as ChatInfoPanel } from './ChatInfoPanel';

// Neue Komponenten für erweiterte Funktionen (default exports)
export { default as ChatAssignmentDropdown } from './ChatAssignmentDropdown';
export { default as ContactLinker } from './ContactLinker';
export { default as MessageScheduler } from './MessageScheduler';
export { DSGVODashboard } from './DSGVODashboard';

// Inbox Komponenten
export { MessageBubble } from './inbox/MessageBubble';
export { MessageMedia } from './inbox/MessageMedia';
export { QuickReplies } from './inbox/QuickReplies';
export { MediaUpload } from './inbox/MediaUpload';
export { VoiceRecorder } from './inbox/VoiceRecorder';
export { EmojiPicker } from './inbox/EmojiPicker';
export { ConversationItem } from './inbox/ConversationItem';
export { MessageComposer } from './inbox/MessageComposer';
export { MessageList } from './inbox/MessageList';
export { TypingIndicator, TypingIndicatorBubble } from './inbox/TypingIndicator';
export { SearchMessages } from './inbox/SearchMessages';

// Template Komponenten
export { TemplateEditor } from './templates/TemplateEditor';
export { TemplatePicker } from './templates/TemplatePicker';
export { TemplatePreview } from './templates/TemplatePreview';

// Automation Komponenten
export { BusinessHoursEditor } from './automation/BusinessHoursEditor';
export { KeywordTriggers } from './automation/KeywordTriggers';
export { AbsenceEditor } from './automation/AbsenceEditor';

// Contact Komponenten
export { ContactList } from './contacts/ContactList';
export { ContactCard } from './contacts/ContactCard';
export type { Contact } from './contacts/ContactCard';

// Shared Komponenten
export { 
  LoadingState, 
  ConversationSkeleton, 
  MessageSkeleton, 
  TemplateSkeleton,
  ChatHeaderSkeleton,
  PageLoading 
} from './shared/LoadingState';
export { EmptyState, InlineEmptyState, ErrorState } from './shared/EmptyState';

export * from './types';
export * from './utils';
