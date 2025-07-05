'use client';

import React from 'react';
import Image from 'next/image';
import { FiUser, FiLoader } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChatSession } from './AdminSupportChat';

interface ChatListProps {
    chats: ChatSession[];
    selectedChatId: string | null;
    onSelectChat: (chatId: string) => void;
    loading: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat, loading }) => {
    const { user } = useAuth(); // Get current admin/support user
    return (
        <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 overflow-y-auto bg-white flex-shrink-0">
            <div className="p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Support-Anfragen</h2>
            </div>
            {loading ? (
                <div className="flex justify-center items-center p-10"><FiLoader className="animate-spin text-2xl text-teal-500" /></div>
            ) : chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Keine aktiven Anfragen.</div>
            ) : (
                <div>
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={`flex items-center p-3 cursor-pointer border-b border-gray-200 transition-colors duration-150 ${selectedChatId === chat.id ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                        >
                            <div className="relative mr-3 flex-shrink-0">
                                {chat.customerProfilePicture ? (
                                    <Image src={chat.customerProfilePicture} alt={chat.customerName || 'User'} width={48} height={48} className="rounded-full object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center"><FiUser className="text-white" size={24} /></div>
                                )}
                                {/* Show unread indicator if the last message is not marked as read by support AND it was not sent by the current support user */}
                                {chat.lastMessage && !chat.lastMessage.isReadBySupport && chat.lastMessage.senderId !== user?.uid && (
                                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800 truncate">{chat.customerName}</h3>
                                    <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                        {chat.lastMessage?.timestamp && formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true, locale: de })}
                                    </p>
                                </div>
                                <p className={`text-sm truncate ${chat.lastMessage && !chat.lastMessage.isReadBySupport && chat.lastMessage.senderId !== user?.uid ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>{chat.lastMessage?.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatList;