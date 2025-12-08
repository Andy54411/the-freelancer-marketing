'use client';

import React, { useState, useEffect } from 'react';
import { Video, Phone, PhoneOff, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import TaskiloVideoService, { VideoCallRequest } from '@/services/TaskiloVideoService';
import TaskiloVideoCall from '@/components/video/TaskiloVideoCall';

interface VideoCallRequestNotificationProps {
  companyId: string;
  chatIds?: string[];
  onRequestHandled?: (request: VideoCallRequest, action: 'approved' | 'rejected') => void;
}

interface ActiveRequest extends VideoCallRequest {
  timeAgo: string;
}

const VideoCallRequestNotification: React.FC<VideoCallRequestNotificationProps> = ({
  companyId,
  chatIds,
  onRequestHandled,
}) => {
  const [pendingRequests, setPendingRequests] = useState<ActiveRequest[]>([]);
  const [videoService] = useState(() => new TaskiloVideoService());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [activeCallRequest, setActiveCallRequest] = useState<ActiveRequest | null>(null);

  useEffect(() => {
    if (!companyId) {
      console.log('🏢📞 [NOTIFICATION] No companyId provided, skipping listener setup');
      return;
    }

    console.log(
      '🏢📞 [NOTIFICATION] Setting up video call request listener for company:',
      companyId
    );
    console.log('🏢📞 [NOTIFICATION] ChatIDs provided:', chatIds ? chatIds.length : 0, chatIds);

    const handleNewRequest = (request: VideoCallRequest) => {
      console.log('🏢📞 [NOTIFICATION] Received request callback:', request);
      console.log('🔍 [DEBUG] Request validation check:');
      console.log('  - requestId:', request.requestId, '(type:', typeof request.requestId, ')');
      console.log('  - timestamp:', request.timestamp, '(type:', typeof request.timestamp, ')');
      console.log(
        '  - createdAt:',
        (request as any).createdAt,
        '(type:',
        typeof (request as any).createdAt,
        ')'
      );
      console.log('  - All keys:', Object.keys(request));
      console.log('  - Full object structure:', JSON.stringify(request, null, 2));

      // Extract timestamp (could be timestamp or createdAt)
      const actualTimestamp = request.timestamp || (request as any).createdAt;

      // Validate request integrity
      if (!request.requestId || !actualTimestamp) {
        console.error('❌ [NOTIFICATION] INVALID REQUEST - Missing required fields!');
        console.error('  - requestId missing:', !request.requestId);
        console.error('  - timestamp missing:', !request.timestamp);
        console.error('  - createdAt missing:', !(request as any).createdAt);
        console.error('  - actualTimestamp:', actualTimestamp);
        console.error('  - Full request object:', JSON.stringify(request, null, 2));
        return;
      }

      // Ignore requests older than 10 minutes
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (actualTimestamp < tenMinutesAgo) {
        console.log(
          '🏢📞 [NOTIFICATION] Ignoring old request:',
          request.requestId,
          'Timestamp:',
          new Date(actualTimestamp).toISOString()
        );
        return;
      }

      const timeAgo = formatTimeAgo(actualTimestamp);
      const activeRequest: ActiveRequest = {
        timeAgo,
        requestId: request.requestId,
        requesterId: request.requesterId || (request as any).fromUserId,
        requesterName: request.requesterName || (request as any).fromUserName,
        companyId: request.companyId,
        chatId: request.chatId,
        timestamp: actualTimestamp,
        status: request.status || 'pending',
        message: request.message,
      };

      setPendingRequests(prev => {
        const exists = prev.find(r => r.requestId === request.requestId);
        if (exists) {
          return prev;
        }

        console.log('🏢📞 [NOTIFICATION] Adding new video call request to state:', activeRequest);
        toast.info(`Neue Video-Anruf Anfrage von ${request.requesterName}`);
        // Add new requests to the TOP
        return [activeRequest, ...prev];
      });
    };

    videoService.listenForCallRequests(companyId, handleNewRequest, chatIds);

    return () => {
      console.log('🏢📞 [NOTIFICATION] Cleaning up listener for company:', companyId);
      videoService.stopListeningForRequests();
    };
  }, [companyId, videoService, chatIds]);

  // Update time ago every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingRequests(prev =>
        prev.map(request => ({
          timeAgo: formatTimeAgo(request.timestamp),
          requestId: request.requestId,
          requesterId: request.requesterId,
          requesterName: request.requesterName,
          companyId: request.companyId,
          chatId: request.chatId,
          timestamp: request.timestamp,
          status: request.status,
          message: request.message,
        }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: number): string => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std`;

    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  };

  const handleApproveRequest = async (request: ActiveRequest) => {
    if (isProcessing) return;

    try {
      console.log('🏢📞 [NOTIFICATION] User clicked approve for request:', request.requestId);
      console.log('🏢📞 [NOTIFICATION] Request details:', JSON.stringify(request));
      setIsProcessing(request.requestId);

      await videoService.approveCallRequest(request.chatId, request.requestId);
      console.log('🏢📞 [NOTIFICATION] approveCallRequest completed for:', request.requestId);

      // Important: After approving, we need to start the call as initiator
      console.log('🏢📞 [NOTIFICATION] Starting video call as INITIATOR (company)');

      // Remove from pending requests
      setPendingRequests(prev => prev.filter(r => r.requestId !== request.requestId));

      // Set as active call to open the video interface
      setActiveCallRequest(request);

      onRequestHandled?.(request, 'approved');

      toast.success(`Video-Anruf Anfrage von ${request.requesterName} genehmigt`);
    } catch (error) {
      console.error('🏢❌ Error approving request:', error);
      toast.error('Fehler beim Genehmigen der Anfrage');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectRequest = async (request: ActiveRequest) => {
    if (isProcessing) return;

    try {
      setIsProcessing(request.requestId);

      await videoService.rejectCallRequest(
        request.chatId,
        request.requestId,
        'Abgelehnt durch Unternehmen'
      );

      setPendingRequests(prev => prev.filter(r => r.requestId !== request.requestId));
      onRequestHandled?.(request, 'rejected');

      toast.success(`Video-Anruf Anfrage von ${request.requesterName} abgelehnt`);
    } catch (error) {
      console.error('🏢❌ Error rejecting request:', error);
      toast.error('Fehler beim Ablehnen der Anfrage');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCallClose = () => {
    setActiveCallRequest(null);
  };

  // If we have an active call, render the video call component
  if (activeCallRequest) {
    return (
      <TaskiloVideoCall
        chatId={activeCallRequest.chatId}
        userId={companyId}
        userName="Support" // TODO: Get actual company name if possible
        isInitiator={true}
        isOpen={true}
        onClose={handleCallClose}
      />
    );
  }

  if (pendingRequests.length === 0) {
    return null;
  }

  // Use the first request for the dialog
  const currentRequest = pendingRequests[0];

  return (
    <>
      <Dialog
        open={pendingRequests.length > 0}
        onOpenChange={open => {
          if (!open) {
            // Optional: Handle closing via X or outside click (maybe minimize to card?)
            // For now, we keep it open or let user reject
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <Video className="h-5 w-5" />
              Eingehender Video-Anruf
            </DialogTitle>
            <DialogDescription>
              {currentRequest.requesterName} möchte einen Video-Anruf starten.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 p-3 rounded-full">
                <User className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900">
                  {currentRequest.requesterName}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  {currentRequest.timeAgo}
                </div>
                {currentRequest.message && (
                  <p className="text-sm text-gray-600 mt-1 italic">&quot;{currentRequest.message}&quot;</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button
              onClick={() => handleRejectRequest(currentRequest)}
              disabled={isProcessing === currentRequest.requestId}
              variant="outline"
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Ablehnen
            </Button>
            <Button
              onClick={() => handleApproveRequest(currentRequest)}
              disabled={isProcessing === currentRequest.requestId}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Phone className="h-4 w-4 mr-2" />
              Annehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fallback / History View (Optional: Keep the card if multiple requests or minimized) */}
      {pendingRequests.length > 1 && (
        <Card className="mb-4 border-teal-200 bg-teal-50 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Weitere Anfragen ({pendingRequests.length - 1})
            </CardTitle>
          </CardHeader>
        </Card>
      )}
    </>
  );
};

export default VideoCallRequestNotification;
