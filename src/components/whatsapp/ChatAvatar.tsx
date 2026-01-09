'use client';

interface ChatAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const colors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
];

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function ChatAvatar({ name, size = 'md' }: ChatAvatarProps) {
  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-medium shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

// Agent Avatar für Mitarbeiter
export function AgentAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const sizes = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
  };

  return (
    <div
      className={`${sizes[size]} bg-blue-500 rounded-full flex items-center justify-center text-white font-medium shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
