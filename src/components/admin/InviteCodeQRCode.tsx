'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Copy as FiCopy, Check as FiCheck } from 'lucide-react';

interface InviteCodeQRCodeProps {
    inviteCode: string;
}

export default function InviteCodeQRCode({ inviteCode }: InviteCodeQRCodeProps) {
    const [registrationUrl, setRegistrationUrl] = useState('');
    const [hasCopied, setHasCopied] = useState(false);

    useEffect(() => {
        // Stellt sicher, dass window.location.origin nur im Client-Code aufgerufen wird.
        if (typeof window !== 'undefined') {
            const url = `${window.location.origin}/register/employee?inviteCode=${inviteCode}`;
            setRegistrationUrl(url);
        }
    }, [inviteCode]);

    const handleCopy = () => {
        if (registrationUrl) {
            navigator.clipboard.writeText(registrationUrl).then(() => {
                setHasCopied(true);
                setTimeout(() => setHasCopied(false), 2000); // Reset after 2 seconds
            });
        }
    };

    if (!registrationUrl) {
        return <div>Lade QR-Code...</div>;
    }

    return (
        <div className="flex flex-col items-center gap-6 p-6 border rounded-lg bg-gray-50 text-center">
            <h3 className="text-lg font-semibold text-gray-800">Mitarbeiter einladen</h3>
            <p className="text-sm text-gray-600">
                Der neue Mitarbeiter kann diesen QR-Code scannen, um sich direkt mit dem richtigen Code zu registrieren.
            </p>
            <div className="p-4 bg-white rounded-lg shadow-md">
                {/* @ts-ignore */}
                <QRCode value={registrationUrl} size={200} title="QR-Code zur Mitarbeiterregistrierung" />
            </div>
            <div className="w-full">
                <p className="text-xs text-gray-500 mb-2">Oder teile diesen Link:</p>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={registrationUrl}
                        readOnly
                        className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <Button onClick={handleCopy} size="icon" variant="outline" aria-label="Link kopieren">
                        {hasCopied ? <FiCheck className="text-green-500" /> : <FiCopy />}
                    </Button>
                </div>
            </div>
        </div>
    );
}