import HeroSection from '@/components/hero-section';
import CategoryGrid from '@/components/CategoryGrid';
import FeaturesSection from '@/components/features-8';
import IntegrationsSection from '@/components/integrations-1';
import IntegrationsSection1 from '@/components/integrations-8';
import ContentSection from '@/components/content-5';
import Testimonial from '@/components/testimonials';
import CallToAction from '@/components/call-to-action';
import ComingSoonBanner from '@/components/ComingSoonBanner';

export default function Home() {
  return (
    <div>
      <ComingSoonBanner />
      <HeroSection />
      <CategoryGrid />
      <FeaturesSection />
      <IntegrationsSection />
      <IntegrationsSection1 />
      <ContentSection />
      <Testimonial />
      <CallToAction />
    </div>
  );
}
