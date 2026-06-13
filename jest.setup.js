import '@testing-library/jest-dom'
import { fetch, Request, Response, Headers } from 'undici'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill Web APIs for Next.js 13+ route handlers
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder
}
if (!global.fetch) {
  global.fetch = fetch
  global.Request = Request
  global.Response = Response
  global.Headers = Headers
}

// Global Mock for Auth Middleware
jest.mock('@/lib/auth-middleware', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    error: null,
    user: {
      id: 'mock-user-id',
      walletAddress: 'pi:mockuser',
      piUid: 'mock-pi-uid',
      piUsername: 'mockuser',
      xp: 0,
      tier: 'Beginner',
    },
  }),
}));

process.env.ISSUER_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJPXm5IHbMq9+f2t/c3EbitLbv6pvIQzLWEHZaQ1jkvm
-----END PRIVATE KEY-----`;

process.env.PI_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32-byte hex

// Global Mock for Language Context (preserves real exports, only overrides useLanguage)
jest.mock("@/app/context/language-context", () => {
  const actual = jest.requireActual("@/app/context/language-context");
  return {
    ...actual,
    useLanguage: jest.fn(() => ({
      language: "en",
      setLanguage: jest.fn(),
      t: (key) => {
        const mockDict = {
          nav_dashboard: "AxiomID Dashboard",
          dashboard_title: "AxiomID Dashboard",
          enter_dashboard: "ENTER DASHBOARD",
          nav_settings: "SETTINGS",
          logout: "LOGOUT",
          connecting: "CONNECTING...",
          connect: "CONNECT",
          view_demo: "VIEW DEMO",
          connect_wallet: "CONNECT WALLET",
          inspect_vc: "INSPECT VC",
          connected: "CONNECTED",
          settings_copy: "COPY",
          settings_connect_btn: "CONNECT",
          cancel: "CANCEL",
          close: "CLOSE",
          copy_payload: "COPY PAYLOAD",
          settings_sovereign_title: "Sovereign Settings",
          settings_wallet_prompt: "Please connect your wallet to access profile details and link accounts.",
          settings_back_landing: "← Back to landing",
          settings_page_title: "AxiomID Settings",
          settings_page_desc: "Manage sovereign keys & connections",
          settings_dashboard_link: "← DASHBOARD",
          settings_profile_title: "Sovereign Profile",
          settings_pi_network_id: "PI NETWORK ID",
          settings_stellar_wallet: "STELLAR WALLET",
          settings_sovereign_did: "SOVEREIGN DID",
          settings_identity_status: "IDENTITY STATUS (KYA)",
          settings_verified_human: "Verified Human",
          settings_pending_kyc: "Pending KYC Claim",
          settings_progression_title: "Progression & Experience",
          settings_social_title: "Verifiable Social Identifiers",
          settings_social_desc: "Bind your profiles to generate W3C compliance credentials signed cryptographically by the protocol authority.",
          settings_xp_reward: "XP Reward:",
          settings_ledger_title: "Cryptographic Action Ledger",
          settings_no_tx: "No transactions recorded in the local cache.",
          settings_tx_objective: "TX OBJECTIVE",
          settings_balance_shift: "BALANCE SHIFT",
          settings_timestamp: "TIMESTAMP",
          settings_link_profile: "Link {platform} Profile",
          settings_link_desc: "Type your username handle to build a verifiable social connection claim.",
          settings_link_handle_label: "Profile Handle",
          settings_link_email_label: "Email Address",
          settings_link_email_placeholder: "name@gmail.com",
          settings_link_placeholder: "@cryptojoker",
          settings_signing: "SIGNING...",
          settings_confirm_claim: "CONFIRM CLAIM",
          settings_vc_title: "SocialIdentityCredential (W3C Standard)",
          settings_vc_desc: "Signed by AxiomID issuer authority. Copy payload to verify portability.",
          vc_no_data: "No Verifiable Credential data available for this stamp.",
          vc_empty_metadata: "Credential metadata is empty.",
          vc_parse_error: "Failed to parse Verifiable Credential payload.",
        };
        return mockDict[key] || key;
      },
    })),
  };
});

