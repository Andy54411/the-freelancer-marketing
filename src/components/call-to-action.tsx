import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CallToAction() {
  return (
    <section className="py-16 md:py-32 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center text-white">
          <h2 className="text-4xl font-semibold lg:text-5xl">Bereit für Taskilo?</h2>
          <p className="mt-4 text-xl text-blue-100">
            Starten Sie noch heute und finden Sie den perfekten Dienstleister für Ihr nächstes Projekt.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 text-lg"
            >
              <Link href="/register/user">Als Kunde registrieren</Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-4 text-lg"
            >
              <Link href="/register/company">Als Dienstleister anmelden</Link>
            </Button>
          </div>

          <div className="mt-8 text-blue-100">
            <p className="text-sm">
              ✓ Kostenlose Registrierung • ✓ Sofort einsatzbereit • ✓ Keine versteckten Kosten
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
