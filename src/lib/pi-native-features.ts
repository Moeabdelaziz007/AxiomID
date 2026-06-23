/**
 * Pi Browser Native Feature wrappers.
 *
 * Each function checks for Pi Browser + nativeFeature availability before
 * calling the native API, and falls back to Web APIs (navigator.share,
 * navigator.clipboard) when running outside Pi Browser.
 */

import { logger } from "@/lib/logger";

/**
 * Open Pi Browser's native share dialog.
 *
 * Falls back to navigator.share → clipboard copy when not in Pi Browser.
 */
export async function sharePassport(data: {
  title: string;
  text: string;
  url: string;
}): Promise<void> {
  if (typeof window === "undefined") return;

  const pi = window.Pi;
  if (pi?.nativeFeature?.openShareDialog) {
    try {
      await pi.nativeFeature.openShareDialog(data);
      return;
    } catch (err) {
      logger.warn("[Pi Native] openShareDialog failed, falling back:", err);
    }
  }

  // Fallback: Web Share API → clipboard
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share(data);
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(data.url);
  }
}

/**
 * Open Pi Browser's native KYC consent dialog.
 *
 * Returns the consent result, or `null` if not in Pi Browser (caller
 * should treat `null` as "consent not obtained via native dialog" and
 * proceed with whatever fallback flow they have).
 */
export async function requestKycConsent(data: {
  header: string;
  description: string;
  consentItems: { label: string; value: boolean }[];
}): Promise<Record<string, boolean> | null> {
  if (typeof window === "undefined") return null;

  const pi = window.Pi;
  if (pi?.nativeFeature?.openConsentDialog) {
    try {
      const result = await pi.nativeFeature.openConsentDialog(data);
      return result.consentResult;
    } catch (err) {
      logger.warn("[Pi Native] openConsentDialog failed:", err);
      return null;
    }
  }

  // No native dialog available — caller handles fallback
  return null;
}
