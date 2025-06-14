import { FiHelpCircle, FiMessageSquare } from 'react-icons/fi';

interface HelpCardProps {
    onOpenSupportChat: () => void;
}

export function HelpCard({ onOpenSupportChat }: HelpCardProps) {
    return (
        <>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
                <FiHelpCircle className="mr-2" /> Support & Hilfe
            </h2>
            <div className="flex flex-col justify-between flex-grow">
                <p className="text-gray-600 mb-6">
                    Haben Sie Fragen oder benötigen Unterstützung? Unser Support-Team hilft Ihnen gerne weiter.
                </p>
                <button
                    onClick={onOpenSupportChat}
                    className="w-full flex items-center justify-center px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition-colors"
                >
                    <FiMessageSquare className="mr-2" /> Zum Support schreiben
                </button>
            </div>
        </>
    );
}
