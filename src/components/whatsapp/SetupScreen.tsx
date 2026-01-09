'use client';

import { Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WhatsAppLogo from './WhatsAppLogo';

interface SetupScreenProps {
  phoneNumberInput: string;
  setPhoneNumberInput: (value: string) => void;
  isConnecting: boolean;
  isPending?: boolean;
  onConnect: () => void;
}

export default function SetupScreen({
  phoneNumberInput,
  setPhoneNumberInput,
  isConnecting,
  isPending,
  onConnect,
}: SetupScreenProps) {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#25D366] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <WhatsAppLogo className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp verbinden</h1>
          <p className="text-gray-500">
            {isPending
              ? 'Verbindung unvollständig - bitte erneut verbinden'
              : 'Verbinde deine Business-Nummer mit Taskilo'}
          </p>
        </div>

        {isPending && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Die vorherige Verbindung wurde nicht abgeschlossen. Bitte verbinde dich erneut mit Meta.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            WhatsApp Business Nummer
          </label>
          <Input
            placeholder="+49 123 456789"
            value={phoneNumberInput}
            onChange={(e) => setPhoneNumberInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConnect()}
            disabled={isConnecting}
            className="mb-4 h-12 text-lg"
          />
          <Button
            onClick={onConnect}
            disabled={isConnecting || !phoneNumberInput.trim()}
            className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Verbinden...
              </>
            ) : (
              'Mit Meta verbinden'
            )}
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {['Eigene Nummer nutzen', '1.000 Chats/Monat gratis', 'Ende-zu-Ende verschlüsselt'].map(
            (text) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-5 h-5 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                  <CheckCheck className="w-3 h-3 text-[#25D366]" />
                </div>
                {text}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
