'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { Customer } from '../AddCustomerModal';

interface CustomerInfoCardProps {
  customer: Customer;
  calculatedStats: {
    totalAmount: number;
    totalInvoices: number;
    totalMeetings?: number;
  };
}

export function CustomerInfoCard({ customer, calculatedStats }: CustomerInfoCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';

    let dateObj: Date;

    // Handle Firestore Timestamp
    if (date?.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }
    // Handle string
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Handle Date object
    else if (date instanceof Date) {
      dateObj = date;
    }
    // Handle timestamp in seconds
    else if (typeof date === 'number') {
      dateObj = new Date(date * 1000);
    } else {
      return 'N/A';
    }

    // Validate date
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    return dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Unternehmensdaten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span>{customer.email}</span>
          </div>
        )}

        {customer.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <span>{customer.phone}</span>
          </div>
        )}

        {(customer.street || customer.city) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
            <span className="text-sm">
              {customer.street && <div>{customer.street}</div>}
              {customer.city && (
                <div>
                  {customer.postalCode} {customer.city}
                </div>
              )}
            </span>
          </div>
        )}

        {(customer.taxNumber || customer.vatId) && (
          <>
            <Separator />
            <div className="space-y-1">
              {customer.taxNumber && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Steuernummer:</span> {customer.taxNumber}
                </div>
              )}
              {customer.vatId && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">USt-IdNr:</span> {customer.vatId}
                </div>
              )}
            </div>
          </>
        )}

        <Separator />
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Gesamtumsatz:</span>
            <div className="text-lg font-semibold text-[#14ad9f]">
              {formatCurrency(calculatedStats.totalAmount)}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Rechnungen:</span>
            <div className="text-lg font-semibold">{calculatedStats.totalInvoices}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Termine:</span>
            <div className="text-lg font-semibold text-purple-600">
              {calculatedStats.totalMeetings || 0}
            </div>
          </div>
        </div>

        {customer.createdAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Kunde seit {formatDate(customer.createdAt)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
