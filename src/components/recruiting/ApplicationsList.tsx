'use client';

import { useState } from 'react';
import { JobApplication, ApplicantProfile } from '@/types/career';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, FileText } from 'lucide-react';

import Link from 'next/link';

interface ApplicationsListProps {
  applications: JobApplication[];
}

export function ApplicationsList({ applications: initialApplications }: ApplicationsListProps) {
  const [applications, setApplications] = useState(initialApplications);

  async function updateStatus(applicationId: string, newStatus: string) {
    try {
      const response = await fetch(`/api/recruiting/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setApplications(apps =>
        apps.map(app => (app.id === applicationId ? { ...app, status: newStatus as any } : app))
      );
      toast.success('Status aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kandidat</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length > 0 ? (
            applications.map(app => (
              <TableRow key={app.id}>
                <TableCell>
                  <div className="font-medium">
                    {app.applicantProfile.firstName} {app.applicantProfile.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">{app.applicantProfile.email}</div>
                </TableCell>
                <TableCell>{new Date(app.appliedAt).toLocaleDateString('de-DE')}</TableCell>
                <TableCell>
                  <Select
                    value={app.status}
                    onValueChange={val => updateStatus(app.id, val)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Eingegangen</SelectItem>
                      <SelectItem value="reviewed">Geprüft</SelectItem>
                      <SelectItem value="interview">Interview eingeladen</SelectItem>
                      <SelectItem value="interview_accepted">Interview bestätigt</SelectItem>
                      <SelectItem value="accepted">Angenommen</SelectItem>
                      <SelectItem value="rejected">Abgelehnt</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`applications/${app.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                Keine Bewerbungen vorhanden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
