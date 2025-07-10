import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, User, Bot, TrendingUp, MessageSquare } from 'lucide-react';

interface EscalationItem {
    id: string;
    sessionId: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    customerName?: string;
    customerEmail?: string;
    createdAt: string;
    status: 'pending' | 'assigned' | 'resolved';
}

interface ActiveSession {
    id: string;
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    sessionType: 'ai_only' | 'ai_with_escalation' | 'human_takeover';
    supportAgentName?: string;
    escalationReason?: string;
    totalMessages: number;
    updatedAt: string;
}

interface FrequentQuestion {
    id: string;
    question: string;
    questionCategory: string;
    frequency: number;
    escalationRate: number;
    avgResolutionTime: number;
    lastAsked: string;
}

interface SupportDashboardProps {
    supportAgentId: string;
    supportAgentName: string;
}

export const SupportDashboard: React.FC<SupportDashboardProps> = ({
    supportAgentId,
    supportAgentName
}) => {
    const [escalations, setEscalations] = useState<EscalationItem[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [frequentQuestions, setFrequentQuestions] = useState<FrequentQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Alle 30 Sekunden aktualisieren

        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/support-dashboard');
            const data = await response.json();

            if (data.success) {
                setEscalations(data.escalations);
                setActiveSessions(data.activeSessions);
                setFrequentQuestions(data.frequentQuestions);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Dashboard-Daten:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const takeOverSession = async (sessionId: string) => {
        try {
            const response = await fetch('/api/enhanced-chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'human_takeover',
                    sessionId,
                    supportAgentId,
                    supportAgentName,
                    customerId: 'temp' // Wird vom Backend ignoriert bei human_takeover
                })
            });

            const data = await response.json();
            if (data.success) {
                setSelectedSession(sessionId);
                fetchDashboardData(); // Dashboard aktualisieren
            }
        } catch (error) {
            console.error('Fehler beim Übernehmen der Session:', error);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('de-DE');
    };

    const getUrgencyColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'cancellation': return 'bg-orange-100 text-orange-800';
            case 'billing': return 'bg-purple-100 text-purple-800';
            case 'technical': return 'bg-red-100 text-red-800';
            case 'scheduling': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Support Dashboard</h1>
                <p className="text-gray-600">
                    Willkommen zurück, {supportAgentName}! Hier sind die aktuellen Support-Anfragen.
                </p>
            </div>

            <Tabs defaultValue="escalations" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="escalations" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Eskalationen ({escalations.length})
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Aktive Chats ({activeSessions.length})
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Häufige Fragen
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="escalations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                Wartende Eskalationen
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {escalations.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    Keine wartenden Eskalationen. Gut gemacht! 🎉
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {escalations.map((escalation) => (
                                        <div
                                            key={escalation.id}
                                            className="border rounded-lg p-4 hover:bg-gray-50"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge className={getUrgencyColor(escalation.priority)}>
                                                            {escalation.priority.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-sm text-gray-600">
                                                            {formatTime(escalation.createdAt)}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-medium text-gray-900 mb-1">
                                                        {escalation.customerName || 'Unbekannter Kunde'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {escalation.customerEmail}
                                                    </p>
                                                    <p className="text-sm text-gray-800">
                                                        <strong>Grund:</strong> {escalation.reason}
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => takeOverSession(escalation.sessionId)}
                                                    className="ml-4"
                                                >
                                                    Übernehmen
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-blue-500" />
                                Aktive Chat-Sessions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeSessions.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">
                                    Keine aktiven Chat-Sessions.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {activeSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className="border rounded-lg p-4 hover:bg-gray-50"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {session.sessionType === 'human_takeover' ? (
                                                            <Badge className="bg-green-100 text-green-800">
                                                                <User className="h-3 w-3 mr-1" />
                                                                Menschlich
                                                            </Badge>
                                                        ) : session.sessionType === 'ai_with_escalation' ? (
                                                            <Badge className="bg-orange-100 text-orange-800">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                Eskaliert
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-blue-100 text-blue-800">
                                                                <Bot className="h-3 w-3 mr-1" />
                                                                KI-Only
                                                            </Badge>
                                                        )}
                                                        <span className="text-sm text-gray-600">
                                                            {session.totalMessages} Nachrichten
                                                        </span>
                                                    </div>
                                                    <h3 className="font-medium text-gray-900 mb-1">
                                                        {session.customerName || 'Unbekannter Kunde'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {session.customerEmail}
                                                    </p>
                                                    {session.escalationReason && (
                                                        <p className="text-sm text-gray-800">
                                                            <strong>Eskalationsgrund:</strong> {session.escalationReason}
                                                        </p>
                                                    )}
                                                    {session.supportAgentName && (
                                                        <p className="text-sm text-green-600">
                                                            <strong>Betreut von:</strong> {session.supportAgentName}
                                                        </p>
                                                    )}
                                                </div>
                                                {session.sessionType !== 'human_takeover' && (
                                                    <Button
                                                        onClick={() => takeOverSession(session.id)}
                                                        variant="outline"
                                                        className="ml-4"
                                                    >
                                                        Übernehmen
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-purple-500" />
                                Häufige Fragen & Analytics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {frequentQuestions.map((question) => (
                                    <div
                                        key={question.id}
                                        className="border rounded-lg p-4"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className={getCategoryColor(question.questionCategory)}>
                                                        {question.questionCategory}
                                                    </Badge>
                                                    <span className="text-sm text-gray-600">
                                                        {question.frequency}x gefragt
                                                    </span>
                                                </div>
                                                <h3 className="font-medium text-gray-900 mb-1">
                                                    {question.question}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span>
                                                        ⏱️ Ø {Math.round(question.avgResolutionTime)}s
                                                    </span>
                                                    <span>
                                                        📈 {Math.round(question.escalationRate * 100)}% Eskalation
                                                    </span>
                                                    <span>
                                                        🕒 Zuletzt: {formatTime(question.lastAsked)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
