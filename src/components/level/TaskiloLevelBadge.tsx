'use client';

import React from 'react';
import { Award, Star, Crown, User } from 'lucide-react';
import { type TaskiloLevel, LEVEL_DETAILS } from '@/services/TaskiloLevelService';

interface TaskiloLevelBadgeProps {
  level: TaskiloLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Badge-Komponente zur Anzeige des Taskilo Seller Levels
 */
export function TaskiloLevelBadge({ 
  level, 
  size = 'md', 
  showLabel = true,
  className = '' 
}: TaskiloLevelBadgeProps) {
  const details = LEVEL_DETAILS[level];
  
  // Icon basierend auf Level
  const IconComponent = {
    new: User,
    level1: Award,
    level2: Star,
    top_rated: Crown,
  }[level];
  
  // Größen-Konfiguration
  const sizeConfig = {
    sm: {
      container: 'px-1.5 py-0.5 gap-1',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-2 py-1 gap-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      container: 'px-3 py-1.5 gap-2',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };
  
  const config = sizeConfig[size];
  
  return (
    <span 
      className={`
        inline-flex items-center rounded-full font-medium
        ${details.bgColor} ${details.color} border ${details.borderColor}
        ${config.container}
        ${className}
      `}
      title={details.description}
    >
      <IconComponent className={config.icon} />
      {showLabel && (
        <span className={config.text}>{details.nameShort}</span>
      )}
    </span>
  );
}

/**
 * Kompakte Version nur mit Icon für ProviderCards
 */
export function TaskiloLevelIcon({ 
  level, 
  size = 'sm',
  className = '' 
}: Omit<TaskiloLevelBadgeProps, 'showLabel'>) {
  const details = LEVEL_DETAILS[level];
  
  const IconComponent = {
    new: User,
    level1: Award,
    level2: Star,
    top_rated: Crown,
  }[level];
  
  const sizeConfig = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  // Nur für Level 1+ anzeigen
  if (level === 'new') {
    return null;
  }
  
  return (
    <span 
      className={`
        inline-flex items-center justify-center rounded-full p-1
        ${details.bgColor} ${details.color} border ${details.borderColor}
        ${className}
      `}
      title={details.name}
    >
      <IconComponent className={sizeConfig[size]} />
    </span>
  );
}

/**
 * Top Rated Badge mit Gold-Styling
 */
export function TopRatedBadge({ className = '' }: { className?: string }) {
  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        bg-linear-to-r from-amber-100 to-yellow-100
        text-amber-700 border border-amber-300
        font-semibold text-sm shadow-sm
        ${className}
      `}
    >
      <Crown className="w-4 h-4" />
      <span>Top Rated</span>
    </span>
  );
}

export default TaskiloLevelBadge;
