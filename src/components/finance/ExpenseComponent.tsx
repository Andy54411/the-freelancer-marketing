'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Upload, FileText, Edit, Trash2, Building2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ExpenseData {
  id?: string;
  title: string;
  amount: number | null;
  category: string;
  date: string;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  vatAmount?: number | null;
  netAmount?: number | null;
  vatRate?: number | null;
  companyName?: string;
  companyAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  receipt?: {
    fileName: string;
    downloadURL: string;
    uploadDate: string;
  } | null;
  taxDeductible?: boolean;
}

interface ExpenseFormData {
  title: string;
  amount: string;
  category: string;
  date: string;
  description: string;
  vendor: string;
  invoiceNumber: string;
  vatAmount: string;
  netAmount: string;
  vatRate: string;
  companyName: string;
  companyAddress: string;
  contactEmail: string;
  contactPhone: string;
  taxDeductible: boolean;
}

interface ExpenseComponentProps {
  companyId: string;
  expenses: ExpenseData[];
  onSave?: (expense: ExpenseData) => Promise<boolean>;
  onRefresh?: () => Promise<void>;
}

export function ExpenseComponent({
  companyId,
  expenses,
  onSave,
  onRefresh,
}: ExpenseComponentProps) {
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    amount: '',
    category: 'Sonstiges',
    date: new Date().toISOString().split('T')[0],
    description: '',
    vendor: '',
    invoiceNumber: '',
    vatAmount: '',
    netAmount: '',
    vatRate: '19',
    companyName: '',
    companyAddress: '',
    contactEmail: '',
    contactPhone: '',
    taxDeductible: false,
  });

  const [currentReceipt, setCurrentReceipt] = useState<File | null>(null);

  const categories = [
    'Büromaterial',
    'Software/Lizenzen',
    'Marketing/Werbung',
    'Reisekosten',
    'Kommunikation',
    'Beratung',
    'IT/Hosting',
    'Miete/Nebenkosten',
    'Versicherungen',
    'Steuern/Abgaben',
    'Fortbildung',
    'Bewirtung',
    'Fahrzeugkosten',
    'Reparaturen',
    'Sonstiges',
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploadingFile(true);

    toast.info('🤖 Intelligente Rechnungsanalyse startet...', {
      description: 'Versuche OCR-Extraktion aus PDF-Inhalt, Fallback auf Dateiname-Analyse',
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', companyId);

      const response = await fetch('/api/expenses/extract-receipt', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;

        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          amount: data.amount ? data.amount.toString() : prev.amount,
          category: data.category || prev.category,
          description: data.description || prev.description,
          vendor: data.vendor || prev.vendor,
          date: data.date || prev.date,
          invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
          vatAmount: data.vatAmount ? data.vatAmount.toString() : prev.vatAmount,
          netAmount: data.netAmount ? data.netAmount.toString() : prev.netAmount,
          vatRate: data.vatRate ? data.vatRate.toString() : prev.vatRate,
          companyName: data.companyName || prev.companyName,
          companyAddress: data.companyAddress || prev.companyAddress,
          contactEmail: data.contactEmail || prev.contactEmail,
          contactPhone: data.contactPhone || prev.contactPhone,
        }));

        // Store the uploaded file
        setCurrentReceipt(file);

        // Smart success message based on extraction method and data quality
        if (result.extractionMethod === 'advanced_ocr') {
          if (data.amount && data.vendor && data.invoiceNumber) {
            toast.success('🎉 Vollständige OCR-Extraktion erfolgreich!', {
              description: `${result.message} | Konfidenz: ${result.ocr?.confidence ? Math.round(result.ocr.confidence * 100) : 'N/A'}%`,
              duration: 8000,
            });
          } else {
            toast.success('✅ OCR-Verarbeitung abgeschlossen', {
              description: result.message,
              duration: 6000,
            });
          }
        } else if (result.extractionMethod === 'enhanced_filename_analysis_fallback') {
          if (data.amount && data.invoiceNumber && data.vendor) {
            toast.success('🎯 Dateiname-Analyse erfolgreich!', {
              description: `${result.message} | OCR war nicht verfügbar`,
              duration: 6000,
            });
          } else {
            toast.warning('📋 Grundlegende Analyse', {
              description: `${result.message} | Für bessere Ergebnisse OCR aktivieren`,
              duration: 7000,
            });
          }
        } else {
          // Legacy filename analysis
          toast.info('📁 Dateiname analysiert', {
            description: result.message,
            duration: 5000,
          });
        }

        // Show helpful tips based on extraction results
        if (!data.amount && result.tip) {
          setTimeout(() => {
            toast.info('💡 Tipp für bessere Erkennung', {
              description: result.tip,
              duration: 10000,
            });
          }, 3000);
        }

        // Show OCR performance info if available
        if (result.ocr && result.extractionMethod === 'advanced_ocr') {
          setTimeout(() => {
            toast.info('📊 OCR-Details', {
              description: `Verarbeitungszeit: ${result.ocr.processingTime}ms | Textlänge: ${result.ocr.textLength} Zeichen`,
              duration: 6000,
            });
          }, 5000);
        }
      } else {
        toast.error('❌ Analyse fehlgeschlagen', {
          description: result.error || 'Datei konnte nicht verarbeitet werden',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('❌ Upload-Fehler', {
        description: 'Verbindungsfehler beim Hochladen der Datei',
      });
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveExpense = async () => {
    if (!formData.title || !formData.amount || !formData.category) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    setIsLoading(true);

    try {
      const expenseData: ExpenseData = {
        title: formData.title,
        amount,
        category: formData.category,
        date: formData.date,
        description: formData.description,
        vendor: formData.vendor || '',
        invoiceNumber: formData.invoiceNumber || '',
        vatAmount: formData.vatAmount ? parseFloat(formData.vatAmount) : null,
        netAmount: formData.netAmount ? parseFloat(formData.netAmount) : null,
        vatRate: formData.vatRate ? parseFloat(formData.vatRate) : null,
        companyName: formData.companyName || '',
        companyAddress: formData.companyAddress || '',
        contactEmail: formData.contactEmail || '',
        contactPhone: formData.contactPhone || '',
        taxDeductible: formData.taxDeductible,
        receipt: currentReceipt
          ? {
              fileName: currentReceipt.name,
              downloadURL: '',
              uploadDate: new Date().toISOString(),
            }
          : null,
      };

      const success = await onSave?.(expenseData);

      if (success) {
        setFormData({
          title: '',
          amount: '',
          category: 'Sonstiges',
          date: new Date().toISOString().split('T')[0],
          description: '',
          vendor: '',
          invoiceNumber: '',
          vatAmount: '',
          netAmount: '',
          vatRate: '19',
          companyName: '',
          companyAddress: '',
          contactEmail: '',
          contactPhone: '',
          taxDeductible: false,
        });
        setCurrentReceipt(null);
        setShowForm(false);
        await onRefresh?.();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler beim Speichern der Ausgabe');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header nur Button - Titel kommt von der page.tsx */}
      <div className="flex justify-end items-center">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neue Ausgabe
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="bg-white/30 backdrop-blur-sm border-[#14ad9f]/20">
          <CardHeader className="border-b border-[#14ad9f]/10">
            <CardTitle className="text-[#14ad9f]">Neue Ausgabe erfassen</CardTitle>
            <CardDescription>
              Laden Sie einen Beleg hoch für automatische Datenextraktion oder geben Sie die Daten
              manuell ein
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* File Upload */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300 hover:border-[#14ad9f] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600 mb-3">
                  {currentReceipt ? (
                    <span className="text-[#14ad9f] font-medium">
                      Ausgewählt: {currentReceipt.name}
                    </span>
                  ) : (
                    <div>
                      <div>PDF-Beleg oder Rechnung hochladen für automatische Datenextraktion</div>
                      <div className="text-xs text-gray-500 mt-1">
                        💡 Tipp: Für Beträge Datei wie &quot;Rechnung-123-45.67.pdf&quot; benennen
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFile ? 'Verarbeitung...' : 'Beleg hochladen'}
                </Button>
              </div>
            </div>

            {/* Form Fields - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Grundinformationen
                </h3>

                <div>
                  <Label htmlFor="title">Titel/Beschreibung *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Büromaterial August 2024"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount">Betrag (€) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Kategorie *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber">Rechnungsnummer</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))
                      }
                      placeholder="z.B. INV-2024-001"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="vendor">Anbieter/Lieferant</Label>
                  <div className="flex gap-2">
                    <Input
                      id="vendor"
                      value={formData.vendor}
                      onChange={e => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="z.B. Amazon, Microsoft, etc."
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                    <Link href={`/dashboard/company/${companyId}/finance/customers`}>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white whitespace-nowrap"
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        Neuer Lieferant
                      </Button>
                    </Link>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Detaillierte Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Weitere Details zur Ausgabe..."
                    rows={3}
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Steuer & Kontaktdaten
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="vatRate">MwSt.-Satz (%)</Label>
                    <Select
                      value={formData.vatRate}
                      onValueChange={value => setFormData(prev => ({ ...prev, vatRate: value }))}
                    >
                      <SelectTrigger className="focus:ring-[#14ad9f] focus:border-[#14ad9f]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="7">7%</SelectItem>
                        <SelectItem value="19">19%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="netAmount">Nettobetrag (€)</Label>
                    <Input
                      id="netAmount"
                      type="number"
                      step="0.01"
                      value={formData.netAmount}
                      onChange={e => setFormData(prev => ({ ...prev, netAmount: e.target.value }))}
                      placeholder="0.00"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vatAmount">MwSt.-Betrag (€)</Label>
                    <Input
                      id="vatAmount"
                      type="number"
                      step="0.01"
                      value={formData.vatAmount}
                      onChange={e => setFormData(prev => ({ ...prev, vatAmount: e.target.value }))}
                      placeholder="0.00"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyName">
                    <Building2 className="h-4 w-4 inline mr-1" />
                    Firmenname
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Vollständiger Firmenname"
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                <div>
                  <Label htmlFor="companyAddress">Firmenadresse</Label>
                  <Textarea
                    id="companyAddress"
                    value={formData.companyAddress}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, companyAddress: e.target.value }))
                    }
                    placeholder="Straße, PLZ Ort, Land"
                    rows={2}
                    className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="contactEmail">
                      <Mail className="h-4 w-4 inline mr-1" />
                      E-Mail
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, contactEmail: e.target.value }))
                      }
                      placeholder="kontakt@firma.de"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">
                      <Phone className="h-4 w-4 inline mr-1" />
                      Telefon
                    </Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, contactPhone: e.target.value }))
                      }
                      placeholder="+49 xxx xxx xxxx"
                      className="focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="taxDeductible"
                    checked={formData.taxDeductible}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, taxDeductible: checked as boolean }))
                    }
                    className="border-[#14ad9f] data-[state=checked]:bg-[#14ad9f]"
                  />
                  <Label htmlFor="taxDeductible" className="text-sm">
                    Steuerlich absetzbar
                  </Label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveExpense}
                disabled={isLoading}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {isLoading ? 'Speichern...' : 'Ausgabe speichern'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Gespeicherte Ausgaben</CardTitle>
          <CardDescription>
            Übersicht aller erfassten Geschäftsausgaben ({expenses.length} Einträge)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Noch keine Ausgaben erfasst</p>
                <p className="text-sm">Klicken Sie auf &quot;Neue Ausgabe&quot; um zu beginnen</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{expense.title}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            <span>{expense.category}</span>
                            {expense.vendor && (
                              <>
                                <span>•</span>
                                <span>{expense.vendor}</span>
                              </>
                            )}
                            {expense.invoiceNumber && (
                              <>
                                <span>•</span>
                                <span>RG: {expense.invoiceNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-lg">
                            {formatCurrency(expense.amount || 0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(expense.date).toLocaleDateString('de-DE')}
                          </div>
                        </div>
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-600 mt-2">{expense.description}</div>
                      )}
                      {expense.receipt && (
                        <div className="text-xs text-[#14ad9f] mt-1 flex items-center">
                          <FileText className="h-3 w-3 mr-1" />
                          Beleg: {expense.receipt.fileName}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1 ml-4">
                      <Button variant="ghost" size="sm" className="hover:bg-[#14ad9f]/10">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
