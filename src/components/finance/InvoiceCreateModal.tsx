'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  displayName: string;
  customerNumber: string;
  email?: string;
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Kunde ist erforderlich'),
  invoiceDate: z.date({
    required_error: 'Rechnungsdatum ist erforderlich',
  }),
  dueDate: z.date({
    required_error: 'Fälligkeitsdatum ist erforderlich',
  }),
  description: z.string().optional(),
  introduction: z.string().optional(),
  conclusion: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1, 'Beschreibung ist erforderlich'),
        quantity: z.number().min(0.01, 'Menge muss größer als 0 sein'),
        unitPrice: z.number().min(0, 'Preis muss positiv sein'),
        taxRate: z.number().min(0).max(100, 'Steuersatz muss zwischen 0 und 100% liegen'),
      })
    )
    .min(1, 'Mindestens eine Position ist erforderlich'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSubmit: (data: InvoiceFormData) => Promise<void>;
}

export default function InvoiceCreateModal({
  isOpen,
  onClose,
  customers,
  onSubmit,
}: InvoiceCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage später
      description: '',
      introduction: '',
      conclusion: '',
      lineItems: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 19,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  });

  const handleSubmit = async (data: InvoiceFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 19,
    });
  };

  const calculateLineTotal = (quantity: number, unitPrice: number, taxRate: number) => {
    const netAmount = quantity * unitPrice;
    const taxAmount = (netAmount * taxRate) / 100;
    return netAmount + taxAmount;
  };

  const calculateInvoiceTotal = () => {
    const lineItems = form.watch('lineItems');
    return lineItems.reduce((total, item) => {
      return total + calculateLineTotal(item.quantity, item.unitPrice, item.taxRate);
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Rechnung erstellen</DialogTitle>
          <DialogDescription>Erstellen Sie eine neue Rechnung für Ihre Kunden</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Kunde und Daten */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kunde</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kunde auswählen" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.displayName} ({customer.customerNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Rechnungsdatum</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd.MM.yyyy', { locale: de })
                            ) : (
                              <span>Datum auswählen</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={date => date < new Date('1900-01-01')}
                          initialFocus
                          locale={de}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fälligkeitsdatum</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd.MM.yyyy', { locale: de })
                            ) : (
                              <span>Datum auswählen</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={date => date < new Date()}
                          initialFocus
                          locale={de}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Einleitung und Beschreibung */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="introduction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Einleitung (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Begrüßungstext für die Rechnung..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conclusion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schlusstext (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Abschließende Bemerkungen..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rechnungspositionen */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Rechnungspositionen</h3>
                <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Position hinzufügen
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Beschreibung</FormLabel>}
                            <FormControl>
                              <Input placeholder="Leistungsbeschreibung..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Menge</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Einzelpreis €</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.taxRate`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>MwSt. %</FormLabel>}
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Gesamtsumme */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Gesamtsumme:</span>
                  <span>{formatCurrency(calculateInvoiceTotal())}</span>
                </div>
              </div>
            </div>

            {/* Allgemeine Beschreibung */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allgemeine Beschreibung (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Zusätzliche Informationen zur Rechnung..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Erstelle Rechnung...' : 'Rechnung erstellen'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
