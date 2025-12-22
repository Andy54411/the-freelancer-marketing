import HeroSection from '@/components/hero-section';
import CategoryGrid from '@/components/CategoryGrid';
import FeaturesSection from '@/components/features-8';
import IntegrationsSection from '@/components/integrations-1';
import IntegrationsSection1 from '@/components/integrations-8';
import ContentSection from '@/components/content-5';
import Testimonial from '@/components/testimonials';
import CallToAction from '@/components/call-to-action';
import EmailCTA from '@/components/EmailCTA';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero mit eigenem Hintergrund */}
      <HeroSection />
      
      {/* Kategorien - weißer Hintergrund für Kontrast */}
      <div className="bg-white">
        <CategoryGrid />
      </div>
      
      {/* Features mit Teal Gradient */}
      <FeaturesSection />
      
      {/* Service-Kategorien - heller Hintergrund */}
      <div className="bg-gray-50">
        <IntegrationsSection />
      </div>
      
      {/* Stats mit Teal Gradient */}
      <IntegrationsSection1 />
      
      {/* Email CTA - Kostenlose E-Mail-Adresse */}
      <EmailCTA />
      
      {/* Content - weißer Hintergrund */}
      <div className="bg-white">
        <ContentSection />
      </div>
      
      {/* Testimonials - heller Hintergrund */}
      <div className="bg-gray-50">
        <Testimonial />
      </div>
      
      {/* CTA mit eigenem Hintergrund */}
      <CallToAction />
    </div>
  );
}
