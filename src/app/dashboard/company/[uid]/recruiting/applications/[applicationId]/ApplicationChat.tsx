'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Video } from 'lucide-react';
import { toast } from 'sonner';
import TaskiloVideoCall from '@/components/video/TaskiloVideoCall';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'applicant';
  timestamp: Date;
  isRead: boolean;
}

interface ApplicationChatProps {
  applicationId: string;
  companyId: string;
}

export function ApplicationChat({ applicationId, companyId }: ApplicationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [applicationId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/recruiting/applications/${applicationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/recruiting/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          sender: 'user',
        }),
      });

      if (response.ok) {
        const newMsg: Message = {
          id: Date.now().toString(),
          content: newMessage,
          sender: 'user',
          timestamp: new Date(),
          isRead: true,
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        toast.success('Nachricht gesendet');
      } else {
        toast.error('Fehler beim Senden der Nachricht');
      }
    } catch (error) {
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVideoCall = () => {
    setIsVideoCallOpen(true);
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Chat mit Bewerber</h3>
      
      <ScrollArea className="h-64 mb-4 border rounded p-2" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Noch keine Nachrichten
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg flex items-start gap-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.sender === 'applicant' && (
                    <User className="h-4 w-4 mt-1 shrink-0" />
                  )}
                  {message.sender === 'user' && (
                    <Bot className="h-4 w-4 mt-1 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleString('de-DE')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          placeholder="Nachricht eingeben..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="min-h-[60px]"
          rows={2}
        />
        <Button
          variant="outline"
          size="sm"
          className="self-end"
          title="Video-Call starten"
          onClick={startVideoCall}
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isLoading}
          size="sm"
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Video Call Modal */}
      <TaskiloVideoCall
        chatId={`recruitment_${applicationId}`}
        userId={companyId}
        userName="HR Team"
        isInitiator={true}
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
      />
    </div>
  );
}
