export {};

type AnyFn = (...args: unknown[]) => void;

declare global {
  interface PiUser {
    uid: string;
    username: string;
    name?: string;
    stellarAddress?: string;
  }

  interface PiAuthResult {
    accessToken: string;
    user: PiUser;
  }

  interface PiPaymentDTO {
    identifier: string;
    user_uid: string;
    amount: number;
    memo: string;
    metadata: Record<string, unknown>;
    from_address: string;
    to_address: string;
    direction: "user_to_app" | "app_to_user";
    created_at: string;
    network: string;
    status: string;
    transaction: { txid: string; verified: boolean; _link: string } | null;
  }

  interface PiPaymentCallbacks {
    onReadyForServerApproval: (paymentId: string) => void;
    onReadyForServerCompletion: (paymentId: string, txid: string) => void;
    onCancel: (paymentId: string) => void;
    onError: (error: Error, payment?: PiPaymentDTO) => void;
  }

  interface PiAdsInstance {
    isAdReady: (adType: "interstitial" | "rewarded") => Promise<boolean>;
    requestAd: (adType: "interstitial" | "rewarded") => Promise<void>;
    showAd: (adType: "interstitial" | "rewarded") => Promise<{
      result: "AD_REWARDED" | "AD_CLOSED" | "AD_ERROR";
      adId?: string;
    }>;
  }

  interface PiNativeFeatures {
    openShareDialog: (data: {
      title: string;
      text: string;
      url: string;
    }) => Promise<void>;
    openConsentDialog: (data: {
      header: string;
      description: string;
      consentItems: { label: string; value: boolean }[];
    }) => Promise<{ consentResult: Record<string, boolean> }>;
  }

  interface PiInstance {
    init: (options: { version: string; sandbox?: boolean }) => void;
    authenticate: (
      scopes: string[],
      onIncompletePaymentFound?: (payment: PiPaymentDTO) => void
    ) => Promise<PiAuthResult>;
    createPayment: (
      paymentData: {
        amount: number;
        memo: string;
        metadata?: Record<string, unknown>;
      },
      callbacks: PiPaymentCallbacks
    ) => Promise<PiPaymentDTO>;
    nativeFeature: PiNativeFeatures;
    Ads: PiAdsInstance;
  }

  interface Window {
    webkitAudioContext: typeof AudioContext;
    Pi?: PiInstance;
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: AnyFn) => void;
      removeListener: (event: string, handler: AnyFn) => void;
    };
  }
}
