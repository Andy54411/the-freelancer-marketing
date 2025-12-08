'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { InterviewInvitationModal } from './InterviewInvitationModal';

interface ApplicationStatusSelectProps {
  applicationId: string;
  currentStatus: string;
  companyId: string;
}

export function ApplicationStatusSelect({
  applicationId,
  currentStatus,
  companyId,
}: ApplicationStatusSelectProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

  async function updateStatus(
    newStatus: string,
    interviewSlots?: { date: Date; time: string; meetingType?: string; allowCandidateChoice?: boolean }[],
    message?: string,
    isVideoCall?: boolean,
    videoLink?: string,
    meetingType?: string,
    allowCandidateChoice?: boolean
  ) {
    try {
      const body: any = { status: newStatus, companyId };
      
      if (interviewSlots) {
        // Convert slots to ISO strings combining date and time
        body.interviewSlots = interviewSlots.map(slot => {
          const date = new Date(slot.date);
          const [hours, minutes] = slot.time.split(':').map(Number);
          date.setHours(hours, minutes, 0, 0);
          return date.toISOString();
        });
      }
      
      if (message) {
        body.message = message;
      }

      if (isVideoCall !== undefined) {
        body.isVideoCall = isVideoCall;
        body.videoLink = videoLink;
      }

      // 🎯 Meeting-Typ-Daten hinzufügen
      if (meetingType) {
        body.meetingType = meetingType;
      }

      if (allowCandidateChoice !== undefined) {
        body.allowCandidateChoice = allowCandidateChoice;
      }

      const response = await fetch(`/api/recruiting/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setStatus(newStatus);
      toast.success(
        newStatus === 'interview' ? 'Einladung versendet' : 'Status aktualisiert'
      );
      router.refresh(); // Refresh server components to show new status elsewhere
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'interview') {
      setIsInterviewModalOpen(true);
    } else {
      updateStatus(newStatus);
    }
  };

  const handleInterviewConfirm = (
    slots: { date: Date; time: string; meetingType?: string; allowCandidateChoice?: boolean }[],
    message: string,
    isVideoCall: boolean,
    videoLink?: string
  ) => {
    // 🎯 Extrahiere Meeting-Typ Daten aus ersten Slot
    const firstSlot = slots[0];
    const meetingType = firstSlot?.meetingType || (isVideoCall ? 'video' : 'flexible');
    const allowCandidateChoice = firstSlot?.allowCandidateChoice ?? true;
    
    updateStatus('interview', slots, message, isVideoCall, videoLink, meetingType, allowCandidateChoice);
  };

  return (
    <>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px] border-[#14ad9f]/30 bg-[#14ad9f]/5 text-[#14ad9f] focus:ring-[#14ad9f] font-medium">
          <SelectValue placeholder="Status wählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Eingegangen</SelectItem>
          <SelectItem value="reviewed">Geprüft</SelectItem>
          <SelectItem value="interview">Interview</SelectItem>
          <SelectItem value="interview_accepted">Termin bestätigt</SelectItem>
          <SelectItem value="accepted">Eingestellt</SelectItem>
          <SelectItem value="rejected">Abgelehnt</SelectItem>
        </SelectContent>
      </Select>

      <InterviewInvitationModal
        isOpen={isInterviewModalOpen}
        onClose={() => setIsInterviewModalOpen(false)}
        onConfirm={handleInterviewConfirm}
      />
    </>
  );
}
