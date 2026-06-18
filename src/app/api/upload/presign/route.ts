import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitHeaders } from '@/lib/errors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/ip';
import { requireAuth } from '@/lib/auth-middleware';

/**
 * Generate a presigned URL for direct browser-to-R2 upload.
 * 
 * This bypasses Vercel's 4.5MB payload limit by:
 * 1. Server generates a temporary presigned URL
 * 2. Browser uploads directly to R2
 * 3. Zero egress costs from Cloudflare R2
 */

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'axomid-images';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

interface PresignedUrlRequest {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

function hmacSha256(key: string | ArrayBuffer, message: string | ArrayBuffer): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = typeof key === 'string' ? encoder.encode(key) : new Uint8Array(key);
  const messageData = typeof message === 'string' ? encoder.encode(message) : new Uint8Array(message);
  
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(cryptoKey => crypto.subtle.sign('HMAC', cryptoKey, messageData));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generatePresignedUrl(
  key: string,
  method: string,
  contentType: string,
  expires: number
): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }

  const host = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  
  // ISO 8601 format for AWS Signature
  const dateStamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  
  // Canonical request
  const canonicalUri = `/${key}`;
  const canonicalQueryString = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${R2_ACCESS_KEY_ID}%2F${dateStamp}%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=${amzDate}&X-Amz-Expires=${expires}&X-Amz-SignedHeaders=content-type%3Bhost`;
  
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');
  
  // String to sign
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalRequestHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest))
    .then(buf => toHex(buf));
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');
  
  // Signing key
  const kDate = await hmacSha256(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  // Signature
  const signature = await hmacSha256(kSigning, stringToSign).then(toHex);
  
  // Final URL
  const baseUrl = `https://${host}/${key}`;
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${R2_ACCESS_KEY_ID}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expires.toString(),
    'X-Amz-SignedHeaders': signedHeaders,
    'X-Amz-Signature': signature,
  });
  
  return `${baseUrl}?${params.toString()}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`r2-upload:${ip}`, RATE_LIMITS.authenticated);
  if (!rateLimit.allowed) {
    return apiError('RATE_LIMITED', 'Too many upload requests. Try again later.', undefined, rateLimitHeaders(rateLimit));
  }

  const auth = await requireAuth(request);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  const { key, contentType, expiresIn = 3600 } = body as PresignedUrlRequest;

  if (!key || !contentType) {
    return apiError('VALIDATION_ERROR', 'key and contentType are required');
  }

  // Validate key format (prevent directory traversal)
  if (key.includes('..') || key.startsWith('/')) {
    return apiError('VALIDATION_ERROR', 'Invalid key format');
  }

  // Validate content type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];
  if (!allowedTypes.includes(contentType)) {
    return apiError('VALIDATION_ERROR', `Invalid content type. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Limit file size (10MB max)
  if (expiresIn > 86400) {
    return apiError('VALIDATION_ERROR', 'Expiration cannot exceed 24 hours');
  }

  try {
    const presignedUrl = await generatePresignedUrl(key, 'PUT', contentType, expiresIn);
    const publicUrl = R2_PUBLIC_DOMAIN 
      ? `${R2_PUBLIC_DOMAIN}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`;

    return apiSuccess({
      uploadUrl: presignedUrl,
      publicUrl,
      key,
      expiresIn,
    });
  } catch (error) {
    logger.error('[R2-PRESIGN] Error generating presigned URL:', error);
    return apiError('INTERNAL_ERROR', 'Failed to generate upload URL');
  }
}
