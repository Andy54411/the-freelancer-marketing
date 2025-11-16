'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Globe, 
  Building2, 
  CreditCard, 
  Receipt, 
  Calculator,
  Clock,
  Banknote,
  Package,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  User
} from 'lucide-react';
import { Customer } from '../AddCustomerModal';
import { Badge } from '@/components/ui/badge';

interface CustomerInfoCardProps {
  customer: Customer;
  calculatedStats: {
    totalAmount: number;
    totalInvoices: number;
    totalMeetings?: number;
  };
}

export function CustomerInfoCard({ customer, calculatedStats }: CustomerInfoCardProps) {
  const [expandedSections, setExpandedSections] = useState({
    contact: true,
    payment: false,
    banking: false,
    skonto: false,
    additional: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  // Type safe access helper
  const getCustomerData = (key: string) => {
    return (customer as any)[key];
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-500 font-medium">{label}</div>
          <div className="text-sm text-gray-900 break-words">{value}</div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ 
    icon: Icon, 
    title, 
    isExpanded, 
    onToggle 
  }: { 
    icon: any; 
    title: string; 
    isExpanded: boolean; 
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#14ad9f]" />
        <span className="font-semibold text-sm text-gray-900">{title}</span>
      </div>
      {isExpanded ? (
        <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Statistiken Card - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#14ad9f]/5 rounded-lg p-4">
              <div className="text-xs text-gray-600 font-medium mb-1">Gesamtumsatz</div>
              <div className="text-xl font-bold text-[#14ad9f]">
                {formatCurrency(calculatedStats.totalAmount)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 font-medium mb-1">Rechnungen</div>
              <div className="text-xl font-bold text-blue-600">{calculatedStats.totalInvoices}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-xs text-gray-600 font-medium mb-1">Termine</div>
              <div className="text-xl font-bold text-purple-600">
                {calculatedStats.totalMeetings || 0}
              </div>
            </div>
          </div>
          {customer.createdAt && (
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 pt-4 border-t">
              <Calendar className="h-3 w-3" />
              <span>Kunde seit {formatDate(customer.createdAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-Spalten Grid für die Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kontaktinformationen */}
        <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Mail}
            title="Kontaktinformationen"
            isExpanded={expandedSections.contact}
            onToggle={() => toggleSection('contact')}
          />
        </CardHeader>
        {expandedSections.contact && (
          <CardContent className="space-y-1">
            <InfoRow icon={User} label="Kundentyp" value={getCustomerData('organizationType') || 'Kunde'} />
            <InfoRow icon={FileText} label="Kundennummer" value={customer.customerNumber} />
            <InfoRow icon={Mail} label="E-Mail" value={customer.email} />
            <InfoRow icon={Phone} label="Telefon" value={customer.phone} />
            <InfoRow icon={Globe} label="Website" value={getCustomerData('website')} />
            {(customer.street || customer.city) && (
              <div className="flex items-start gap-3 py-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-medium">Adresse</div>
                  <div className="text-sm text-gray-900">
                    {customer.street && <div>{customer.street}</div>}
                    {customer.city && (
                      <div>
                        {customer.postalCode} {customer.city}, {customer.country || 'Deutschland'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <InfoRow icon={Building2} label="Firmengröße" value={getCustomerData('companySize')} />
            <InfoRow icon={Tag} label="Branche" value={getCustomerData('industry')} />
            <InfoRow icon={Globe} label="Sprache" value={getCustomerData('language')} />
            
            {/* Steuernummern direkt in Kontaktinfo */}
            <Separator className="my-3" />
            <InfoRow icon={Receipt} label="Steuernummer" value={customer.taxNumber} />
            <InfoRow icon={Calculator} label="USt-IdNr." value={customer.vatId} />
            <InfoRow icon={FileText} label="Debitorennummer" value={getCustomerData('debitorNumber')} />
            <InfoRow icon={FileText} label="Kreditorennummer" value={getCustomerData('creditorNumber')} />
            
            {getCustomerData('tags') && (getCustomerData('tags') as string[]).length > 0 && (
              <div className="flex items-start gap-3 py-2">
                <Tag className="h-4 w-4 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs text-gray-500 font-medium mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {(getCustomerData('tags') as string[]).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

        {/* Zahlungsinformationen */}
        {(getCustomerData('paymentTerms') || getCustomerData('preferredPaymentMethod') || getCustomerData('discount')) && (
          <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={CreditCard}
              title="Zahlungsbedingungen"
              isExpanded={expandedSections.payment}
              onToggle={() => toggleSection('payment')}
            />
          </CardHeader>
          {expandedSections.payment && (
            <CardContent className="space-y-1">
              <InfoRow icon={Clock} label="Zahlungsbedingungen" value={getCustomerData('paymentTerms')} />
              <InfoRow icon={Banknote} label="Bevorzugte Zahlungsart" value={getCustomerData('preferredPaymentMethod')} />
              <InfoRow icon={Calendar} label="Zahlungsziel (Tage)" value={getCustomerData('defaultInvoiceDueDate')} />
              <InfoRow icon={Calculator} label="Standardrabatt" value={getCustomerData('discount') ? `${getCustomerData('discount')}%` : undefined} />
              <InfoRow icon={CreditCard} label="Währung" value={getCustomerData('currency')} />
              <InfoRow icon={CreditCard} label="Kreditlimit" value={getCustomerData('creditLimit') ? formatCurrency(getCustomerData('creditLimit')) : undefined} />
            </CardContent>
          )}
          </Card>
        )}

        {/* Bankverbindung */}
        {(getCustomerData('iban') || getCustomerData('bic') || getCustomerData('bankName')) && (
          <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={Building2}
              title="Bankverbindung"
              isExpanded={expandedSections.banking}
              onToggle={() => toggleSection('banking')}
            />
          </CardHeader>
          {expandedSections.banking && (
            <CardContent className="space-y-1">
              <InfoRow icon={Building2} label="Bank" value={getCustomerData('bankName')} />
              <InfoRow icon={User} label="Kontoinhaber" value={getCustomerData('accountHolder')} />
              <InfoRow icon={CreditCard} label="IBAN" value={getCustomerData('iban')} />
              <InfoRow icon={Building2} label="BIC" value={getCustomerData('bic')} />
            </CardContent>
          )}
          </Card>
        )}

        {/* Skonto & Konditionen */}
        {(getCustomerData('earlyPaymentDiscount') || getCustomerData('earlyPaymentDays') || getCustomerData('skontoProducts')) && (
          <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={Calculator}
              title="Skonto & Konditionen"
              isExpanded={expandedSections.skonto}
              onToggle={() => toggleSection('skonto')}
            />
          </CardHeader>
          {expandedSections.skonto && (
            <CardContent className="space-y-1">
              <InfoRow 
                icon={Calculator} 
                label="Skonto-Rabatt" 
                value={getCustomerData('earlyPaymentDiscount') ? `${getCustomerData('earlyPaymentDiscount')}%` : undefined} 
              />
              <InfoRow 
                icon={Clock} 
                label="Skonto-Frist" 
                value={getCustomerData('earlyPaymentDays') ? `${getCustomerData('earlyPaymentDays')} Tage` : undefined} 
              />
              {getCustomerData('skontoProducts') && (getCustomerData('skontoProducts') as any[]).length > 0 && (
                <div className="flex items-start gap-3 py-2">
                  <Package className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 font-medium mb-2">Produktspezifische Skonto-Bedingungen</div>
                    <div className="space-y-2">
                      {(getCustomerData('skontoProducts') as any[]).map((product, index) => (
                        <div key={index} className="bg-gray-50 rounded p-2 text-xs">
                          <div className="font-medium text-gray-900">{product.productName || 'Unbenannt'}</div>
                          {product.sku && <div className="text-gray-600">SKU: {product.sku}</div>}
                          <div className="text-[#14ad9f] font-medium mt-1">
                            {product.discount}% Skonto innerhalb {product.days} Tage
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          )}
          </Card>
        )}
      </div>

      {/* Notizen - Full Width außerhalb des Grids */}
      {getCustomerData('notes') && (
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader
              icon={FileText}
              title="Notizen & Zusatzinformationen"
              isExpanded={expandedSections.additional}
              onToggle={() => toggleSection('additional')}
            />
          </CardHeader>
          {expandedSections.additional && (
            <CardContent>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {getCustomerData('notes')}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
