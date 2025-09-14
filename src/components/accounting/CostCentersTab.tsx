'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react';

export interface CostCenter {
  id: string;
  number: string;
  name: string;
  description: string;
  active: boolean;
}

interface CostCentersTabProps {
  costCenters: CostCenter[];
  onEdit: (center: CostCenter) => void;
  onDelete: (center: CostCenter) => void;
  onToggleActive: (center: CostCenter) => void;
}

export default function CostCentersTab({
  costCenters,
  onEdit,
  onDelete,
  onToggleActive,
}: CostCentersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kostenstellen</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costCenters.map(center => (
              <TableRow key={center.id}>
                <TableCell className="font-mono">{center.number}</TableCell>
                <TableCell>{center.name}</TableCell>
                <TableCell>{center.description}</TableCell>
                <TableCell>
                  <Badge variant={center.active ? 'default' : 'secondary'}>
                    {center.active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(center)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleActive(center)}>
                        {center.active ? 'Deaktivieren' : 'Aktivieren'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(center)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
