"use client";

import Image from "next/image";
import { useState, ImgHTMLAttributes } from "react";
import { getOptimizedImageUrl } from "@/lib/images";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "png" | "jpeg";
  fallbackSrc?: string;
  showLoading?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

export function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  quality = 85,
  format = "auto",
  fallbackSrc = "/placeholder.png",
  showLoading = true,
  objectFit = "cover",
  className = "",
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = getOptimizedImageUrl(src, { width, quality, format });
  const errorSrc = getOptimizedImageUrl(fallbackSrc, { width, quality: 80 });

  // Filter out props that are explicitly set on Image to avoid duplicates
  const { src: _src, alt: _alt, width: _width, height: _height, ...restProps } = props as Record<string, unknown>;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {showLoading && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)] animate-pulse">
          <div className="w-8 h-8 border-2 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={hasError ? errorSrc : optimizedSrc}
        alt={alt}
        width={width}
        height={height || width * 0.75}
        loading="lazy"
        placeholder="blur"
        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        style={{ objectFit }}
        {...restProps}
      />
    </div>
  );
}

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export function Avatar({
  src,
  alt,
  size = "md",
  fallback,
  className = "",
}: AvatarProps) {
  const sizePx = SIZE_MAP[size];
  const initials = fallback || alt.charAt(0).toUpperCase();

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-axiom-purple/20 text-axiom-purple font-bold ${className}`}
        style={{ width: sizePx, height: sizePx, fontSize: sizePx * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizePx}
      height={sizePx}
      className={`rounded-full ${className}`}
      objectFit="cover"
      showLoading={false}
    />
  );
}

interface BannerProps {
  src?: string | null;
  alt: string;
  height?: number;
  className?: string;
}

export function Banner({
  src,
  alt,
  height = 200,
  className = "",
}: BannerProps) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ height }}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={1200}
          height={height}
          objectFit="cover"
          className="w-full h-full"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-axiom-purple/20 to-electric-blue/20" />
      )}
    </div>
  );
}
