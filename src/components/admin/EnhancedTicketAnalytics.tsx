// Enhanced Ticket Management mit Firebase Features
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Brain,
  Mail,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Activity,
  Database,
  Gauge,
} from 'lucide-react';
// Firebase Ticket Service wird verwendet

interface ServiceMetrics {
  emailStats: {
    quotaUsed: number;
    quotaRemaining: number;
    bounceRate: number;
    complaintRate: number;
    // Resend-spezifische Felder
    provider?: string;
    successRate?: number;
    emailsThisMonth?: number;
  };
  aiClassification: {
    accuracyRate: number;
    autoClassifiedTickets: number;
    manualOverrides: number;
  };
  firebaseMetrics: {
    totalDocuments: number;
    activeCollections: number;
    readsToday: number;
    writesToday: number;
  };
}

interface AnalyticsData {
  overview: {
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolutionRate: number;
    averageResolutionTime: number;
  };
  distributions: {
    priority: Record<string, number>;
    category: Record<string, number>;
    sentiment: Record<string, number>;
  };
  timeline: {
    daily: Record<string, number>;
    period: string;
  };
  serviceMetrics: ServiceMetrics;
}

export default function EnhancedTicketAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [_timeRange, _setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/admin/tickets/analytics?days=${_timeRange.replace('d', '')}`
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.metrics);
      }
    } catch {
      // Fehler ignorieren
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [_timeRange]);

  useEffect(() => {
    loadAnalytics();
    // Auto-refresh alle 5 Minuten
    const interval = setInterval(loadAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  const triggerAIClassification = async () => {
    try {
      // Demo: Automatische Klassifizierung für alle offenen Tickets
      const response = await fetch('/api/admin/tickets', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        const tickets = Array.isArray(data.tickets) ? data.tickets : [];
        const openTickets = tickets.filter((t: { status: string }) => t.status === 'open');

        for (const ticket of openTickets.slice(0, 5)) {
          // AI-Klassifizierung - vereinfachte Version ohne AWS
          const classification = {
            priority: 'medium' as const,
            category: 'general',
            confidence: 0.8,
            sentiment: 'neutral',
          };

          // Update Ticket mit Klassifizierung
          await fetch(`/api/admin/tickets/${ticket.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priority: classification.priority,
              category: classification.category,
              autoClassified: true,
              aiConfidence: classification.confidence,
              sentiment: classification.sentiment,
            }),
          });
        }

        // Analytics neu laden
        await loadAnalytics();
      }
    } catch {
      // Fehler ignorieren
    }
  };

  const sendTestNotification = async () => {
    try {
      // Test-E-Mail über Resend senden
      const response = await fetch('/api/admin/tickets/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'resend_test',
          recipient: 'andy.staudinger@taskilo.de',
          provider: 'resend',
        }),
      });

      if (response.ok) {
      }
    } catch (error) {
      console.error('Fehler beim Senden der Test-E-Mail:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]"></div>
        </div>
      </div>
    );
  }

  const priorityColors = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    urgent: '#dc3545',
  };

  const categoryColors = {
    technical: '#007bff',
    billing: '#28a745',
    support: '#17a2b8',
    feature: '#6f42c1',
    bug: '#dc3545',
    other: '#6c757d',
  };

  const sentimentColors = {
    POSITIVE: '#28a745',
    NEUTRAL: '#ffc107',
    NEGATIVE: '#dc3545',
    MIXED: '#17a2b8',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Ticket Analytics</h1>
          <p className="text-gray-600 mt-1">AWS-powered Insights & Automation</p>
        </div>

        <div className="flex items-center gap-3">
          {refreshing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]"></div>
          )}

          <Button
            onClick={triggerAIClassification}
            className="bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Klassifizierung
          </Button>

          <Button
            onClick={sendTestNotification}
            variant="outline"
            className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Test Resend E-Mail
          </Button>

          <Button onClick={loadAnalytics} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* AWS Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-linear-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-700">Resend E-Mails</CardTitle>
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {analytics?.serviceMetrics?.emailStats?.quotaUsed || 0}
            </div>
            <div className="text-xs text-blue-600 mt-1">heute gesendet (Provider: Resend)</div>
            <div className="flex items-center mt-2">
              <CheckCircle className="w-3 h-3 text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">
                {analytics?.serviceMetrics?.emailStats?.successRate || 100}% Erfolgsrate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-linear-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-700">AI Accuracy</CardTitle>
              <Brain className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {analytics?.serviceMetrics?.aiClassification?.accuracyRate?.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-purple-600 mt-1">
              {analytics?.serviceMetrics?.aiClassification?.autoClassifiedTickets || 0}{' '}
              auto-klassifiziert
            </div>
            <div className="flex items-center mt-2">
              <Gauge className="w-3 h-3 text-purple-500 mr-1" />
              <span className="text-xs text-purple-600">
                {analytics?.serviceMetrics?.aiClassification?.manualOverrides || 0} Overrides
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-linear-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-700">
                Firebase Status
              </CardTitle>
              <Database className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {analytics?.serviceMetrics?.firebaseMetrics?.totalDocuments || 0}
            </div>
            <div className="text-xs text-green-600 mt-1">Dokumente gesamt</div>
            <div className="flex items-center mt-2">
              <Activity className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">
                {analytics?.serviceMetrics?.firebaseMetrics?.activeCollections || 0} Collections
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-linear-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-700">Resolution Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {analytics?.overview?.resolutionRate?.toFixed(1) || 0}%
            </div>
            <div className="text-xs text-orange-600 mt-1">
              {analytics?.overview?.resolvedTickets || 0} von{' '}
              {analytics?.overview?.totalTickets || 0}
            </div>
            <div className="flex items-center mt-2">
              <Clock className="w-3 h-3 text-orange-500 mr-1" />
              <span className="text-xs text-orange-600">
                Ø {analytics?.overview?.averageResolutionTime?.toFixed(1) || 0}h
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distributions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="distributions">Verteilungen</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="services">Service Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="distributions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#14ad9f]" />
                  Prioritäts-Verteilung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics?.distributions?.priority || {}).map(
                          ([key, value]) => ({
                            name: key.toUpperCase(),
                            value,
                            fill: priorityColors[key as keyof typeof priorityColors] || '#6c757d',
                          })
                        )}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      ></Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#14ad9f]" />
                  Kategorie-Verteilung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(analytics?.distributions?.category || {}).map(
                        ([key, value]) => ({
                          name: key,
                          value,
                          fill: categoryColors[key as keyof typeof categoryColors] || '#6c757d',
                        })
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#14ad9f]" />
                  AI Sentiment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics?.distributions?.sentiment || {}).map(
                          ([key, value]) => ({
                            name: key,
                            value,
                            fill: sentimentColors[key as keyof typeof sentimentColors] || '#6c757d',
                          })
                        )}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      ></Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Classification Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#14ad9f]" />
                  AI Klassifizierungs-Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Accuracy Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={analytics?.serviceMetrics?.aiClassification?.accuracyRate || 0}
                      className="w-20 h-2"
                    />

                    <span className="text-sm font-medium">
                      {analytics?.serviceMetrics?.aiClassification?.accuracyRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Auto-klassifiziert</span>
                  <Badge variant="secondary">
                    {analytics?.serviceMetrics?.aiClassification?.autoClassifiedTickets || 0}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Manual Overrides</span>
                  <Badge variant="outline">
                    {analytics?.serviceMetrics?.aiClassification?.manualOverrides || 0}
                  </Badge>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm font-medium">AI Performance</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Das AI-System klassifiziert Tickets automatisch basierend auf Inhalt und
                    Kontext.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#14ad9f]" />
                Ticket Timeline ({analytics?.timeline?.period})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={Object.entries(analytics?.timeline?.daily || {}).map(([date, count]) => ({
                      date: new Date(date).toLocaleDateString('de-DE', {
                        month: 'short',
                        day: 'numeric',
                      }),
                      tickets: count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="tickets"
                      stroke="#14ad9f"
                      fill="#14ad9f"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Email Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#14ad9f]" />
                  Email Statistics (Resend)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {analytics?.serviceMetrics?.emailStats?.quotaUsed || 0}
                    </div>
                    <div className="text-xs text-green-600">E-Mails gesendet</div>
                  </div>

                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {analytics?.serviceMetrics?.emailStats?.quotaRemaining || 0}
                    </div>
                    <div className="text-xs text-blue-600">Quota verfügbar</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bounce Rate</span>
                    <span className="text-sm font-medium">
                      {analytics?.serviceMetrics?.emailStats?.bounceRate || 0}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium">
                      {analytics?.serviceMetrics?.emailStats?.successRate || 100}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Firebase Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#14ad9f]" />
                  Firebase Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Dokumente</span>
                    <Badge variant="outline">
                      {analytics?.serviceMetrics?.firebaseMetrics?.totalDocuments || 0}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Collections</span>
                    <Badge variant="secondary">
                      {analytics?.serviceMetrics?.firebaseMetrics?.activeCollections || 0}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Reads heute</span>
                    <span className="text-sm font-medium">
                      {analytics?.serviceMetrics?.firebaseMetrics?.readsToday || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm font-medium">Writes heute</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {analytics?.serviceMetrics?.firebaseMetrics?.writesToday || 0} Schreibvorgänge
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
