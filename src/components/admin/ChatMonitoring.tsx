'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Users,
  Clock,
  AlertCircle,
  TrendingUp,
  Search,
  RefreshCw,
  Activity,
  MessageCircle,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

interface ChatData {
  id: string;
  type: 'chat' | 'directChat' | 'supportChat';
  title: string;
  participants: string[];
  participantCount: number;
  lastActivity: string;
  messageCount: number;
  isActive: boolean;
  status?: string;
  priority?: string;
  orderId?: string;
  customerId?: string;
  providerId?: string;
  userId?: string;
  userEmail?: string;
  category?: string;
  recentMessages?: any[];
  createdAt?: string;
  updatedAt: string;
  hasSensitiveData?: boolean;
  sensitiveDataCount?: number;
  maxSeverity?: number;
}

interface SensitiveDataAlert {
  alertId: string;
  messageId: string;
  chatId: string;
  chatType: string;
  senderId: string;
  dataType: string;
  detectedData: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  reviewed: boolean;
  falsePositive: boolean;
  context: string;
}

interface ChatStats {
  totalChats: number;
  totalDirectChats: number;
  totalSupportChats: number;
  activeChats: number;
  totalMessages: number;
  supportChatsByStatus: Record<string, number>;
  supportChatsByPriority: Record<string, number>;
  lastUpdated: string;
  chatsByType: {
    chat: number;
    directChat: number;
    supportChat: number;
  };
  activityTrends: {
    today: number;
    thisWeek: number;
    total: number;
  };
  supportMetrics: {
    open: number;
    inProgress: number;
    resolved: number;
    highPriority: number;
  };
}

export default function ChatMonitoring() {
  const [chatData, setChatData] = useState<ChatData[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sensitiveDataAlerts, setSensitiveDataAlerts] = useState<SensitiveDataAlert[]>([]);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    fetchChatData();
    fetchChatStats();
    
    // Refresh data every 5 minutes
    const interval = setInterval(() => {
      fetchChatData();
      fetchChatStats();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [filterType, filterStatus]);

  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        action: 'list',
        limit: '100',
      });

      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      console.log('Fetching chats with params:', params.toString());
      const response = await fetch(`/api/admin/chats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received chat data:', data);
      setChatData(data.chats || []);
    } catch (error) {
      console.error('Error fetching chat data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchChatStats = async () => {
    try {
      const response = await fetch('/api/admin/chats?action=stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat stats: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received stats data:', data);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching chat stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chat statistics');
    }
  };

  const fetchChatMessages = async (chatId: string, chatType: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(
        `/api/admin/chats?action=messages&chatId=${chatId}&chatType=${chatType}&messageLimit=50`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat messages: ${response.statusText}`);
      }

      const data = await response.json();
      setChatMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch chat messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchSensitiveDataAlerts = async (chatId?: string) => {
    try {
      setAlertsLoading(true);
      
      const params = new URLSearchParams({
        action: 'sensitive-data-alerts',
        limit: '100',
      });
      
      if (chatId) {
        params.append('chatId', chatId);
      }

      const response = await fetch(`/api/admin/chats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sensitive data alerts: ${response.statusText}`);
      }

      const data = await response.json();
      setSensitiveDataAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching sensitive data alerts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch sensitive data alerts');
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleChatSelect = async (chat: any) => {
    setSelectedChat(chat);
    await Promise.all([
      fetchChatMessages(chat.id, chat.type),
      fetchSensitiveDataAlerts(chat.id)
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchChatData(), fetchChatStats()]);
    if (selectedChat) {
      await fetchChatMessages(selectedChat.id, selectedChat.type);
    }
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await fetchChatData();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/chats?action=search&q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      setChatData(data.chats || []);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const triggerAggregation = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/chats?action=aggregate', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to trigger aggregation: ${response.statusText}`);
      }

      // Refresh data after aggregation
      await Promise.all([fetchChatData(), fetchChatStats()]);
    } catch (error) {
      console.error('Aggregation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to trigger aggregation');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredChats = chatData.filter(chat => {
    if (searchTerm) return true; // Search results are already filtered
    
    const matchesType = filterType === 'all' || chat.type === filterType;
    const matchesStatus = filterStatus === 'all' || chat.status === filterStatus;
    
    return matchesType && matchesStatus;
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffDays > 0) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
      if (diffHours > 0) return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
      if (diffMinutes > 0) return `vor ${diffMinutes} Minute${diffMinutes > 1 ? 'n' : ''}`;
      return 'gerade eben';
    } catch {
      return 'Unbekannt';
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Fehler beim Laden der Chat-Daten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat-Monitoring</h1>
          <p className="text-muted-foreground">
            Überwachung und Verwaltung aller Chat-Aktivitäten
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={triggerAggregation} variant="outline" disabled={refreshing}>
            <Activity className="h-4 w-4 mr-2" />
            Daten aktualisieren
          </Button>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt-Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalChats || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.activityTrends?.thisWeek || 0} diese Woche
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Chats</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeChats || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activityTrends?.today || 0} heute aktiv
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support-Chats</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSupportChats || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.supportMetrics?.open || 0} offen, {stats?.supportMetrics?.highPriority || 0} hoch
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nachrichten</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">Gesamt versendet</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter und Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Nach Chats suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Chat-Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="chat">Standard</SelectItem>
                <SelectItem value="directChat">Direkt</SelectItem>
                <SelectItem value="supportChat">Support</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Suchen
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Gefunden:</span>
            {chatData.length > 0 && (
              <Badge variant="secondary">{chatData.length} Chats</Badge>
            )}
            {/* Debug Info */}
            <div className="ml-4 text-xs text-gray-500">
              Filter: {filterType} | Status: {filterStatus} | Geladen: {chatData.length} | Gefiltert: {filteredChats.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Vertical Layout */}
      <div className="space-y-6">
        {/* Chat-Liste Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Chat-Übersicht</CardTitle>
            <CardDescription>
              {filteredChats.length} Chats {searchTerm && `für "${searchTerm}"`}
              {stats?.lastUpdated && (
                <span className="ml-2 text-xs">
                  • Letzte Aktualisierung: {new Date(stats.lastUpdated).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Lade Chat-Daten...
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Chats gefunden
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                      selectedChat?.id === chat.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleChatSelect(chat)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{chat.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {chat.type === 'chat' ? 'Chat' : 
                             chat.type === 'directChat' ? 'Direkt' : 'Support'}
                          </Badge>
                          {chat.status && (
                            <Badge className={`text-xs ${getStatusColor(chat.status)}`}>
                              {chat.status}
                            </Badge>
                          )}
                          {chat.priority && (
                            <Badge className={`text-xs ${getPriorityColor(chat.priority)}`}>
                              {chat.priority}
                            </Badge>
                          )}
                          {chat.isActive && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              Aktiv
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {chat.participantCount} Teilnehmer
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {chat.messageCount} Nachrichten
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(chat.lastActivity)}
                            </span>
                          </div>
                          
                          {chat.participants.length > 0 && (
                            <div>
                              Teilnehmer: {chat.participants.slice(0, 3).join(', ')}
                              {chat.participants.length > 3 && ` +${chat.participants.length - 3} weitere`}
                            </div>
                          )}
                          
                          {chat.userEmail && (
                            <div>Email: {chat.userEmail}</div>
                          )}
                          
                          {chat.orderId && (
                            <div>Auftrag: {chat.orderId}</div>
                          )}
                          
                          {/* Sensible Daten Warnung */}
                          {chat.hasSensitiveData && (
                            <div className="flex items-center gap-1 text-orange-600">
                              <Shield className="h-3 w-3" />
                              {chat.sensitiveDataCount} sensible Daten erkannt
                              {(chat.maxSeverity || 0) >= 3 && (
                                <AlertTriangle className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground">
                        <div>ID: {chat.id.slice(0, 8)}</div>
                        {chat.createdAt && (
                          <div>Erstellt: {new Date(chat.createdAt).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Message Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat-Nachrichten
            </CardTitle>
            <CardDescription>
              {selectedChat ? `Nachrichten für ${selectedChat.title}` : 'Wählen Sie einen Chat aus, um Nachrichten anzuzeigen'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedChat ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bitte wählen Sie einen Chat aus der Liste aus</p>
              </div>
            ) : messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Lade Nachrichten...
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Nachrichten gefunden
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded-r"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">
                        {message.senderId || 'Unbekannter Absender'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp ? new Date(message.timestamp).toLocaleString('de-DE') : 'Unbekannte Zeit'}
                      </span>
                    </div>
                    <div className="text-sm">
                      {showSensitiveData ? 
                        (message.text || message.content || 'Keine Nachricht') :
                        (message.text || message.content || 'Keine Nachricht').replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***')
                          .replace(/(?:\+49|0)[0-9\s\-\(\)]{7,16}[0-9]/g, '***-***-***')
                          .replace(/DE[0-9]{2}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{2}/gi, 'DE** **** **** ****')
                      }
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {message.type && (
                        <Badge variant="outline" className="text-xs">
                          {message.type}
                        </Badge>
                      )}
                      {message.metadata?.hasSensitiveData && (
                        <Badge className="text-xs bg-orange-100 text-orange-800">
                          <Shield className="h-3 w-3 mr-1" />
                          {message.metadata.sensitiveDataCount} sensible Daten
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Sensible Daten Alerts Panel */}
        {selectedChat && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sensible Daten Warnungen
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSensitiveData(!showSensitiveData)}
                  className="ml-auto"
                >
                  {showSensitiveData ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Verbergen
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Anzeigen
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Erkannte sensible Daten in diesem Chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Lade Warnungen...
                </div>
              ) : sensitiveDataAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine sensiblen Daten gefunden</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sensitiveDataAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                        alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.description}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.reviewed && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              Überprüft
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString('de-DE')}
                        </span>
                      </div>
                      
                      <div className="text-sm space-y-2">
                        <div>
                          <span className="font-medium">Erkannte Daten: </span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {showSensitiveData ? alert.detectedData : '***VERBORGEN***'}
                          </code>
                        </div>
                        
                        <div>
                          <span className="font-medium">Kontext: </span>
                          <span className="text-gray-600">
                            {showSensitiveData ? alert.context : alert.context.replace(alert.detectedData, '***')}
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Nachricht ID: {alert.messageId} | Sender: {alert.senderId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}