/**
 * MarketplaceProposalModal - Angebot für Marketplace-Projekt abgeben
 * Spezifisch für bestehende project_requests aus dem Marketplace
 */
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Calendar, MapPin, Euro, Send, Loader2, Building } from 'lucide-react';
import { db } from '@/firebase/clients';
import { collection, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';

interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  location: string;
  preferredDate?: string;
  budgetType: string;
  budgetAmount?: number;
  maxBudget?: number;
  customerUid: string;
  customerEmail?: string;
}

interface MarketplaceProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectRequest;
  companyId: string;
  companyName: string;
}

export default function MarketplaceProposalModal({
  isOpen,
  onClose,
  project,
  companyId,
  companyName,
}: MarketplaceProposalModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Proposal-spezifische Felder
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [availableDate, setAvailableDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !proposalPrice || !proposalMessage) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setIsSubmitting(true);

    try {
      // Erstelle Proposal in proposals collection
      const proposalData = {
        projectId: project.id,
        projectTitle: project.title,
        companyId: companyId,
        companyName: companyName,
        customerId: project.customerUid,
        customerEmail: project.customerEmail,

        // Proposal Details
        proposedPrice: parseFloat(proposalPrice),
        message: proposalMessage,
        estimatedDuration: estimatedDuration,
        availableDate: availableDate,

        // Status
        status: 'pending',
        createdAt: new Date(),

        // Projekt-Info für Referenz
        projectCategory: project.category,
        projectSubcategory: project.subcategory,
        projectLocation: project.location,
      };

      // Füge Proposal zur proposals collection hinzu
      const proposalRef = await addDoc(collection(db, 'proposals'), proposalData);

      // Aktualisiere das project_requests Dokument
      const projectRef = doc(db, 'project_requests', project.id);
      await updateDoc(projectRef, {
        proposals: arrayUnion({
          id: proposalRef.id,
          companyId: companyId,
          companyName: companyName,
          proposedPrice: parseFloat(proposalPrice),
          createdAt: new Date(),
          status: 'pending',
        }),
        proposalCount: ((project as { proposalCount?: number }).proposalCount ?? 0) + 1,
      });

      toast.success('Angebot erfolgreich abgegeben!');
      onClose();

      // Reset form
      setProposalPrice('');
      setProposalMessage('');
      setEstimatedDuration('');
      setAvailableDate('');
    } catch (error) {
      toast.error('Fehler beim Abgeben des Angebots');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#14ad9f]" />
            Angebot für Projekt abgeben
          </DialogTitle>
          <DialogDescription>
            Geben Sie Ihr Angebot für das Projekt &quot;{project.title}&quot; ab
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projekt-Übersicht */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Projekt-Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{project.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span>
                    {project.category} • {project.subcategory}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{project.location}</span>
                </div>

                {project.preferredDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      Gewünschter Start:{' '}
                      {new Date(project.preferredDate).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Euro className="h-4 w-4 text-gray-500" />
                  <span>
                    {project.budgetType === 'negotiable'
                      ? 'Budget verhandelbar'
                      : project.budgetAmount
                        ? `${project.budgetAmount}€`
                        : 'Budget flexibel'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Angebot-Formular */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-[#14ad9f]" />
                Ihr Angebot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="proposalPrice">Angebotspreis (€) *</Label>
                  <Input
                    id="proposalPrice"
                    type="number"
                    value={proposalPrice}
                    onChange={e => setProposalPrice(e.target.value)}
                    placeholder="z.B. 1200"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedDuration">Geschätzte Dauer</Label>
                  <Input
                    id="estimatedDuration"
                    value={estimatedDuration}
                    onChange={e => setEstimatedDuration(e.target.value)}
                    placeholder="z.B. 2-3 Tage, 1 Woche"
                  />
                </div>

                <div>
                  <Label htmlFor="availableDate">Verfügbar ab</Label>
                  <Input
                    id="availableDate"
                    type="date"
                    value={availableDate}
                    onChange={e => setAvailableDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="proposalMessage">Nachricht an den Kunden *</Label>
                  <Textarea
                    id="proposalMessage"
                    value={proposalMessage}
                    onChange={e => setProposalMessage(e.target.value)}
                    placeholder="Beschreiben Sie Ihr Angebot, Ihre Erfahrung und warum Sie der richtige Anbieter für dieses Projekt sind..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#14ad9f] hover:bg-[#129488] text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Angebot abgeben
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
