// /Users/andystaudinger/Tasko/src/app/dashboard/user/userId/components/FaqSection.tsx
'use client';

import React from 'react';
import FaqItem from './FaqItem'; // Importiere die FaqItem Komponente

const faqData = [
    {
        question: "Wo kann ich mehr über die verschiedenen Tasko-Tarife erfahren?",
        answer: (
            <>
                Alle Informationen, die du zu unseren Tarifen benötigst, findest du auf der Seite{' '}
                <a href="/pricing" className="text-[#14ad9f] hover:underline">Tarife und Preise</a>.
                Du kannst darauf zugreifen, indem du auf dein Profilbild klickst und &ldquo;Abonnement&rdquo; wählst.
            </>
        ),
    },
    {
        question: "Ist der Freelancer verpflichtet, sich an eine Geheimhaltungsvereinbarung zu halten?",
        answer: (
            <>
                Gemäß den{' '}
                <a href="/terms-of-service" className="text-[#14ad9f] hover:underline">Nutzungsbedingungen von Tasko</a>
                sind Freelancer dazu verpflichtet, die Vertraulichkeit und Privatsphäre ihrer Kunden zu wahren.
                Zusätzlich hast du die Möglichkeit, eine Geheimhaltungsvereinbarung (NDA) direkt mit dem Freelancer zu vereinbaren.
            </>
        ),
    },
    {
        question: "Wie stellt Tasko sicher, dass die Freelancer hochwertige Arbeit liefern?",
        answer: (
            <>
                Tasko-Freelancer werden anhand ihrer Profile, Bewertungen und abgeschlossenen Projekte bewertet.
                Wir verfügen über Mechanismen zur Überprüfung von Freelancern, wie z.B. Kompetenzbewertungen durch Kunden und Qualitätsprüfungen durch unser Team.
            </>
        ),
    },
    {
        question: "Wo sehe ich den Stundensatz eines Freelancers?",
        answer: (
            <>
                Du kannst die Suchergebnisse nach Freelancern filtern, die auf Stundenbasis arbeiten.
                Der Stundensatz eines jeden Freelancers ist auf seiner Profilseite und oft direkt in den Suchergebnissen oder Projektvorschlägen ersichtlich.
            </>
        ),
    },
    {
        question: "Was mache ich, wenn ich nicht genau die Dienstleistung finden kann, die meinen Projektanforderungen entspricht?",
        answer: (
            <>
                Wenn du keinen passenden Freelancer für dein Projekt finden konntest, bieten wir dir verschiedene Optionen:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                        Du kannst dich an unser{' '}
                        <a href="/support" className="text-[#14ad9f] hover:underline">Kundensupport</a>-Team wenden,
                        das dir bei der Suche helfen kann.
                    </li>
                    <li>
                        Poste eine detaillierte Projektanfrage. Interessierte Freelancer können sich dann bei dir melden.
                    </li>
                </ul>
            </>
        ),
    },
    {
        question: "Was sind die Eigentumsrechte auf Tasko?",
        answer: (
            <>
                Als Kunde bist du in der Regel Eigentümer des Endprodukts und seiner Rechte, es sei denn,
                der Freelancer gibt auf seiner Dienstleistungsseite oder in der Projektvereinbarung explizit etwas anderes an.
                Freelancer können eine zusätzliche Vergütung für die Übertragung gewerblicher Nutzungsrechte verlangen.
            </>
        ),
    },
    {
        question: "Was ist, wenn bei meinem Auftrag etwas schief geht?",
        answer: (
            <>
                Tasko ist immer da, um sicherzustellen, dass du zufrieden bist. Solltest du mit deinem Auftrag nicht zufrieden sein,
                kannst du zunächst versuchen, das Problem direkt mit dem Freelancer zu klären.
                Sollte dies nicht funktionieren, steht dir unser Support-Team zur Verfügung, um eine Lösung zu finden.
                Du kannst dies über die Auftragsseite oder den direkten Support-Chat tun.
            </>
        ),
    },
    {
        question: "Wie kann ich Tasko als Anbieter hinzufügen?",
        answer: (
            <>
                Informationen dazu, wie du Tasko als Anbieter für deine Buchhaltung einrichten kannst (z.B. für Rechnungen von Tasko),
                findest du in unseren Hilfeartikeln oder indem du den Support kontaktierst.
            </>
        ),
    },
    {
        question: "Was sind meine Zahlungsoptionen und wie richte ich sie ein?",
        answer: (
            <>
                Tasko bietet verschiedene Zahlungsmethoden an, darunter Kreditkarten, PayPal und weitere, je nach Region.
                Du kannst deine bevorzugte Zahlungsmethode in deinen Kontoeinstellungen unter &ldquo;Zahlungsmethoden&rdquo; festlegen und verwalten.
            </>
        ),
    },
];


const FaqSection: React.FC = () => {
    return (
        <section className="py-12 md:py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                <h4 className="text-2xl sm:text-3xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-8 sm:mb-12" id="faqs">
                    Häufig gestellte Fragen (FAQs)
                </h4>
                <div>
                    {faqData.map((faq, index) => (
                        <FaqItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FaqSection;
