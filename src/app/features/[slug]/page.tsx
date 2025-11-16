'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import { ArrowLeft, CheckCircle, Star, Users, Clock, Shield } from 'lucide-react';
import { notFound } from 'next/navigation';
import { allFeatureDetails } from '@/data/feature-details';

export default function FeatureDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const feature = allFeatureDetails[slug];

  if (!feature) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        {/* Navigation Header */}
        <HeroHeader />

        {/* Back Navigation */}
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <Link
              href="/features"
              className="inline-flex items-center text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu allen Features
            </Link>
          </div>
        </section>

        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
              {feature.category}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              {feature.title}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto drop-shadow-md">
              {feature.subtitle}
            </p>
            <p className="text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
              {feature.description}
            </p>
          </div>
        </section>

        {/* Stats Section */}
        {feature.stats && (
          <section className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {feature.stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                      {stat.value}
                    </div>
                    <div className="text-white/80 text-lg">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Benefits Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Benefits */}
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900 flex items-center">
                    <CheckCircle className="w-6 h-6 text-[#14ad9f] mr-3" />
                    Ihre Vorteile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-[#14ad9f] mr-3 mt-0.5 shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Use Cases */}
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900 flex items-center">
                    <Users className="w-6 h-6 text-[#14ad9f] mr-3" />
                    Anwendungsfälle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {feature.useCases.map((useCase, index) => (
                      <li key={index} className="flex items-start">
                        <Star className="w-5 h-5 text-[#14ad9f] mr-3 mt-0.5 shrink-0" />
                        <span className="text-gray-700">{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-lg">
                So funktioniert es
              </h2>
              <p className="text-xl text-white/80">Schritt für Schritt zu Ihrem Erfolg</p>
            </div>

            <div className="grid gap-6">
              {feature.howItWorks.map((step, index) => (
                <Card key={index} className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="shrink-0 w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 text-lg">{step}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 drop-shadow-lg">
              Bereit loszulegen?
            </h2>
            <p className="text-xl text-white/80 mb-12">
              Erleben Sie {feature.title} selbst und überzeugen Sie sich von den Vorteilen.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-3 shadow-lg border-2 border-white"
              >
                <Link href={feature.callToAction.primary.href}>
                  {feature.callToAction.primary.text}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-3 shadow-lg bg-transparent"
              >
                <Link href={feature.callToAction.secondary.href}>
                  {feature.callToAction.secondary.text}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
