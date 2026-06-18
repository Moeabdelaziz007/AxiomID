/**
 * Cloudflare R2 Image Loader
 * 
 * Provides image optimization via Cloudflare's edge network.
 * R2 has zero egress fees, making it ideal for image hosting.
 */

interface ImageOptions {
  width?: number;
  quality?: number;
  format?: "auto" | "webp" | "avif" | "png" | "jpeg";
}

interface R2Config {
  accountId: string;
  bucketName: string;
  publicDomain?: string;
}

const DEFAULT_CONFIG: R2Config = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  bucketName: process.env.R2_BUCKET_NAME || "axomid-images",
  publicDomain: process.env.R2_PUBLIC_DOMAIN || "",
};

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
 * Upload image to R2 bucket
 */
export async function uploadToR2(
  file: File | Buffer,
  key: string,
  contentType: string = "image/png"
): Promise<string> {
  const config = DEFAULT_CONFIG;
  
  if (!config.accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID not configured");
  }

  const url = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;
  
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.statusText}`);
  }

  return `${config.publicDomain || `https://${config.bucketName}.${config.accountId}.r2.dev`}/${key}`;
}

/**
 * Delete image from R2 bucket
 */
export async function deleteFromR2(key: string): Promise<void> {
  const config = DEFAULT_CONFIG;
  
  if (!config.accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID not configured");
  }

  const url = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;
  
  const response = await fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`R2 delete failed: ${response.statusText}`);
  }
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
