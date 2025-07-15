'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ComingSoonBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="bg-gradient-to-r from-[#14ad9f] to-teal-600 text-white py-3 px-4 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="font-medium text-sm md:text-base">Bald verfügbar</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/coming-soon">
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm"
              >
                Mehr erfahren
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
