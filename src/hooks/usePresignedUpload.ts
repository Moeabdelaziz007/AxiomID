"use client";

import { useState, useCallback } from "react";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UsePresignedUploadOptions {
  contentType: string;
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

interface UsePresignedUploadReturn {
  upload: (file: File) => Promise<string | null>;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  reset: () => void;
}

export function usePresignedUpload({
  contentType,
  folder = "uploads",
  onProgress,
  onSuccess,
  onError,
}: UsePresignedUploadOptions): UsePresignedUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });
    setError(null);

    try {
      // Step 1: Get presigned URL from server
      const key = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, contentType }),
      });

      if (!presignRes.ok) {
        const errorData = await presignRes.json();
        throw new Error(errorData.message || "Failed to get upload URL");
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      // Step 2: Upload directly to R2 (bypasses Vercel)
      const uploadRes = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progressData = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            setProgress(progressData);
            onProgress?.(progressData);
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
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
      });

      onSuccess?.(uploadRes);
      return uploadRes;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [contentType, folder, onProgress, onSuccess, onError]);

  return { upload, isUploading, progress, error, reset };
}

// Helper hook for avatar uploads
export function useAvatarUpload(userId: string) {
  return usePresignedUpload({
    contentType: "image/png",
    folder: `avatars/${userId}`,
  });
}

// Helper hook for agent avatar uploads
export function useAgentAvatarUpload(agentId: string) {
  return usePresignedUpload({
    contentType: "image/png",
    folder: `agents/${agentId}`,
  });
}

// Helper hook for stamp image uploads
export function useStampImageUpload(stampId: string) {
  return usePresignedUpload({
    contentType: "image/png",
    folder: `stamps/${stampId}`,
  });
}
