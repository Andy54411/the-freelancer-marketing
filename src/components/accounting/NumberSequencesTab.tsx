'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';
import NumberSequenceModal from './NumberSequenceModal';

export interface NumberSequence {
  id: string;
  format: string;
  type: string;
  nextNumber: number;
  nextFormatted: string;
  canEdit: boolean;
  canDelete: boolean;
}

interface NumberSequencesTabProps {
  sequences: NumberSequence[];
  onEdit: (sequence: NumberSequence) => void;
  onDelete: (sequence: NumberSequence) => void;
  onUpdate: (sequence: NumberSequence) => void;
}

export default function NumberSequencesTab({
  sequences,
  onEdit,
  onDelete,
  onUpdate
}: NumberSequencesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<NumberSequence | null>(null);

  const handleEdit = (sequence: NumberSequence) => {

    setSelectedSequence(sequence);
    setIsModalOpen(true);

  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSequence(null);
  };

  const handleModalSave = (updatedSequence: NumberSequence) => {
    onUpdate(updatedSequence);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nummernkreise</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Format</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Nächste Zahl</TableHead>
              <TableHead>Nächste Nummer</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences.map((sequence) =>
            <TableRow key={sequence.id}>
                <TableCell className="font-mono">{sequence.format}</TableCell>
                <TableCell>{sequence.type}</TableCell>
                <TableCell>{sequence.nextNumber}</TableCell>
                <TableCell className="font-mono">{sequence.nextFormatted}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                    variant="ghost"
                    size="sm"
                    disabled={!sequence.canEdit}
                    title={
                    sequence.canEdit ?
                    'Nummernkreis bearbeiten' :
                    'Nummernkreis kann nicht bearbeitet werden'
                    }
                    onClick={() => handleEdit(sequence)}>

                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                    variant="ghost"
                    size="sm"
                    disabled={!sequence.canDelete}
                    title="Nummernkreis kann nicht gelöscht werden"
                    onClick={() => onDelete(sequence)}>

                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Modal */}
      <NumberSequenceModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        sequence={selectedSequence} />

    </Card>);

}