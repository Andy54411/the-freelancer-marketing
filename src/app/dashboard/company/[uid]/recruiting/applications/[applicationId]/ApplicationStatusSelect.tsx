'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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
  const [status, setStatus] = useState(currentStatus);

  async function updateStatus(newStatus: string) {
    try {
      const response = await fetch(`/api/recruiting/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, companyId }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setStatus(newStatus);
      toast.success('Status aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  }

  return (
    <Select value={status} onValueChange={updateStatus}>
      <SelectTrigger className="w-[180px] border-[#14ad9f]/30 bg-[#14ad9f]/5 text-[#14ad9f] focus:ring-[#14ad9f]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Eingegangen</SelectItem>
        <SelectItem value="reviewed">Geprüft</SelectItem>
        <SelectItem value="interview">Interview</SelectItem>
        <SelectItem value="accepted">Angenommen</SelectItem>
        <SelectItem value="rejected">Abgelehnt</SelectItem>
      </SelectContent>
    </Select>
  );
}
