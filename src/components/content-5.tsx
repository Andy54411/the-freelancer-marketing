import * as React from "react"
import Image from "next/image"

export default function ContentSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
        <div className="mx-auto max-w-xl space-y-6 text-center md:space-y-12">
          <h2 className="text-balance text-4xl font-medium lg:text-5xl">
            The Lyra ecosystem brings together our models, products and platforms.
          </h2>
          <p>
            Lyra is evolving to be more than just the models. It supports an entire ecosystem — from products to the APIs and platforms helping developers and businesses innovate.
          </p>
        </div>

        <Image
          className="rounded-[--radius] grayscale"
          src="https://images.unsplash.com/photo-1616587226960-4a03badbe8bf?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="team image"
          width={2940} // Intrinsic width of the image
          height={1960} // Intrinsic height of the image (estimate based on common aspect ratios, adjust if known)
        />

        <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
          <Feature title="Faaast" icon={ZapIcon()} description="It supports an entire helping developers and innovate." />
          <Feature title="Powerful" icon={CpuIcon()} description="It supports an entire helping developers and businesses." />
          <Feature title="Security" icon={ShieldIcon()} description="It supports an helping developers businesses innovate." />
          <Feature title="AI Powered" icon={SparklesIcon()} description="It supports an helping developers businesses innovate." />
        </div>
      </div>
    </section>
  )
}

function Feature({ title, icon, description }: { title: string; icon: React.ReactNode; description: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

// SVG Icons (inline)
function ZapIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M13 2L3 14h9l-1 8L21 10h-9l1-8z" />
    </svg>
  )
}

function CpuIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v2M15 1v2M9 21v2M15 21v2M1 9h2M1 15h2M21 9h2M21 15h2" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M5 3v4M3 5h4M19 21v-4M21 19h-4M12 8l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4z" />
    </svg>
  )
}
