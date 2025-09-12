'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Upload,
  Mail,
  ExternalLink,
  Bell,
  X,
  PartyPopper,
} from 'lucide-react';

interface AdminApprovalStatusProps {
  companyId: string;
  className?: string;
}

interface ApprovalStatus {
  isApproved: boolean;
  approvalStatus?: string;
  adminApproved?: boolean;
  adminApprovedAt?: string;
  adminApprovedBy?: string;
  adminNotes?: string;
  pendingActions?: string[];
  profileStatus?: string;
  accountSuspended?: boolean;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  isLoading: boolean;
  error?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  adminNotes?: string;
  metadata?: {
    priority?: string;
  };
}

export function AdminApprovalStatus({ companyId, className = '' }: AdminApprovalStatusProps) {
  const [status, setStatus] = useState<ApprovalStatus>({
    isApproved: false,
    isLoading: true,
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    checkApprovalStatus();
    loadNotifications();
  }, [companyId]);

  const checkApprovalStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`/api/company/${companyId}/approval-status`);
      const data = await response.json();

      if (response.ok) {
        setStatus({
          isApproved: data.isApproved,
          approvalStatus: data.approvalStatus,
          adminApproved: data.adminApproved,
          adminApprovedAt: data.adminApprovedAt,
          adminApprovedBy: data.adminApprovedBy,
          adminNotes: data.adminNotes,
          pendingActions: data.pendingActions || [],
          profileStatus: data.profileStatus,
          accountSuspended: data.accountSuspended,
          suspendedAt: data.suspendedAt,
          suspendedBy: data.suspendedBy,
          suspensionReason: data.suspensionReason,
          isLoading: false,
        });
      } else {
        setStatus({
          isApproved: false,
          isLoading: false,
          error: data.error || 'Fehler beim Laden des Freigabe-Status',
        });
      }
    } catch (error) {
      setStatus({
        isApproved: false,
        isLoading: false,
        error: 'Verbindungsfehler beim Laden des Status',
      });
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(`/api/company/${companyId}/notifications?type=approval`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);

        // Auto-show notifications if there are recent unread ones
        const recentUnread = data.notifications?.filter(
          (n: Notification) =>
            !n.readAt && new Date(n.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
        );

        if (recentUnread && recentUnread.length > 0) {
          setShowNotifications(true);
        }
      }
    } catch (error) {}
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/company/${companyId}/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (error) {}
  };

  const getStatusIcon = () => {
    if (status.isLoading) {
      return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#14ad9f]" />;
    }

    if (status.accountSuspended) {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }

    if (status.isApproved) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }

    if (status.approvalStatus === 'rejected') {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }

    return <Clock className="h-5 w-5 text-orange-600" />;
  };

  const getStatusBadge = () => {
    if (status.isLoading) {
      return <Badge variant="outline">Wird geladen...</Badge>;
    }

    if (status.accountSuspended) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Account gesperrt
        </Badge>
      );
    }

    if (status.isApproved) {
      // Prüfe zuerst adminApproved für korrekte Anzeige
      if (status.adminApproved) {
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Admin Freigegeben
          </Badge>
        );
      }

      // Legacy-Firma mit pending profile review
      if (status.profileStatus === 'pending_review') {
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Profil wird geprüft
          </Badge>
        );
      }

      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Freigegeben
        </Badge>
      );
    }

    if (status.approvalStatus === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Abgelehnt
        </Badge>
      );
    }

    return (
      <Badge className="bg-orange-100 text-orange-800">
        <Clock className="h-3 w-3 mr-1" />
        Wartet auf Freigabe
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (status.accountSuspended) {
      return `Ihr Account wurde am ${status.suspendedAt ? new Date(status.suspendedAt).toLocaleDateString('de-DE') : 'unbekanntem Datum'} gesperrt. ${status.suspensionReason ? `Grund: ${status.suspensionReason}` : ''} Kontaktieren Sie den Support für weitere Informationen.`;
    }

    if (status.isApproved || status.adminApproved) {
      // Wenn adminApproved true ist, dann ist das Unternehmen vollständig freigegeben
      if (status.adminApproved) {
        return 'Ihr Unternehmen wurde von einem Administrator freigegeben. Sie können alle Platform-Features nutzen.';
      }

      // Legacy-Firma mit pending profile review (nur wenn adminApproved nicht explizit true ist)
      if (status.profileStatus === 'pending_review' && !status.adminApproved) {
        return 'Ihr Unternehmen ist als Legacy-Kunde technisch freigeschaltet, aber Ihr Profil befindet sich noch in der Überprüfung. Sie können alle Platform-Features nutzen.';
      }

      return 'Ihr Unternehmen wurde von einem Administrator freigegeben. Sie können alle Platform-Features nutzen.';
    }

    if (status.approvalStatus === 'rejected') {
      return 'Ihr Unternehmen wurde abgelehnt. Bitte überprüfen Sie die Admin-Notizen und nehmen Sie entsprechende Korrekturen vor.';
    }

    return 'Ihr Unternehmen wartet noch auf die Admin-Freigabe. Sie können derzeit nur eingeschränkte Funktionen nutzen.';
  };

  const unreadNotifications = notifications.filter(n => !n.readAt);

  if (status.isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14ad9f]" />
            <span className="text-sm text-gray-600">Freigabe-Status wird geladen...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Zeige celebration für neue Approvals
  const isRecentlyApproved =
    status.isApproved &&
    status.adminApprovedAt &&
    new Date(status.adminApprovedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Zeige nichts an, wenn bereits freigegeben - Benachrichtigung über globales System
  if (
    !status.accountSuspended &&
    status.isApproved &&
    status.adminApproved &&
    !isRecentlyApproved
  ) {
    return null;
  }

  return (
    <Card
      className={`${className} ${
        status.accountSuspended
          ? 'border-red-200 bg-red-50'
          : isRecentlyApproved
            ? 'border-green-200 bg-gradient-to-r from-green-50 to-blue-50'
            : !status.isApproved
              ? 'border-orange-200 bg-orange-50'
              : 'border-green-200 bg-green-50'
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            {isRecentlyApproved && <PartyPopper className="h-5 w-5 text-green-600" />}
            {getStatusIcon()}
            <span>Admin-Freigabe Status</span>
            {getStatusBadge()}
          </div>

          {unreadNotifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Notifications */}
        {showNotifications && notifications.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Benachrichtigungen
            </h4>
            {notifications.slice(0, 3).map(notification => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  notification.readAt ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{notification.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.createdAt).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!notification.readAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Alert
          className={
            isRecentlyApproved
              ? 'border-green-200 bg-green-50'
              : status.isApproved
                ? 'border-green-200 bg-green-50'
                : 'border-orange-200 bg-orange-50'
          }
        >
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {isRecentlyApproved && (
              <div className="flex items-center space-x-2 mb-2">
                <PartyPopper className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Herzlichen Glückwunsch!</span>
              </div>
            )}
            {getStatusMessage()}
          </AlertDescription>
        </Alert>

        {status.adminNotes && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Admin-Notizen
            </h4>
            <p className="text-sm text-gray-700">{status.adminNotes}</p>
          </div>
        )}

        {status.adminApprovedAt && (
          <div className="text-sm text-gray-600">
            <strong>Freigegeben am:</strong>{' '}
            {new Date(status.adminApprovedAt).toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {status.adminApprovedBy && (
              <>
                <br />
                <strong>Freigegeben von:</strong> {status.adminApprovedBy}
              </>
            )}
          </div>
        )}

        {!status.isApproved && status.pendingActions && status.pendingActions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Ausstehende Aktionen:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {status.pendingActions.map((action, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex space-x-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={checkApprovalStatus}
            disabled={status.isLoading}
          >
            Status aktualisieren
          </Button>

          {!status.isApproved && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/dashboard/company/documents', '_blank')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Dokumente
              </Button>

              <Button variant="outline" size="sm" onClick={() => window.open('/contact', '_blank')}>
                <Mail className="h-4 w-4 mr-2" />
                Support
              </Button>
            </>
          )}
        </div>

        {status.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-700">{status.error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminApprovalStatus;
