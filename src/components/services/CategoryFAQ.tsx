'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ } from '@/lib/categoryFaqs';

interface CategoryFAQProps {
  categoryTitle: string;
  faqs: FAQ[];
}

export function CategoryFAQ({ categoryTitle, faqs }: CategoryFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (!faqs || faqs.length === 0) {
    return null;
  }

  // JSON-LD Schema für SEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="py-16 bg-gray-50">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-4xl mx-auto px-6">
        {/* Überschrift */}
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          {categoryTitle} FAQs
        </h2>

        {/* FAQ Akkordeon */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <article
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
            >
              {/* Frage (Header) */}
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:ring-inset"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span className="text-base font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Antwort (Content) */}
              <div
                id={`faq-answer-${index}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-5 pt-0">
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Zusätzlicher CTA */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            Haben Sie weitere Fragen? Unser{' '}
            <a
              href="/kontakt"
              className="text-[#14ad9f] hover:text-teal-700 font-medium transition-colors"
            >
              Support-Team
            </a>{' '}
            hilft Ihnen gerne weiter.
          </p>
        </div>
      </div>
    </section>
  );
}
