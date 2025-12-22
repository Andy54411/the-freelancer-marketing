'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, Home, Car, Monitor, TreePine, Hammer } from 'lucide-react';

export default function IntegrationsSection() {
  const serviceCategories = [
    {
      name: 'Handwerk',
      description: 'Professionelle Handwerker für alle Reparaturen',
      icon: Wrench,
      count: '2.500+',
    },
    {
      name: 'Haushaltsservice',
      description: 'Reinigung, Gartenpflege und mehr',
      icon: Home,
      count: '1.800+',
    },
    {
      name: 'Auto & Mobilität',
      description: 'KFZ-Service, Reparaturen und Pflege',
      icon: Car,
      count: '900+',
    },
    {
      name: 'IT & Technik',
      description: 'Computer, Software und technischer Support',
      icon: Monitor,
      count: '1.200+',
    },
    {
      name: 'Garten & Landschaft',
      description: 'Gartenpflege, Landschaftsbau und mehr',
      icon: TreePine,
      count: '800+',
    },
    {
      name: 'Renovierung',
      description: 'Umbau, Sanierung und Modernisierung',
      icon: Hammer,
      count: '1.500+',
    },
  ];

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-semibold lg:text-4xl text-gray-900">
            Unsere Service-Kategorien
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Finden Sie den passenden Dienstleister für jeden Bereich
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceCategories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true, margin: '-50px' }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border border-gray-100 shadow-sm bg-white group cursor-pointer">
                <CardContent className="p-6 text-center">
                  <motion.div
                    className="flex justify-center mb-4"
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="p-3 bg-[#14ad9f]/10 rounded-full group-hover:bg-[#14ad9f] transition-colors duration-300">
                      <category.icon className="w-8 h-8 text-[#14ad9f] group-hover:text-white transition-colors duration-300" />
                    </div>
                  </motion.div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-gray-600 mb-3">{category.description}</p>
                  <motion.div
                    className="text-sm font-medium text-[#14ad9f]"
                    whileHover={{ scale: 1.1 }}
                  >
                    {category.count} Dienstleister
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
