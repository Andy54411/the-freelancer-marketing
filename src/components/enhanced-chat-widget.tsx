import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bot, User, Clock, CheckCircle2 } from 'lucide-react';

interface ChatMessage {
    id: string;
    sender: 'customer' | 'ai' | 'human_agent';
    senderName?: string;
    message: string;
    timestamp: string;
    messageType: 'text' | 'system' | 'escalation_notice' | 'handover_notice';
}

interface SessionStatus {
    sessionType: 'ai_only' | 'ai_with_escalation' | 'human_takeover';
    supportAgentName?: string;
    escalationReason?: string;
    isHumanActive: boolean;
}

interface EnhancedChatWidgetProps {
    sessionId: string;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    onMessageSent?: (message: string) => void;
}

export const EnhancedChatWidget: React.FC<EnhancedChatWidgetProps> = ({
    sessionId,
    customerId,
    customerName,
    customerEmail,
    onMessageSent
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
        sessionType: 'ai_only',
        isHumanActive: false
    });
    const [isEscalating, setIsEscalating] = useState(false);

    // Hole Session-Status
    useEffect(() => {
        const fetchSessionStatus = async () => {
            try {
                const response = await fetch('/api/enhanced-chatbot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'get_status',
                        sessionId,
                        customerId
                    })
                });

                const data = await response.json();
                if (data.success) {
                    setSessionStatus({
                        sessionType: data.sessionType,
                        supportAgentName: data.supportAgentName,
                        escalationReason: data.escalationReason,
                        isHumanActive: data.isHumanActive
                    });
                }
            } catch (error) {
                console.error('Fehler beim Abrufen des Session-Status:', error);
            }
        };

        fetchSessionStatus();
        const interval = setInterval(fetchSessionStatus, 30000); // Alle 30 Sekunden prüfen

        return () => clearInterval(interval);
    }, [sessionId, customerId]);

    const sendMessage = async () => {
        if (!newMessage.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: 'customer',
            message: newMessage,
            timestamp: new Date().toISOString(),
            messageType: 'text'
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/enhanced-chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'chat',
                    sessionId,
                    customerId,
                    customerName,
                    customerEmail,
                    userMessage: newMessage
                })
            });

            const data = await response.json();

            if (data.success) {
                // Prüfe auf Eskalation
                if (data.shouldEscalate) {
                    setIsEscalating(true);
                    setSessionStatus(prev => ({
                        ...prev,
                        sessionType: 'ai_with_escalation',
                        escalationReason: data.escalationReason
                    }));

                    // Eskalations-Nachricht hinzufügen
                    const escalationMessage: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        sender: 'ai',
                        message: data.escalationMessage,
                        timestamp: new Date().toISOString(),
                        messageType: 'escalation_notice'
                    };
                    setMessages(prev => [...prev, escalationMessage]);
                } else {
                    // Normale KI-Antwort (hier würde normalerweise die KI-API aufgerufen)
                    const aiResponse: ChatMessage = {
                        id: (Date.now() + 1).toString(),
                        sender: 'ai',
                        senderName: 'Tasko KI-Support',
                        message: 'Ich habe Ihre Nachricht erhalten und bearbeite sie. Einen Moment bitte...',
                        timestamp: new Date().toISOString(),
                        messageType: 'text'
                    };
                    setMessages(prev => [...prev, aiResponse]);
                }

                onMessageSent?.(newMessage);
            }
        } catch (error) {
            console.error('Fehler beim Senden der Nachricht:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIndicator = () => {
        switch (sessionStatus.sessionType) {
            case 'ai_only':
                return (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Bot className="h-4 w-4" />
                        <span className="text-sm">KI-Support aktiv</span>
                    </div>
                );
            case 'ai_with_escalation':
                return (
                    <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Support-Mitarbeiter wird kontaktiert...</span>
                    </div>
                );
            case 'human_takeover':
                return (
                    <div className="flex items-center gap-2 text-green-600">
                        <User className="h-4 w-4" />
                        <span className="text-sm">
                            {sessionStatus.supportAgentName} (Support-Team)
                        </span>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderMessage = (message: ChatMessage) => {
        const isHuman = message.sender === 'human_agent';
        const isAI = message.sender === 'ai';
        const isCustomer = message.sender === 'customer';

        return (
            <div
                key={message.id}
                className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} mb-4`}
            >
                <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${isCustomer
                            ? 'bg-blue-500 text-white'
                            : isHuman
                                ? 'bg-green-100 text-green-800 border-l-4 border-green-500'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                >
                    {message.messageType === 'escalation_notice' && (
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <Badge variant="outline" className="text-orange-600">
                                Eskalation
                            </Badge>
                        </div>
                    )}

                    {message.messageType === 'handover_notice' && (
                        <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-green-500" />
                            <Badge variant="outline" className="text-green-600">
                                Menschlicher Support
                            </Badge>
                        </div>
                    )}

                    {(isHuman || isAI) && message.senderName && (
                        <div className="flex items-center gap-2 mb-1">
                            {isHuman ? (
                                <User className="h-3 w-3" />
                            ) : (
                                <Bot className="h-3 w-3" />
                            )}
                            <span className="text-xs font-medium">
                                {message.senderName}
                                {isHuman && ' (Support-Team)'}
                            </span>
                        </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>

                    <div className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString('de-DE')}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Card className="w-full max-w-2xl h-96 flex flex-col">
            <div className="border-b px-4 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Tasko Support</h3>
                    {getStatusIndicator()}
                </div>

                {sessionStatus.sessionType === 'ai_with_escalation' && (
                    <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-700">
                                Ein Support-Mitarbeiter wird sich in Kürze bei Ihnen melden.
                            </span>
                        </div>
                        {sessionStatus.escalationReason && (
                            <p className="text-xs text-orange-600 mt-1">
                                Grund: {sessionStatus.escalationReason}
                            </p>
                        )}
                    </div>
                )}

                {sessionStatus.sessionType === 'human_takeover' && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-700">
                                Sie chatten jetzt mit einem echten Menschen
                            </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                            Alle Nachrichten werden persönlich beantwortet
                        </p>
                    </div>
                )}
            </div>

            <CardContent className="flex-1 overflow-y-auto p-4">
                {messages.map(renderMessage)}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                <span className="text-sm text-gray-600">Wird bearbeitet...</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>

            <div className="border-t p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ihre Nachricht..."
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={isLoading || !newMessage.trim()}
                        className="px-4 py-2"
                    >
                        Senden
                    </Button>
                </div>
            </div>
        </Card>
    );
};
