'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Users,
  Euro,
  Calendar,
  Mail,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  type: 'domain' | 'mailbox' | 'bundle';
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'past_due';
  billingInterval: 'monthly' | 'yearly';
  domain?: string;
  mailboxEmail?: string;
  priceGross: number;
  nextBillingDate: Date;
  createdAt: Date;
}

interface Invoice {
  id: string;
  subscriptionId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  paidAt?: Date;
  sentAt?: Date;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  past_due: 'bg-orange-100 text-orange-800',
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  cancelled: 'Gekuendigt',
  expired: 'Abgelaufen',
  pending: 'Ausstehend',
  past_due: 'Ueberfaellig',
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt',
  overdue: 'Ueberfaellig',
};

export default function WebmailBillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBilling, setProcessingBilling] = useState(false);
  const [activeTab, setActiveTab] = useState('subscriptions');

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('de-DE');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load subscriptions
      const subsResponse = await fetch('/api/admin/webmail/subscriptions');
      if (subsResponse.ok) {
        const subsData = await subsResponse.json();
        setSubscriptions(subsData.subscriptions || []);
      }

      // Load invoices
      const invResponse = await fetch('/api/admin/webmail/invoices');
      if (invResponse.ok) {
        const invData = await invResponse.json();
        setInvoices(invData.invoices || []);
      }
    } catch {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleManualBilling = async () => {
    setProcessingBilling(true);
    try {
      const response = await fetch('/api/admin/webmail/run-billing', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Abrechnung: ${result.results?.success || 0} Rechnungen erstellt`);
        loadData();
      } else {
        toast.error('Abrechnung fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler bei der Abrechnung');
    } finally {
      setProcessingBilling(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/admin/webmail/invoices/${invoiceId}/send`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Rechnung versendet');
        loadData();
      } else {
        toast.error('Versand fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler beim Versenden');
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/admin/webmail/invoices/${invoiceId}/paid`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Als bezahlt markiert');
        loadData();
      } else {
        toast.error('Aktion fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler');
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Abonnement wirklich kuendigen?')) return;
    
    try {
      const response = await fetch(`/api/admin/webmail/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Abonnement gekuendigt');
        loadData();
      } else {
        toast.error('Kuendigung fehlgeschlagen');
      }
    } catch {
      toast.error('Fehler');
    }
  };

  // Stats
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const monthlyRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.billingInterval === 'monthly' ? s.priceGross : s.priceGross / 12), 0);
  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webmail Abrechnung</h1>
          <p className="text-gray-500">Verwalte Abonnements und Rechnungen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button 
            onClick={handleManualBilling} 
            disabled={processingBilling}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {processingBilling ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Euro className="h-4 w-4 mr-2" />
            )}
            Abrechnung starten
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aktive Abos</p>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
              </div>
              <Users className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monatl. Umsatz</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyRevenue)}</p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Offene Rechnungen</p>
                <p className="text-2xl font-bold">{unpaidInvoices}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Gesamt Umsatz</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions">
            <Users className="h-4 w-4 mr-2" />
            Abonnements ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Rechnungen ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle Abonnements</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Keine Abonnements vorhanden</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Preis</TableHead>
                      <TableHead>Intervall</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Naechste Abrechnung</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map(sub => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.customerName}</p>
                            <p className="text-sm text-gray-500">{sub.customerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {sub.type === 'domain' ? 'Domain' : sub.type === 'mailbox' ? 'Mailbox' : 'Bundle'}
                            </Badge>
                            {sub.domain && <p className="text-sm">{sub.domain}</p>}
                            {sub.mailboxEmail && <p className="text-sm">{sub.mailboxEmail}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(sub.priceGross)}</TableCell>
                        <TableCell>
                          {sub.billingInterval === 'monthly' ? 'Monatlich' : 'Jaehrlich'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[sub.status]}>
                            {statusLabels[sub.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(sub.nextBillingDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelSubscription(sub.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alle Rechnungen</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Keine Rechnungen vorhanden</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rechnungsnr.</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Zeitraum</TableHead>
                      <TableHead>Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Faellig am</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{inv.customerName}</p>
                            <p className="text-sm text-gray-500">{inv.customerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(inv.total)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[inv.status]}>
                            {statusLabels[inv.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {formatDate(inv.dueDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {inv.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendInvoice(inv.id)}
                                title="Per E-Mail versenden"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {(inv.status === 'sent' || inv.status === 'overdue') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkPaid(inv.id)}
                                title="Als bezahlt markieren"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              title="PDF herunterladen"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="E-Mail erneut senden"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
