// /Users/andystaudinger/Tasko/src/app/dashboard/user/[uid]/components/Support/ChatMessageBubble.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { FiUser, FiCpu } from 'react-icons/fi';
import type { ChatMessage } from './SupportChatInterface';

interface ChatMessageBubbleProps {
    message: ChatMessage;
    isCurrentUser: boolean;
}

const formatMessageTimestamp = (timestamp: any): string => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    const date = timestamp.toDate();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (date >= startOfToday) {
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message, isCurrentUser }) => {
    // NEU: Spezielle Darstellung für Systemnachrichten
    if (message.senderType === 'system' && message.systemPayload) {
        return (
            <div className="flex justify-center items-center my-4 gap-2">
                <div className="flex-shrink-0">
                    {message.systemPayload.agentAvatarUrl ? (
                        <Image src={message.systemPayload.agentAvatarUrl} alt={message.systemPayload.agentName} width={24} height={24} className="rounded-full object-cover" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center"><FiUser className="text-white" size={14} /></div>
                    )}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {message.text}
                </span>
            </div>
        );
    }

    const isBot = message.senderType === 'bot';

    const alignment = isCurrentUser ? 'justify-end' : 'justify-start';
    const bubbleStyles = isCurrentUser ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-800';
    const timestampStyles = isCurrentUser ? 'text-teal-100' : 'text-gray-500';

    const Avatar = () => {
        if (isCurrentUser) {
            return <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0"><FiUser className="text-white" /></div>;
        }
        // Für Bot oder Support wird dasselbe Icon verwendet, aber mit unterschiedlichem Tooltip
        return <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0" title={isBot ? "Chatbot" : "Support"}><FiCpu className="text-teal-600" /></div>;
    };

    return (
        <div className={`flex items-start gap-3 ${alignment}`} title={`Gesendet von ${message.senderName}`}>
            {!isCurrentUser && <Avatar />}
            <div className={`max-w-[80%] p-3 rounded-lg ${bubbleStyles}`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p className={`text-xs mt-1 ${timestampStyles} text-right`}>
                    {formatMessageTimestamp(message.timestamp)}
                </p>
            </div>
            {isCurrentUser && <Avatar />}
        </div>
    );
};

export default ChatMessageBubble;