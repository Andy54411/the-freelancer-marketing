'use client';

interface ClientTranslationsProps {
    children: (t: (key: string) => string) => React.ReactNode;
}

export const ClientTranslations: React.FC<ClientTranslationsProps> = ({ children }) => {
    const t = (key: string) => {
        // Fallback für fehlende Übersetzungen - geben einfach den Schlüssel zurück
        return key;
    };
    return <>{children(t)}</>;
};
