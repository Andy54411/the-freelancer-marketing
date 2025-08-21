// Test Component für Quote Bell-Notification System
'use client';

import React, { useState } from 'react';
import { FiBell, FiCheck, FiX, FiSend, FiDollarSign } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

interface QuoteNotificationTestProps {
  companyId: string;
}

const QuoteNotificationTest: React.FC<QuoteNotificationTestProps> = ({ companyId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  // Test 1: Neue Angebotsanfrage senden
  const testNewQuoteRequest = async () => {
    setIsLoading(true);
    setStatus('Sende neue Angebotsanfrage...');

    try {
      const response = await fetch('/api/send-quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: 'test-provider-123', // Test Provider
          customerUid: companyId,
          projectData: {
            title: 'Test Catering Anfrage',
            description: 'Test-Angebotsanfrage für Bell-Notification System',
            category: 'Catering',
            subcategory: 'Mietkoch',
            location: 'Berlin',
            postalCode: '10115',
            budgetRange: { min: 500, max: 1000, currency: 'EUR' },
            urgency: 'hoch',
            additionalNotes: 'Test für Bell-Notifications',
          },
          customerInfo: {
            name: 'Test Kunde',
            email: 'test@taskilo.de',
            phone: '+49 123 456789',
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        setStatus(`✅ Neue Angebotsanfrage erstellt: ${result.quoteId}`);
      } else {
        setStatus(`❌ Fehler: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 2: Quote Response (Provider antwortet)
  const testQuoteResponse = async () => {
    setIsLoading(true);
    setStatus('Teste Quote Response...');

    try {
      // Erstelle erst eine Quote
      const createResponse = await fetch('/api/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: companyId,
          customerUid: 'test-customer-456',
          quoteData: {
            projectTitle: 'Test Response',
            projectSubcategory: 'Test Service',
            projectDescription: 'Test für Response-Notification',
            customerName: 'Test Kunde',
            customerEmail: 'kunde@test.de',
            budgetRange: { min: 300, max: 600, currency: 'EUR' },
          },
        }),
      });

      const createResult = await createResponse.json();
      if (createResult.success) {
        // Sende Response
        const responseResponse = await fetch('/api/quotes/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteId: createResult.quoteId,
            action: 'respond',
            response: {
              message: 'Test-Angebot für Bell-Notification System',
              estimatedPrice: 450,
              estimatedDuration: '2 Stunden',
              totalAmount: 450,
            },
          }),
        });

        const responseResult = await responseResponse.json();
        if (responseResult.success) {
          setStatus(`✅ Quote Response gesendet: ${createResult.quoteId}`);
        } else {
          setStatus(`❌ Response-Fehler: ${responseResult.error}`);
        }
      } else {
        setStatus(`❌ Create-Fehler: ${createResult.error}`);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 3: Quote Acceptance (Kunde nimmt an)
  const testQuoteAcceptance = async () => {
    setIsLoading(true);
    setStatus('Teste Quote Acceptance...');

    try {
      // Nutze eine existierende Quote ID (müsste aus der Datenbank kommen)
      const testQuoteId = 'quote_' + Date.now();

      const response = await fetch(
        `/api/company/${companyId}/quotes/received/${testQuoteId}/action`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer test-token`, // Würde normalerweise von Firebase Auth kommen
          },
          body: JSON.stringify({
            action: 'accept',
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setStatus(`✅ Quote akzeptiert - Provision erforderlich`);
      } else {
        setStatus(`❌ Fehler: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 4: Direct Notification Test
  const testDirectNotification = async () => {
    setIsLoading(true);
    setStatus('Sende Test-Notification direkt...');

    try {
      const testNotification = {
        userId: companyId,
        type: 'quote_request',
        title: '🔔 Test-Benachrichtigung',
        message: 'Dies ist eine Test-Benachrichtigung für das Bell-System.',
        quoteId: 'test-quote-123',
        quoteTitle: 'Test Angebot',
        link: `/dashboard/company/${companyId}/quotes/received/test-quote-123`,
        isRead: false,
        createdAt: new Date(),
        metadata: {
          customerName: 'Test Kunde',
          providerName: 'Test Provider',
          subcategory: 'Test Service',
        },
      };

      // Direkter Firestore-Write (würde normalerweise über Backend gemacht)
      const response = await fetch('/api/admin/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testNotification),
      });

      const result = await response.json();
      if (result.success) {
        setStatus(`✅ Test-Notification erstellt`);
      } else {
        setStatus(`❌ Fehler: ${result.error}`);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <FiBell className="h-6 w-6 text-[#14ad9f] mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">
          Quote Bell-Notification System Tester
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Button
          onClick={testNewQuoteRequest}
          disabled={isLoading}
          className="bg-[#14ad9f] hover:bg-[#129488] text-white"
        >
          <FiSend className="mr-2 h-4 w-4" />
          Test: Neue Angebotsanfrage
        </Button>

        <Button
          onClick={testQuoteResponse}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <FiCheck className="mr-2 h-4 w-4" />
          Test: Quote Response
        </Button>

        <Button
          onClick={testQuoteAcceptance}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <FiDollarSign className="mr-2 h-4 w-4" />
          Test: Quote Acceptance
        </Button>

        <Button
          onClick={testDirectNotification}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <FiBell className="mr-2 h-4 w-4" />
          Test: Direkte Notification
        </Button>
      </div>

      {status && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Status:</h4>
          <p className="text-sm text-gray-700">{status}</p>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <h4 className="font-medium mb-2">Erwartete Benachrichtigungen:</h4>
        <ul className="space-y-1">
          <li>• Bell-Icon im Header sollte rote Badge zeigen</li>
          <li>• Dropdown mit neuen Benachrichtigungen</li>
          <li>• Verschiedene Notification-Typen (Request, Response, Acceptance, Payment)</li>
          <li>• Links zu entsprechenden Quote-Detail-Seiten</li>
        </ul>
      </div>
    </div>
  );
};

export default QuoteNotificationTest;
