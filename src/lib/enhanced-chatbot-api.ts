// Integration-Beispiel für die Enhanced Chatbot APIs in der Tasko-App

/**
 * Frontend Integration der Enhanced Chatbot APIs
 */

// 1. API-Konstanten
const CHATBOT_API_URL = 'https://europe-west1-tilvo-f142f.cloudfunctions.net/enhancedChatbot';
const DASHBOARD_API_URL = 'https://europe-west1-tilvo-f142f.cloudfunctions.net/supportDashboard';

// Live Frontend URL: https://tasko-live.vercel.app

// 2. Chat-Funktion für Kunden
export async function sendChatMessage(sessionId: string, customerId: string, message: string, customerName?: string, customerEmail?: string) {
    try {
        const response = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'chat',
                sessionId,
                customerId,
                userMessage: message,
                customerName,
                customerEmail
            })
        });

        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                shouldEscalate: data.shouldEscalate,
                escalationMessage: data.escalationMessage,
                sessionType: data.sessionType,
                systemInstruction: data.systemInstruction // Für weitere KI-Verarbeitung
            };
        } else {
            throw new Error(data.error || 'Fehler beim Senden der Nachricht');
        }
    } catch (error) {
        console.error('Chat API Fehler:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        };
    }
}

// 3. Support-Agent Übernahme
export async function takeoverSession(sessionId: string, supportAgentId: string, supportAgentName: string) {
    try {
        const response = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'human_takeover',
                sessionId,
                customerId: 'temp', // Wird vom Backend ignoriert
                supportAgentId,
                supportAgentName
            })
        });

        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                handoverMessage: data.handoverMessage,
                sessionType: data.sessionType
            };
        } else {
            throw new Error(data.error || 'Fehler bei der Übernahme');
        }
    } catch (error) {
        console.error('Takeover API Fehler:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        };
    }
}

// 4. Session-Status abrufen
export async function getSessionStatus(sessionId: string) {
    try {
        const response = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_status',
                sessionId,
                customerId: 'temp' // Wird vom Backend ignoriert
            })
        });

        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                sessionType: data.sessionType,
                supportAgentName: data.supportAgentName,
                escalationReason: data.escalationReason,
                isHumanActive: data.isHumanActive
            };
        } else {
            throw new Error(data.error || 'Fehler beim Abrufen des Status');
        }
    } catch (error) {
        console.error('Status API Fehler:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        };
    }
}

// 5. Support Dashboard Daten abrufen
export async function getSupportDashboardData() {
    try {
        const response = await fetch(DASHBOARD_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
            return {
                success: true,
                escalations: data.escalations,
                activeSessions: data.activeSessions,
                frequentQuestions: data.frequentQuestions,
                summary: data.summary
            };
        } else {
            throw new Error(data.error || 'Fehler beim Laden der Dashboard-Daten');
        }
    } catch (error) {
        console.error('Dashboard API Fehler:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        };
    }
}

import { useState, useEffect } from 'react';

// 6. React Hook für Chat-Funktionalität
export function useChatbot(sessionId: string, customerId: string, customerName?: string, customerEmail?: string) {
    const [sessionStatus, setSessionStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Status periodisch aktualisieren
    useEffect(() => {
        const fetchStatus = async () => {
            const result = await getSessionStatus(sessionId);
            if (result.success) {
                setSessionStatus(result);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Alle 30 Sekunden

        return () => clearInterval(interval);
    }, [sessionId]);

    const sendMessage = async (message: string) => {
        setIsLoading(true);
        try {
            const result = await sendChatMessage(sessionId, customerId, message, customerName, customerEmail);

            if (result.success && result.shouldEscalate) {
                // Aktualisiere Status nach Eskalation
                const statusResult = await getSessionStatus(sessionId);
                if (statusResult.success) {
                    setSessionStatus(statusResult);
                }
            }

            return result;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        sessionStatus,
        sendMessage,
        isLoading,
        isHumanActive: sessionStatus?.isHumanActive || false,
        sessionType: sessionStatus?.sessionType || 'ai_only'
    };
}

// 7. React Hook für Support Dashboard
export function useSupportDashboard() {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            const result = await getSupportDashboardData();

            if (result.success) {
                setDashboardData(result);
            } else {
                setError(result.error || 'Fehler beim Laden');
            }

            setIsLoading(false);
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // Alle 60 Sekunden

        return () => clearInterval(interval);
    }, []);

    const takeover = async (sessionId: string, agentId: string, agentName: string) => {
        const result = await takeoverSession(sessionId, agentId, agentName);

        if (result.success) {
            // Aktualisiere Dashboard-Daten
            const dashboardResult = await getSupportDashboardData();
            if (dashboardResult.success) {
                setDashboardData(dashboardResult);
            }
        }

        return result;
    };

    return {
        dashboardData,
        isLoading,
        error,
        takeover,
        refresh: () => {
            const fetchData = async () => {
                const result = await getSupportDashboardData();
                if (result.success) {
                    setDashboardData(result);
                }
            };
            fetchData();
        }
    };
}

// 8. Beispiel-Verwendung in einer React-Komponente
/*
function ChatWidget({ sessionId, customerId, customerName, customerEmail }) {
    const { sessionStatus, sendMessage, isLoading, isHumanActive, sessionType } = useChatbot(
        sessionId, 
        customerId, 
        customerName, 
        customerEmail
    );

    const handleSendMessage = async (message: string) => {
        const result = await sendMessage(message);
        
        if (result.shouldEscalate) {
            // Zeige Eskalations-Nachricht
            alert(result.escalationMessage);
        }
    };

    return (
        <div className="chat-widget">
            {sessionType === 'human_takeover' && (
                <div className="human-active-banner">
                    👤 Sie chatten jetzt mit {sessionStatus?.supportAgentName} (Support-Team)
                </div>
            )}
            
            {sessionType === 'ai_with_escalation' && (
                <div className="escalation-banner">
                    ⏰ Ein Support-Mitarbeiter wird sich in Kürze bei Ihnen melden
                </div>
            )}
            
            // ... Rest der Chat-UI
        </div>
    );
}

function SupportDashboard() {
    const { dashboardData, isLoading, error, takeover } = useSupportDashboard();

    if (isLoading) return <div>Lädt...</div>;
    if (error) return <div>Fehler: {error}</div>;

    return (
        <div className="support-dashboard">
            <h1>Support Dashboard</h1>
            
            <div className="summary">
                <div>Eskalationen: {dashboardData?.summary?.totalEscalations}</div>
                <div>Aktive Chats: {dashboardData?.summary?.totalActiveSessions}</div>
            </div>
            
            <div className="escalations">
                {dashboardData?.escalations?.map((escalation: any) => (
                    <div key={escalation.id} className="escalation-item">
                        <h3>{escalation.customerName}</h3>
                        <p>Grund: {escalation.reason}</p>
                        <button onClick={() => takeover(escalation.sessionId, 'agent-123', 'Sarah Schmidt')}>
                            Übernehmen
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
*/

export default {
    sendChatMessage,
    takeoverSession,
    getSessionStatus,
    getSupportDashboardData,
    useChatbot,
    useSupportDashboard
};
