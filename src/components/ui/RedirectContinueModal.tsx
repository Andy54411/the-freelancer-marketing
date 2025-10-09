import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Checkbox } from './checkbox';
import { Button } from './button';

interface RedirectContinueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (dontShowAgain: boolean) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  partnerName?: string;
  continueText?: string;
  cancelText?: string;
  dontShowAgainText?: string;
}

const RedirectContinueModal: React.FC<RedirectContinueModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  onCancel,
  title = 'Weiterleitung',
  message = 'Du wirst jetzt auf eine sichere Partner-Seite weitergeleitet, auf welcher die Aktion bestätigt oder fertiggestellt werden muss. Im Anschluss kommst du wieder zurück zu Taskilo.',
  partnerName = 'Partner',
  continueText = 'Weiter',
  cancelText = 'Abbrechen',
  dontShowAgainText = 'Nicht mehr anzeigen'
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleContinue = () => {
    onContinue(dontShowAgain);
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="content-header flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex-1">
            <h1 className="content-header--title text-xl font-semibold text-gray-900">
              {title}
            </h1>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleClose}
              className="close-modal p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Modal schließen"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="main bg-white">
          <div className="content--scroll content--padding p-6 pb-4">
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-[#14ad9f]/10 rounded-full flex items-center justify-center">
                  <ExternalLink className="h-5 w-5 text-[#14ad9f]" />
                </div>
              </div>
              
              {/* Message */}
              <div className="flex-1">
                <p className="text-gray-700 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-[#14ad9f] rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-green-800">
                  <strong>Sicherheitshinweis:</strong> Die Übertragung erfolgt verschlüsselt 
                  über eine sichere Verbindung zu unserem vertrauenswürdigen {partnerName}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            {/* Checkbox */}
            <div className="ml-2 flex items-center space-x-2">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                className="c-form-control"
              />
              <label htmlFor="dontShowAgain" className="text-sm text-gray-700 cursor-pointer">
                {dontShowAgainText}
              </label>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                {cancelText}
              </Button>
              
              <Button
                variant="default"
                onClick={handleContinue}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white"
              >
                {continueText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedirectContinueModal;