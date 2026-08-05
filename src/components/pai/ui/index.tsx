'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export function ParticleBackground({ 
  className, 
  particleCount = 50,
  colors = ['#39ff14', '#22c55e', '#16a34a'],
  connectionDistance = 150,
  mouse = 100,
  mouseInteraction = true 
}: {
  className?: string;
  particleCount?: number;
  colors?: string[];
  connectionDistance?: number;
  mouseInteraction?: boolean;
  mouse?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Initialize particles
    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    };
    
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initParticles();
    };
    
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((particle, i) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Draw connections
        particlesRef.current.slice(i + 1).forEach(other => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = particle.color;
            ctx.globalAlpha = (1 - distance / connectionDistance) * 0.1;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      
      // Attract particles to mouse
      particlesRef.current.forEach(particle => {
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          const force = (200 - distance) / 200 * 0.5;
          particle.speedX += dx / distance * force;
          particle.speedY += dy / distance * force;
          
          // Limit speed
          const maxSpeed = 2;
          const speed = Math.sqrt(particle.speedX ** 2 + particle.speedY ** 2);
          if (speed > maxSpeed) {
            particle.speedX = particle.speedX / speed * maxSpeed;
            particle.speedY = particle.speedY / speed * maxSpeed;
          }
        }
      });
    };
    
    const handleMouseLeave = () => {
      // Reset particle speeds gradually
    };
    
    // Initial setup
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [particleCount, colors, connectionDistance, mouseInteraction]);
  
  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 w-full h-full pointer-events-none -z-10', className)}
      style={{ background: 'transparent' }}
      aria-hidden="true"
    />
  );
}

// 3D Globe Visualization for Agent Network
export function AgentNetworkGlobe({ 
  className, 
  nodes = 50,
  connections = 100,
  rotationSpeed = 0.0005,
  color = '#39ff14'
}: {
  className?: string;
  nodes?: number;
  connections?: number;
  rotationSpeed?: number;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Generate nodes on sphere
    const generateNodes = () => {
      return Array.from({ length: nodes }, () => {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        return {
          phi,
          theta,
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.sin(phi) * Math.sin(theta),
          z: Math.cos(phi),
          size: Math.random() * 2 + 1,
        };
      });
    };
    
    let nodesData = generateNodes();
    let rotationX = 0;
    rotationX = 0;
    let rotationY = 0;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    
    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;
      
      // Rotate
      rotationY += rotationSpeed;
      
      // Project 3D to 2D
      const projected = nodesData.map(node => {
        const cosY = Math.cos(rotationY);
        const sinY = Math.sin(rotationY);
        const cosX = Math.cos(rotationX);
        const sinX = Math.sin(rotationX);
        
        // Rotate around Y
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;
        
        // Rotate around X
        const y1 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;
        
        // Project
        const scale = radius / (radius + z2 * radius * 0.5);
        return {
          x: centerX + x1 * radius * scale,
          y: centerY + y1 * radius * scale,
          z: z2,
          size: node.size * scale,
          opacity: Math.max(0.1, (1 + z2) * 0.5),
        };
      });
      
      // Draw connections
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      
      for (let i = 0; i < connections; i++) {
        const a = Math.floor(Math.random() * nodes);
        const b = Math.floor(Math.random() * nodes);
        if (a === b) continue;
        
        const pa = projected[a];
        const pb = projected[b];
        
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.globalAlpha = Math.min(pa.opacity, pb.opacity) * 0.05;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      
      // Draw nodes
      projected.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, node.size), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = node.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      
      requestAnimationFrame(animate);
    };
    
    const handleResize = () => {
      resize();
    };
    
    resize();
    window.addEventListener('resize', handleResize);
    animate();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, connections, rotationSpeed, color]);
  
  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-full', className)}
      style={{ background: 'transparent' }}
      aria-hidden="true"
    />
  );
}

// Magnetic Button Effect
export function MagneticButton({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPosition({ x: x * 0.3, y: y * 0.3 });
  };
  
  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };
  
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-xl px-8 py-4 font-medium transition-all duration-300',
        'bg-pai-500 text-white hover:bg-pai-600',
        'focus:outline-none focus:ring-2 focus:ring-pai-500 focus:ring-offset-2 focus:ring-offset-dark-950',
        'active:scale-[0.98]',
        className
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-pai-400 via-pai-500 to-pai-600 opacity-0 hover:opacity-100 transition-opacity duration-300" />
    </button>
  );
}

// Scroll Progress Indicator
export function ScrollProgress({ className }: { className?: string }) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollTop / docHeight);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className={cn('fixed top-0 left-0 h-1 z-50 bg-dark-800', className)}>
      <div
        className="h-full bg-gradient-to-r from-pai-400 via-pai-500 to-pai-600"
        style={{ width: `${progress * 100}%` }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

// Floating Action Button
export function FloatingActionButton({
  children,
  onClick,
  className,
  tooltip,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  tooltip?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={cn('fixed bottom-8 right-8 z-50', className)}>
      {tooltip && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : 20 }}
          className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-2 bg-dark-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
        >
          {tooltip}
        </motion.div>
      )}
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
          onClick?.(e);
        }}
        className={cn(
          'fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full',
          'bg-gradient-to-br from-pai-400 via-pai-500 to-pai-600',
          'text-white shadow-lg shadow-pai-500/30',
          'flex items-center justify-center',
          'hover:scale-110 hover:shadow-xl hover:shadow-pai-500/40',
          'transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-pai-500 focus:ring-offset-2 focus:ring-offset-dark-950',
          'active:scale-95',
          className
        )}
        {...props}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 200 }}
          className="w-6 h-6 flex items-center justify-center"
        >
          {children}
        </motion.div>
      </button>
    </div>
  );
}

// Typewriter Effect
export function Typewriter({
  text,
  speed = 50,
  className,
  onComplete,
}: {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  
  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, index + 1));
        setIndex(index + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, speed, onComplete]);
  
  return (
    <span className={cn('font-mono', className)}>
      {displayText}
      {index < text.length && <span className="relative" style={{ animation: 'blink 1s infinite' }}>\|</span>}
    </span>
  );
}

// Counter Animation
export function Counter({
  from = 0,
  to,
  duration = 2000,
  className,
  suffix = '',
  prefix = '',
  decimals = 0,
}: {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const [count, setCount] = useState(from);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = from + (to - from) * eased;
      setCount(current);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [from, to, duration]);
  
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {prefix}
      {count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      {suffix}
    </span>
  );
}

// Reveal on Scroll
export function Reveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay, once]);
  
  const directionStyles = {
    up: 'translateY(30px)',
    down: 'translateY(-30px)',
    left: 'translateX(30px)',
    right: 'translateX(-30px)',
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible
          ? 'opacity-100 translate-x-0 translate-y-0'
          : `opacity-0 ${directionStyles[direction]}`,
        className
      )}
    >
      {children}
    </div>
  );
}

// Staggered Reveal Container
export function StaggerContainer({
  children,
  className,
  stagger = 0.1,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col', className)} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div
            key={child.key || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * stagger }}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}

// Gradient Text
export function GradientText({
  children,
  className,
  gradient = 'from-pai-400 via-pai-500 to-pai-600',
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}) {
  return (
    <span className={cn('bg-gradient-to-r bg-clip-text text-transparent', gradient, className)}>
      {children}
    </span>
  );
}

// Shimmer Text
export function ShimmerText({
  children,
  className,
  color = 'white',
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span className={cn('relative inline-block bg-clip-text', color === 'white' ? 'text-transparent' : '', className)}>
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </span>
  );
}

// Logo Component
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
      <span className={cn('flex items-center gap-2', className)}>
        <span className={cn('font-display font-black', sizes[size])}>
          <GradientText gradient="from-pai-400 via-pai-500 to-pai-600">
            PAI
          </GradientText>
        </span>
        <span className="text-xs font-mono text-pai-400/80 uppercase tracking-wider">
          BYE
        </span>
      </span>
    );
  }
  
  if (variant === 'minimal') {
    return (
      <GradientText gradient="from-pai-400 via-pai-500 to-pai-600" className={cn('font-display font-black', sizes[size], className)}>
        PAI
      </GradientText>
    );
  }
  
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('relative', sizes[size])}>
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
      <GradientText gradient="from-pai-400 via-pai-500 to-pai-600" className="font-display font-black whitespace-nowrap">
        PAI
      </GradientText>
    </span>
  );
}

export { cn } from '@/lib/utils';