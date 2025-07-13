import { Card, CardContent } from '@/components/ui/card'
import { Wrench, Home, Car, Monitor, TreePine, Hammer } from 'lucide-react'

export default function IntegrationsSection() {
  const serviceCategories = [
    {
      name: 'Handwerk',
      description: 'Professionelle Handwerker für alle Reparaturen',
      icon: Wrench,
      count: '2.500+'
    },
    {
      name: 'Haushaltsservice',
      description: 'Reinigung, Gartenpflege und mehr',
      icon: Home,
      count: '1.800+'
    },
    {
      name: 'Auto & Mobilität',
      description: 'KFZ-Service, Reparaturen und Pflege',
      icon: Car,
      count: '900+'
    },
    {
      name: 'IT & Technik',
      description: 'Computer, Software und technischer Support',
      icon: Monitor,
      count: '1.200+'
    },
    {
      name: 'Garten & Landschaft',
      description: 'Gartenpflege, Landschaftsbau und mehr',
      icon: TreePine,
      count: '800+'
    },
    {
      name: 'Renovierung',
      description: 'Umbau, Sanierung und Modernisierung',
      icon: Hammer,
      count: '1.500+'
    }
  ]

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold lg:text-4xl text-gray-900">
            Unsere Service-Kategorien
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Finden Sie den passenden Dienstleister für jeden Bereich
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCategories.map((category) => (
            <Card key={category.name} className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm bg-white">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-[#14ad9f]/10 rounded-full">
                    <category.icon className="w-8 h-8 text-[#14ad9f]" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-3">
                  {category.description}
                </p>
                <div className="text-sm font-medium text-[#14ad9f]">
                  {category.count} Dienstleister
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
