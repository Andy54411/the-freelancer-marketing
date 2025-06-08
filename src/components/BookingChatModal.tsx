import React from 'react';

// Define a more specific type for auftrag if possible
interface AuftragDetails {
    customerFirstName?: string;
    // Add other relevant fields from auftrag object
}
// Definiere die Props für das Chat-Modal
interface BookingChatModalProps {
    auftrag: AuftragDetails; // Das Auftragsobjekt, um Details wie den Namen des Chat-Partners zu erhalten
    onClose: () => void; // Funktion zum Schließen des Modals
}

export function BookingChatModal({ auftrag, onClose }: BookingChatModalProps) {
    // Hier würdest du später die Logik zum Laden und Senden von Nachrichten implementieren
    // und den Chat-Verlauf in einem State speichern.

    return (
        // Das Modal-Overlay und der Container
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden relative flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Chat mit {auftrag.customerFirstName || 'Kunden'}
                    </h3>
                    <button
                        onClick={onClose} // Ruft die übergebene onClose-Funktion auf
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
                        aria-label="Close chat"
                    >
                        &times;
                    </button>
                </div>

                {/* Chat Nachrichten Bereich (Platzhalter) */}
                <div className="p-4 flex-grow overflow-y-auto">
                    {/* Hier werden später die Chat-Nachrichten geladen und angezeigt */}
                    <p className="text-muted-foreground text-sm">Chat-Nachrichten werden hier geladen...</p>
                </div>

                {/* Nachricht Eingabebereich (Platzhalter) */}
                <div className="p-4 border-t">
                    {/* Hier kommt das Eingabefeld und der Senden-Button */}
                    <input
                        type="text"
                        placeholder="Nachricht eingeben..."
                        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    {/* Ein Senden-Button könnte hier hinzugefügt werden */}
                    {/* <button className="ml-2 p-2 bg-blue-500 text-white rounded-md">Senden</button> */}
                </div>
            </div>
        </div>
    );
}