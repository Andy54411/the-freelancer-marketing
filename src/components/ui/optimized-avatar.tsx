'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
  fallbackSrc?: string;
  fill?: boolean;
  priority?: boolean;
}

export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className = '',
  fallbackSrc = '/images/default-avatar.jpg',
  fill = false,
  priority = false,
}: OptimizedAvatarProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  const handleError = () => {
    setImgSrc(fallbackSrc);
  };

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={className}
        onError={handleError}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={handleError}
      priority={priority}
      sizes={`${size}px`}
    />
  );
}
