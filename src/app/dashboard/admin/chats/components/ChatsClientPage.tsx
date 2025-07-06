'use client';

import { useState } from 'react';

export function ChatsClientPage({ chats: initialChats }: { chats: any[] }) {
    const [chats, setChats] = useState(initialChats);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Alle Chats</h1>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chat-ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nachricht</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {chats.map((chat) => (
                            <tr key={chat.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{chat.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{chat.senderId}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{chat.text}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(chat.timestamp.seconds * 1000).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
