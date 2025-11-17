'use client';

import React, { useState, useEffect } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiClock,
  FiEye,
  FiMessageSquare,
  FiRefreshCw,
  FiFilter,
  FiSearch,
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StornoRequest {
  id: string;
  auftragId: string;
  kundeId: string;
  customerName: string;
  selectedAnbieterId: string;
  providerName: string;
  reason: string;
  stornoType: 'normal' | 'lieferverzug';
  requestedAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'normal' | 'high' | 'urgent';
  submittedAt: string;
  processedAt?: string;
  adminNotes?: string;
  paymentType: string;
  customerType: 'privat' | 'firma';
}

export default function AdminStornoManagement() {
  const [requests, setRequests] = useState<StornoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<StornoRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [adminDecision, setAdminDecision] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStornoRequests();

    // Auto-refresh alle 30 Sekunden
    const interval = setInterval(loadStornoRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStornoRequests = async () => {
    try {
      const response = await fetch('/api/admin/storno-requests');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const processApproval = async () => {
    if (!selectedRequest || !adminDecision) return;

    setProcessing(true);

    try {
      const response = await fetch('/api/admin/storno-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          decision: adminDecision,
          adminNotes,
          refundAmount: adminDecision === 'approve' ? selectedRequest.requestedAmount : 0,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state
        setRequests(prev =>
          prev.map(req =>
            req.id === selectedRequest.id
              ? {
                  ...req,
                  status: adminDecision as any,
                  processedAt: new Date().toISOString(),
                  adminNotes,
                }
              : req
          )
        );

        setShowApprovalDialog(false);
        setSelectedRequest(null);
        setAdminDecision(null);
        setAdminNotes('');

        alert(`Storno-Anfrage ${adminDecision === 'approve' ? 'genehmigt' : 'abgelehnt'}!`);
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.message}`);
      }
    } catch (error) {
      alert('Fehler bei der Verarbeitung. Bitte versuchen Sie es erneut.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
    const matchesSearch =
      !searchTerm ||
      req.auftragId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.providerName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">🔴 Dringend</Badge>;
      case 'high':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            🟡 Hoch
          </Badge>
        );

      default:
        return <Badge variant="outline">⚪ Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            ✅ Genehmigt
          </Badge>
        );

      case 'rejected':
        return <Badge variant="destructive">❌ Abgelehnt</Badge>;
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            ⏳ Wartend
          </Badge>
        );
    }
  };

  const getStornoTypeBadge = (stornoType: string) => {
    return stornoType === 'lieferverzug' ? (
      <Badge variant="destructive">🚨 Lieferverzug</Badge>
    ) : (
      <Badge variant="outline">📝 Normal</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <FiRefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mr-3" />
        <span>Lade Storno-Anfragen...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storno-Verwaltung</h1>
          <p className="text-gray-600 mt-1">Zentrale Verwaltung aller Stornierungsanfragen</p>
        </div>
        <Button onClick={loadStornoRequests} variant="outline">
          <FiRefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FiClock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Wartend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FiCheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-sm text-gray-600">Genehmigt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FiX className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
                <p className="text-sm text-gray-600">Abgelehnt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FiAlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {requests.filter(r => r.stornoType === 'lieferverzug').length}
                </p>
                <p className="text-sm text-gray-600">Lieferverzug</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Suche</Label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="search"
                  type="text"
                  placeholder="Auftrag-ID, Kunde, Anbieter..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending">Wartend</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priorität</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Prioritäten</SelectItem>
                  <SelectItem value="urgent">Dringend</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setSearchTerm('');
                }}
                className="w-full"
              >
                <FiFilter className="h-4 w-4 mr-2" />
                Filter zurücksetzen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FiMessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Keine Storno-Anfragen gefunden
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Keine Anfragen entsprechen den aktuellen Filterkriterien.'
                  : 'Es liegen derzeit keine Storno-Anfragen vor.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">Auftrag #{request.auftragId}</h3>
                      {getPriorityBadge(request.priority)}
                      {getStatusBadge(request.status)}
                      {getStornoTypeBadge(request.stornoType)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Eingereicht am: {new Date(request.submittedAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#14ad9f]">
                      €{(request.requestedAmount / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{request.paymentType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">👤 Kunde:</p>
                    <p className="text-sm text-gray-600">
                      {request.customerName} ({request.customerType})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">🔧 Anbieter:</p>
                    <p className="text-sm text-gray-600">{request.providerName}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Grund der Stornierung:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{request.reason}</p>
                </div>

                {request.adminNotes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Admin-Notizen:</p>
                    <p className="text-sm text-blue-600 bg-blue-50 rounded p-3">
                      {request.adminNotes}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Navigate to order details
                      window.open(`/dashboard/admin/orders/${request.auftragId}`, '_blank');
                    }}
                  >
                    <FiEye className="h-4 w-4 mr-2" />
                    Auftrag anzeigen
                  </Button>

                  {request.status === 'pending' && (
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApprovalDialog(true);
                      }}
                      className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                    >
                      <FiCheckCircle className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Storno-Anfrage bearbeiten</DialogTitle>
            <DialogDescription>
              Auftrag #{selectedRequest?.auftragId} -{' '}
              {selectedRequest?.stornoType === 'lieferverzug'
                ? 'Lieferverzug'
                : 'Normale Stornierung'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Request Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Anfragedetails:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Kunde:</span> {selectedRequest.customerName}
                  </div>
                  <div>
                    <span className="font-medium">Anbieter:</span> {selectedRequest.providerName}
                  </div>
                  <div>
                    <span className="font-medium">Betrag:</span> €
                    {(selectedRequest.requestedAmount / 100).toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Typ:</span>{' '}
                    {selectedRequest.stornoType === 'lieferverzug' ? 'Lieferverzug' : 'Normal'}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-medium">Grund:</span>
                  <p className="text-sm text-gray-600 mt-1">{selectedRequest.reason}</p>
                </div>
              </div>

              {/* Decision Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={adminDecision === 'approve' ? 'default' : 'outline'}
                  onClick={() => setAdminDecision('approve')}
                  className={adminDecision === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <FiCheckCircle className="h-4 w-4 mr-2" />
                  Genehmigen
                </Button>
                <Button
                  variant={adminDecision === 'reject' ? 'destructive' : 'outline'}
                  onClick={() => setAdminDecision('reject')}
                >
                  <FiX className="h-4 w-4 mr-2" />
                  Ablehnen
                </Button>
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="admin-notes">Admin-Notizen</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Optionale Notizen zur Entscheidung..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setSelectedRequest(null);
                    setAdminDecision(null);
                    setAdminNotes('');
                  }}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={processApproval}
                  disabled={!adminDecision || processing}
                  className="flex-1 bg-[#14ad9f] hover:bg-taskilo-hover text-white"
                >
                  {processing ? (
                    <>
                      <FiRefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : (
                    `${adminDecision === 'approve' ? 'Genehmigen' : 'Ablehnen'} & ${adminDecision === 'approve' ? 'Refund erstellen' : 'Benachrichtigen'}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
