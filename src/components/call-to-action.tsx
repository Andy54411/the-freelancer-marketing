'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CallToAction() {
  const { t } = useLanguage();
  return (
    <section className="py-12 sm:py-16 md:py-32 bg-gradient-to-r from-[#14ad9f] to-[#0f9d84]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold lg:text-5xl">
            {t('cta.title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-teal-100">
            {t('cta.description')}
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-6 sm:px-8 py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/register/user">{t('cta.button.registerCustomer')}</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-2 border-[#14ad9f] text-[#14ad9f] bg-white hover:bg-[#14ad9f] hover:text-white font-semibold px-6 sm:px-8 py-4 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/register/company">{t('cta.button.registerProvider')}</Link>
            </Button>
          </div>

          <div className="mt-6 sm:mt-8 text-teal-100">
            <p className="text-xs sm:text-sm">{t('cta.benefits')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
