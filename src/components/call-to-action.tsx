import { Button } from '@/components/ui/button'

export default function CallToAction() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-4xl font-semibold lg:text-5xl">Start Building</h2>
          <p className="mt-4">Libero sapiente aliquam quibusdam aspernatur.</p>

          <form className="mx-auto mt-10 max-w-sm lg:mt-12">
            <div className="relative grid grid-cols-[1fr_auto] items-center rounded-lg border pr-3 shadow-md bg-white">
              
              {/* Eingebautes Mail Icon */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16v16H4z" strokeWidth="2" />
                  <path d="M4 4l8 8 8-8" strokeWidth="2" />
                </svg>
              </div>

              <input
                placeholder="Your mail address"
                className="h-14 w-full rounded-l-lg pl-12 pr-4 bg-transparent text-black focus:outline-none"
                type="email"
              />

              <Button type="submit" aria-label="submit" className="rounded-r-lg bg-[#14ad9f] hover:bg-[#0f9d84] text-white">
                {/* Eingebautes Send Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M22 2L11 13" strokeWidth="2" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeWidth="2" />
                </svg>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
