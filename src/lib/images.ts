/**
 * Cloudflare R2 Image Loader
 * 
 * Provides image optimization via Cloudflare's edge network.
 * R2 has zero egress fees, making it ideal for image hosting.
 * 
 * Upload Flow (Presigned URLs):
 * 1. Server generates presigned URL
 * 2. Browser uploads directly to R2
 * 3. Zero egress costs, bypasses Vercel limits
 */

interface ImageOptions {
  width?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "png" | "jpeg";
}

/**
 * Generate optimized image URL via Cloudflare Image Resizing
 */
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptions = {}
): string {
  const { width = 800, quality = 85, format = "auto" } = options;

  // If it's already an R2/Cloudflare Images URL, use Cloudflare Image Resizing
  try {
    const resizeUrl = new URL(src);
    const host = resizeUrl.hostname.toLowerCase();
    const isR2Host = host === "r2.dev" || host.endsWith(".r2.dev");
    const isCloudflareImagesHost =
      host === "cloudflareimages.com" || host.endsWith(".cloudflareimages.com");

    if (isR2Host || isCloudflareImagesHost) {
      resizeUrl.searchParams.set("width", width.toString());
      resizeUrl.searchParams.set("quality", quality.toString());
      if (format !== "auto") {
        resizeUrl.searchParams.set("format", format);
      }
      return resizeUrl.toString();
    }
  } catch {
    // Non-absolute/invalid URL; treat as local image path.
  }

  // For local images, serve from public directory
  return src;
}

/**
 * Get presigned URL for direct browser-to-R2 upload
 * This bypasses Vercel's 4.5MB limit
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const response = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, contentType, expiresIn }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get presigned URL");
  }

  return response.json();
}

/**
 * Upload file directly to R2 using presigned URL
 * This bypasses Vercel entirely - zero egress costs
 */
export async function uploadToR2WithPresigned(
  file: File,
  key: string,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
): Promise<string> {
  const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, file.type);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(publicUrl);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed: Network error"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

/**
 * Generate R2 key for user avatar
 */
export function getAvatarKey(userId: string, extension: string = "png"): string {
  return `avatars/${userId}.${extension}`;
}

/**
 * Generate R2 key for agent avatar
 */
export function getAgentAvatarKey(agentId: string, extension: string = "png"): string {
  return `agents/${agentId}.${extension}`;
}

/**
 * Generate R2 key for stamp image
 */
export function getStampKey(stampId: string, extension: string = "png"): string {
  return `stamps/${stampId}.${extension}`;
}

/**
 * Next.js image loader for R2
 */
export default function r2ImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return getOptimizedImageUrl(src, {
    width,
    quality: quality || 85,
    format: "auto",
  });
}
