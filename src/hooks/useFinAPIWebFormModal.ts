'use client';

import { useState } from 'react';

interface UseFinAPIWebFormModalProps {
  onSuccess?: (bankConnectionId?: string, bankName?: string) => void;
  onError?: (error: string) => void;
}

export function useFinAPIWebFormModal({ onSuccess, onError }: UseFinAPIWebFormModalProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [webFormUrl, setWebFormUrl] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  const openWebFormModal = async (bankId: number, selectedBankName: string, userId: string) => {
    if (isConnecting) return;

    setIsConnecting(true);
    setBankName(selectedBankName);

    try {
      const response = await fetch('/api/finapi/connect-bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankId: bankId,
          bankName: selectedBankName,
          userId: userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verbindung zur Bank fehlgeschlagen');
      }

      if (result.webForm && result.webForm.url) {
        setWebFormUrl(result.webForm.url);
        setIsModalOpen(true);
        setIsConnecting(false);
      } else {
        throw new Error('Keine WebForm URL erhalten');
      }
    } catch (error: any) {
      setIsConnecting(false);

      if (onError) {
        onError(error.message || 'Unbekannter Fehler bei der Bankverbindung');
      }
    }
  };

  const handleSuccess = (bankConnectionId?: string) => {
    setIsModalOpen(false);
    setIsConnecting(false);

    if (onSuccess) {
      onSuccess(bankConnectionId, bankName);
    }
  };

  const handleError = (error: string) => {
    setIsModalOpen(false);
    setIsConnecting(false);

    if (onError) {
      onError(error);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setIsConnecting(false);
  };

  return {
    openWebFormModal,
    handleSuccess,
    handleError,
    handleClose,
    isConnecting,
    isModalOpen,
    webFormUrl,
    bankName,
  };
}
