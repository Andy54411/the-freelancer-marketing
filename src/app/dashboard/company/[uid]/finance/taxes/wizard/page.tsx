'use client';

/**
 * UStVA-Assistent Wizard - Schritt 1: Zeitraum wählen
 * Seitenbasierter Wizard für die UStVA-Erstellung
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Calendar, FileText, Receipt, ClipboardCheck, Send } from 'lucide-react';
import Link from 'next/link';

const STEPS = [
  { id: 1, title: 'Zeitraum', icon: Calendar },
  { id: 2, title: 'Einnahmen', icon: FileText },
  { id: 3, title: 'Ausgaben', icon: Receipt },
  { id: 4, title: 'Zusammenfassung', icon: ClipboardCheck },
  { id: 5, title: 'Absenden', icon: Send },
];

export default function WizardStep1Page() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const previousQuarter = currentQuarter > 1 ? currentQuarter - 1 : 4;
  const previousYear = currentQuarter > 1 ? currentYear : currentYear - 1;

  const [year, setYear] = useState(previousYear);
  const [quarter, setQuarter] = useState(previousQuarter);

  const handleNext = () => {
    router.push(`/dashboard/company/${uid}/finance/taxes/wizard/einnahmen?year=${year}&quarter=${quarter}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/dashboard/company/${uid}/finance/taxes`}
          className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Steuerzentrale
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">UStVA-Assistent</h1>
        <p className="text-gray-600 mt-2">
          Erstellen Sie Ihre Umsatzsteuer-Voranmeldung Schritt für Schritt
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center ${step.id === 1 ? 'text-[#14ad9f]' : 'text-gray-400'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                step.id === 1 ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={20} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">Schritt 1 von 5</p>
      </div>

      {/* Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#14ad9f]" />
            Zeitraum wählen
          </CardTitle>
          <CardDescription>
            Wählen Sie das Quartal für Ihre UStVA. Standardmäßig ist das vorherige Quartal ausgewählt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jahr
              </label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quartal
              </label>
              <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 (Jan - Mär)</SelectItem>
                  <SelectItem value="2">Q2 (Apr - Jun)</SelectItem>
                  <SelectItem value="3">Q3 (Jul - Sep)</SelectItem>
                  <SelectItem value="4">Q4 (Okt - Dez)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Hinweis:</strong> Die UStVA für Q{quarter}/{year} muss bis zum{' '}
              <strong>
                {quarter === 1 && '10. April'}
                {quarter === 2 && '10. Juli'}
                {quarter === 3 && '10. Oktober'}
                {quarter === 4 && '10. Januar des Folgejahres'}
              </strong>{' '}
              beim Finanzamt eingereicht werden.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Link href={`/dashboard/company/${uid}/finance/taxes`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
        </Link>
        <Button onClick={handleNext} className="bg-[#14ad9f] hover:bg-teal-700">
          Weiter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
