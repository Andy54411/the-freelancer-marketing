'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Plus } from 'lucide-react';

interface TransactionMatchingTabProps {
  onCreateRule: () => void;
}

export default function TransactionMatchingTab({ onCreateRule }: TransactionMatchingTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaktionszuordnung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Transaktionszuordnung konfigurieren</h3>
          <p className="text-muted-foreground mb-4">
            Richten Sie automatische Regeln für die Zuordnung von Banktransaktionen ein.
          </p>
          <Button onClick={onCreateRule} className="bg-[#14ad9f] hover:bg-taskilo-hover text-white">
            <Plus className="h-4 w-4 mr-2" />
            Neue Regel erstellen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
