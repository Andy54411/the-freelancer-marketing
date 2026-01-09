// Hook für den Taskilo KI-Projekt-Assistenten
// src/hooks/useProjectAssistant.ts

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    step?: string;
    suggestions?: string[];
    actionRequired?: boolean;
    orderData?: any;
    providerMatches?: any[];
  };
}

interface UseProjectAssistantReturn {
  messages: Message[];
  isLoading: boolean;
  currentStep: string;
  sendMessage: (message: string) => Promise<void>;
  clearConversation: () => void;
  orderData: any;
}

export const useProjectAssistant = (existingOrderId?: string): UseProjectAssistantReturn => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(
    existingOrderId ? 'project-monitoring' : 'welcome'
  );
  const [orderData, setOrderData] = useState({});
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!user?.uid) {
        throw new Error('User must be authenticated');
      }

      // Füge User-Nachricht hinzu
      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch('/api/ai/project-assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            message,
            currentStep,
            orderData,
            sessionId,
            existingOrderId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Füge AI-Antwort hinzu
        const aiMessage: Message = {
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'assistant',
          content: data.response,
          timestamp: new Date(),
          metadata: {
            step: data.nextStep,
            suggestions: data.suggestions,
            actionRequired: data.actionRequired,
            orderData: data.orderData,
            providerMatches: data.providerMatches,
          },
        };

        setMessages(prev => [...prev, aiMessage]);

        // Update state
        if (data.nextStep) {
          setCurrentStep(data.nextStep);
        }
        if (data.orderData) {
          setOrderData(prev => ({ ...prev, ...data.orderData }));
        }
      } catch {
        // Fehler-Nachricht hinzufügen
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          type: 'assistant',
          content:
            'Entschuldigung, es gab einen technischen Fehler. Bitte versuchen Sie es erneut.',
          timestamp: new Date(),
          metadata: {
            suggestions: ['Erneut versuchen', 'Support kontaktieren'],
          },
        };

        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.uid, currentStep, orderData, sessionId, existingOrderId]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentStep(existingOrderId ? 'project-monitoring' : 'welcome');
    setOrderData({});
  }, [existingOrderId]);

  return {
    messages,
    isLoading,
    currentStep,
    sendMessage,
    clearConversation,
    orderData,
  };
};
