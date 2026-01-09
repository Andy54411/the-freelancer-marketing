'use client';

import * as React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';

interface GallerySliderProps {
  images: string[];
}

export function GallerySlider({ images }: GallerySliderProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  return (
    <div className="relative group">
      <Swiper
        modules={[Autoplay]}
        spaceBetween={16}
        slidesPerView={1}
        breakpoints={{
          640: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 3,
          },
        }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        loop={false}
        className="w-full"
      >
        {images.map((url, index) => (
          <SwiperSlide key={index} className="h-auto">
            <motion.div
              layoutId={`image-container-${url}`}
              onClick={() => setSelectedId(url)}
              className="aspect-video relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 select-none cursor-zoom-in"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <motion.img
                layoutId={`image-${url}`}
                src={url}
                alt={`Galeriebild ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ backgroundColor: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)' }}
            exit={{
              backgroundColor: 'rgba(0,0,0,0)',
              backdropFilter: 'blur(0px)',
              transition: { duration: 0.15 },
            }}
            className="fixed inset-0 z-9999 flex items-center justify-center p-4"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              layoutId={`image-container-${selectedId}`}
              className="relative max-w-7xl w-full max-h-[90vh] aspect-video bg-black rounded-lg overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <motion.img
                layoutId={`image-${selectedId}`}
                src={selectedId}
                alt="Enlarged view"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
