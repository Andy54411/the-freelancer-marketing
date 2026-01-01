'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Heart, Video, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface Provider {
  id: string;
  companyName?: string;
  userName?: string;
  profilePictureURL?: string;
  profilePictureFirebaseUrl?: string;
  photoURL?: string;
  profileBannerImage?: string;
  profileVideoURL?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  rating?: number;
  reviewCount?: number;
  completedJobs?: number;
  isCompany?: boolean;
  hourlyRate?: number;
  responseTime?: string;
  adminApproved?: boolean;
  availabilityType?: string;
  level?: number;
  isTopRated?: boolean;
  offersVideoConsultation?: boolean;
}

interface ProviderCardProps {
  provider: Provider;
  onBookClick?: (provider: Provider) => void;
  onFavoriteClick?: (provider: Provider) => void;
  isFavorite?: boolean;
}

export default function ProviderCard({ provider, onFavoriteClick, isFavorite = false }: ProviderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(isFavorite);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const displayName = provider.companyName || provider.userName || 'Anbieter';
  const imageUrl = provider.profilePictureURL || provider.profilePictureFirebaseUrl || provider.photoURL;
  const bannerUrl = provider.profileBannerImage;
  const videoUrl = provider.profileVideoURL;
  const level = provider.level || 1;
  const isTopRated = provider.isTopRated;
  const offersVideoConsultation = provider.offersVideoConsultation;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalFavorite(!localFavorite);
    if (onFavoriteClick) {
      onFavoriteClick(provider);
    }
  };

  const handleVideoPlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Auto-play video on hover (muted)
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, user needs to click
      });
      setIsVideoPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Pause video on mouse leave
    if (videoRef.current && videoUrl) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsVideoPlaying(false);
    }
  };

  // Level Badge Komponente
  const LevelBadge = () => {
    if (isTopRated) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          Top Rated
          <span className="text-amber-500">{'+'}</span>
        </span>
      );
    }
    
    if (level >= 2) {
      return (
        <span className="text-xs text-gray-500">
          Level {level} <span className="text-teal-500">{'◆'.repeat(level)}</span>
        </span>
      );
    }
    
    return null;
  };

  return (
    <Link 
      href={`/profile/${provider.id}`}
      className="group block bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Banner/Video Section - Fiverr Style */}
      <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
        {/* Video (priority if available) */}
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              muted={isMuted}
              loop
              playsInline
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`}
              poster={bannerUrl}
            />
            
            {/* Video Controls Overlay */}
            <div className={`absolute inset-0 bg-black/20 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              {/* Play/Pause Button */}
              <button
                onClick={handleVideoPlayPause}
                className="absolute bottom-3 left-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              >
                {isVideoPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-white" />
                )}
              </button>
              
              {/* Mute/Unmute Button */}
              <button
                onClick={handleMuteToggle}
                className="absolute bottom-3 left-12 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* Video Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-white text-xs">
              <Video className="w-3 h-3" />
              <span>Video</span>
            </div>
          </>
        ) : bannerUrl ? (
          <Image
            src={bannerUrl}
            alt={displayName}
            fill
            className={`object-cover transition-transform duration-300 ${isHovered ? 'scale-105' : ''}`}
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Favorite Heart Button - Fiverr Style (immer sichtbar) */}
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
            localFavorite 
              ? 'bg-white text-red-500' 
              : 'bg-white/80 text-gray-400 hover:text-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${localFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Carousel Dots (optional, für später) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>

      {/* Content Section - Fiverr Style */}
      <div className="p-3">
        {/* Seller Info Row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Profile Picture */}
          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={displayName}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Name */}
          <span className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </span>
          
          {/* Level Badge */}
          <LevelBadge />
        </div>

        {/* Service Description - Als Link (blau bei hover) */}
        <p className={`text-sm leading-snug mb-3 line-clamp-2 transition-colors ${
          isHovered ? 'text-teal-600' : 'text-gray-700'
        }`}>
          {provider.bio || `Professionelle Dienstleistungen im Bereich ${provider.selectedSubcategory || 'Service'}`}
        </p>

        {/* Rating */}
        {(provider.rating ?? 0) > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-gray-900 text-gray-900" />
            <span className="text-sm font-bold text-gray-900">{provider.rating?.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({provider.reviewCount ? provider.reviewCount >= 1000 ? `${(provider.reviewCount / 1000).toFixed(0)}k+` : provider.reviewCount : 0})</span>
          </div>
        )}

        {/* Price - Fiverr Style */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 uppercase">ab</span>
            <span className="text-lg font-bold text-gray-900">
              {provider.hourlyRate ? `€${provider.hourlyRate}` : 'Auf Anfrage'}
            </span>
          </div>
        </div>

        {/* Video Consultation Badge (optional) */}
        {offersVideoConsultation && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
            <Video className="w-3.5 h-3.5" />
            <span>Bietet Video-Beratung an</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// Skeleton Loader - Fiverr Style
export function ProviderCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden animate-pulse">
      {/* Banner */}
      <div className="aspect-4/3 bg-gray-200" />
      
      {/* Content */}
      <div className="p-3">
        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        
        {/* Description */}
        <div className="h-4 bg-gray-200 rounded w-full mb-1" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
        
        {/* Price */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 rounded w-8" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
