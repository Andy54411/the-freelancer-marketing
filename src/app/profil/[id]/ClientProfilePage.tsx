'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Props {
    id: string;
}

interface Review {
    id: string;
    kundeId: string;
    kundeName?: string;
    sterne: number;
    kommentar: string;
    kundeProfilePictureURL?: string;
    erstellungsdatum?: { _seconds: number; _nanoseconds: number } | Date;
}

const formatDate = (timestamp: Review['erstellungsdatum']): string => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date
        ? timestamp
        : new Date(timestamp._seconds * 1000);
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export default function ClientProfilePage({ id }: Props) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [average, setAverage] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setIsLoading(false);
            setError("Keine Anbieter-ID vorhanden.");
            return;
        }

        const fetchReviews = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `https://us-central1-tilvo-f142f.cloudfunctions.net/getReviewsByProvider?anbieterId=${id}`
                );
                if (!res.ok) throw new Error('Bewertungen konnten nicht geladen werden.');

                const data = await res.json();

                if (Array.isArray(data)) {
                    setReviews(data);
                    if (data.length > 0) {
                        const total = data.reduce((sum, r) => sum + (r.sterne || 0), 0);
                        setAverage(Number((total / data.length).toFixed(1)));
                    }
                } else {
                    setReviews([]);
                }
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Ein unbekannter Fehler ist aufgetreten.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();
    }, [id]);

    if (isLoading) {
        return <div className="p-10 text-center">Lade Bewertungen...</div>;
    }

    if (error) {
        return <div className="p-10 text-center text-red-600">{error}</div>;
    }

    if (reviews.length === 0) {
        return (
            <p className="mt-10 text-center text-sm text-gray-500">
                Für diesen Anbieter sind noch keine Bewertungen vorhanden.
            </p>
        );
    }

    return (
        <div className="mt-10 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                    Bewertungen ({reviews.length})
                </h3>
                {average !== null && (
                    <p className="text-sm text-gray-700">
                        Durchschnitt: <span className="text-yellow-500">★ {average}</span>
                    </p>
                )}
            </div>

            {reviews.map((review) => (
                <div key={review.id} className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 mb-2">
                            <Image
                                src={review.kundeProfilePictureURL || '/default-avatar.jpg'}
                                alt={review.kundeName || 'Kundenbild'}
                                className="w-10 h-10 rounded-full object-cover"
                                width={40}
                                height={40}
                            />
                            <div>
                                <p className="text-sm font-semibold">
                                    {review.kundeName || 'Anonymer Nutzer'}
                                </p>
                                <div className="text-yellow-400 text-sm">
                                    {'★'.repeat(review.sterne)}
                                    {'☆'.repeat(5 - review.sterne)}
                                </div>
                            </div>
                        </div>
                        <span className="text-xs text-gray-500">
                            {formatDate(review.erstellungsdatum)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {review.kommentar || 'Keine Nachricht hinterlassen.'}
                    </p>
                </div>
            ))}
        </div>
    );
}
