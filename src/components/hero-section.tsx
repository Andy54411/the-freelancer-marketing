'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { HeroHeader } from '@/components/hero8-header'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden">
        <section>
          <div className="pb-24 pt-12 md:pb-32 lg:pb-56 lg:pt-44">
            <div className="relative mx-auto max-w-6xl px-6 flex flex-col-reverse items-center gap-10 lg:flex-row lg:items-center">
              <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">
                <h1 className="text-3xl font-semibold leading-snug tracking-tight md:text-4xl xl:text-5xl">
                  <span className="block">Finde verlässliche Hilfe</span>
                  <span className="block">für jedes Projekt –</span>
                  <span className="block">
                    schnell, einfach, <span className="text-[#14ad9f]">Tasko</span>
                  </span>
                </h1>

                <p className="mt-8 max-w-2xl text-pretty text-lg">
                  Tasko bringt Kunden und Dienstleister wie Handwerker & Mietköche schnell und zuverlässig über App & Web zusammen – einfach buchen & starten!
                </p>

                <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
                  <Button asChild size="lg" className="px-5 text-base bg-[#14ad9f] text-white hover:bg-teal-700">
                    <Link href="/auftrag/get-started">
                      <span className="text-nowrap">Ich suche Hilfe</span>
                    </Link>
                  </Button>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="px-5 text-base"
                  >
                    <Link href="#link">
                      <span className="text-nowrap">Ich biete Hilfe an</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Bild im eigenen div */}
              <div className="w-full max-w-xl lg:w-1/2">
                <Image
                  className="h-auto w-full object-contain"
                  src="/images/AdobeStock_163577338.jpeg"
                  alt="Tasko Hero"
                  width={1200}
                  height={800}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background pb-16 md:pb-32">
          <div className="group relative m-auto max-w-6xl px-6">
            <div className="flex flex-col items-center md:flex-row">
              <div className="md:max-w-44 md:border-r md:pr-6">
                <p className="text-end text-sm">unsere neuen Tasker</p>
              </div>
              <div className="relative py-6 md:w-[calc(100%-11rem)]">
                <InfiniteSlider speedOnHover={20} speed={40} gap={112}>
                  {[
                    'nvidia',
                    'column',
                    'github',
                    'nike',
                    'lemonsqueezy',
                    'laravel',
                    'lilly',
                    'openai',
                  ].map((brand) => (
                    <div key={brand} className="flex">
                      <Image
                        className="mx-auto h-6 w-fit dark:invert"
                        src={`https://html.tailus.io/blocks/customers/${brand}.svg`}
                        alt={`${brand} Logo`}
                        height={24}
                        width={100} // Provide an estimated width, or adjust based on actual SVG sizes
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  ))}
                </InfiniteSlider>

                <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>

                <ProgressiveBlur
                  className="pointer-events-none absolute left-0 top-0 h-full w-20"
                  direction="left"
                  blurIntensity={1}
                />
                <ProgressiveBlur
                  className="pointer-events-none absolute right-0 top-0 h-full w-20"
                  direction="right"
                  blurIntensity={1}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
