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
        apps.map(app =>
          app.id === applicationId ? { ...app, status: newStatus as any } : app
        )
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
            applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div className="font-medium">
                    {app.applicantProfile.firstName} {app.applicantProfile.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {app.applicantProfile.email}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(app.appliedAt).toLocaleDateString('de-DE')}
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={app.status}
                    onValueChange={(val) => updateStatus(app.id, val)}
                  >
                    <SelectTrigger className="w-[140px]">
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
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Bewerbung von {app.applicantProfile.firstName} {app.applicantProfile.lastName}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6 py-4">
                        {/* Cover Letter */}
                        {app.coverLetter && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center">
                              <FileText className="h-4 w-4 mr-2" /> Anschreiben
                            </h4>
                            <p className="text-sm whitespace-pre-wrap">{app.coverLetter}</p>
                          </div>
                        )}

                        {/* Profile Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm text-muted-foreground">Kontakt</h4>
                            <p>{app.applicantProfile.email}</p>
                            <p>{app.applicantProfile.phone}</p>
                            <p>{app.applicantProfile.location}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-muted-foreground">Links</h4>
                            {app.applicantProfile.linkedinUrl && (
                              <a href={app.applicantProfile.linkedinUrl} target="_blank" className="block text-blue-600 hover:underline">LinkedIn</a>
                            )}
                            {app.applicantProfile.portfolioUrl && (
                              <a href={app.applicantProfile.portfolioUrl} target="_blank" className="block text-blue-600 hover:underline">Portfolio</a>
                            )}
                          </div>
                        </div>

                        {/* Skills */}
                        {Array.isArray(app.applicantProfile.skills) && app.applicantProfile.skills.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {app.applicantProfile.skills.map((skill, i) => (
                                <Badge key={i} variant="secondary">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {app.applicantProfile.experience && app.applicantProfile.experience.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Erfahrung</h4>
                            <div className="space-y-4">
                              {app.applicantProfile.experience.map((exp, i) => (
                                <div key={i} className="border-l-2 border-gray-200 pl-4">
                                  <div className="font-medium">{exp.title}</div>
                                  <div className="text-sm text-muted-foreground">{exp.company}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(exp.startDate).toLocaleDateString()} - {exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Heute'}
                                  </div>
                                  {exp.description && <p className="text-sm mt-1">{exp.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
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
