'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function PAILogo({ 
  size = 'md', 
  className,
  variant = 'default',
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'minimal' | 'bye';
}) {
  const sizes = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };
  
  if (variant === 'bye') {
    return (
      <span className="flex items-center gap-2">
        <span className={cn('font-display font-black', sizes[size])}>
          <span className="bg-gradient-to-r from-pai-400 via-pai-500 to-pai-600 bg-clip-text text-transparent">
            PAI
          </span>
        </span>
        <span className="text-xs font-mono text-pai-400/80 uppercase tracking-wider">
          BYE
        </span>
      </span>
    );
  }
  
  if (variant === 'minimal') {
    return (
      <span className="font-display font-black" style={{ fontSize: sizes[size].match(/text-(\w+)/)?.[1] }}>
        <span className="bg-gradient-to-r from-pai-400 via-pai-500 to-pai-600 bg-clip-text text-transparent">
          PAI
        </span>
      </span>
    );
  }
  
  return (
    <span className="flex items-center gap-1.5">
      <span className="relative" style={{ fontSize: sizes[size].match(/text-(\w+)/)?.[1] }}>
        <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
          <defs>
            <linearGradient id="paiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#39ff14" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="15" stroke="url(#paiGradient)" strokeWidth="2" />
          <path d="M16 8V24M8 16H24" stroke="url(#paiGradient)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="16" r="6" fill="url(#paiGradient)" />
        </svg>
      </span>
      <span className="font-display font-black whitespace-nowrap bg-gradient-to-r from-pai-400 via-pai-500 to-pai-600 bg-clip-text text-transparent">
        PAI
      </span>
    </span>
  );
}

export default PAILogo;