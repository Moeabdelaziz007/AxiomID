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

// Global Mock for nostics diagnostics (ESM-only package, not needed in tests).
// Only the codes that actually exist in src/diagnostics/catalog.ts are defined.
// Accessing an unknown code throws so DIAGNOSTIC_MAP regressions fail fast.
jest.mock("@/diagnostics/catalog", () => {
  const diagnosticsMock = {
    AXIOMID_E001: jest.fn(),
    AXIOMID_E002: jest.fn(),
    AXIOMID_E010: jest.fn(),
    AXIOMID_E011: jest.fn(),
    AXIOMID_E012: jest.fn(),
    AXIOMID_E013: jest.fn(),
    AXIOMID_E020: jest.fn(),
    AXIOMID_E021: jest.fn(),
    AXIOMID_E022: jest.fn(),
    AXIOMID_E023: jest.fn(),
    AXIOMID_E024: jest.fn(),
    AXIOMID_E030: jest.fn(),
    AXIOMID_E040: jest.fn(),
  };
  return {
    diagnostics: new Proxy(diagnosticsMock, {
      get: (target, prop) => {
        if (typeof prop === "symbol") return undefined;
        if (!(prop in target)) {
          throw new Error(`Unknown diagnostics code accessed in test: ${String(prop)}`);
        }
        return target[prop];
      },
    }),
  };
});

// Global Mock for @nostics/unplugin (ESM-only, only used in webpack config)
jest.mock("@nostics/unplugin/strip-transform", () => ({
  nosticsStrip: { webpack: jest.fn() },
}));

// Global Mock for framer-motion (simplify animations for tests)
jest.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    motion: new Proxy({}, {
      get: (_target, prop) => {
        const Component = React.forwardRef(({ children, _whileHover, _whileTap, _initial, _animate, _exit, _transition, _viewport, _variants, _custom, ...props }, ref) => (
          React.createElement(prop, { ...props, ref }, children)
        ));
        Component.displayName = `Motion.${String(prop)}`;
        return Component;
      },
    }),
    AnimatePresence: ({ children }) => children,
    useInView: () => true,
    useSpring: (val) => val,
    useTransform: (val) => val,
    useMotionValue: (val) => val,
  };
});

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
          visitor: "Visitor",
          citizen: "Citizen",
          validator: "Validator",
          sovereign: "Sovereign",
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
          welcome_back_name: "Welcome back, {username}",
          agent_identity_ready: "Your agent identity is ready. Level",
          demo_account: "Demo Account",
          demo_not_valid: "Not valid for production use",
          stat_level: "Level",
          stat_xp: "XP",
          stat_agent: "Agent",
          agent_trust_label: "Trust",
          stat_status: "Status",
          no_skills_installed: "No skills installed",
          kya_secure_did: "Secure your DID document by verifying your credentials.",
          kya_verified_anchored: "✓ AxiomID Verification Anchored",
          kya_identity_verified: "Your identity has been verified and permanently anchored under DID:",
          kya_verification_pending: "Verification Pending",
          kya_oracle_validating: "The oracle network is validating your credentials.",
          kya_pi_username: "Pi Username",
          kya_verifying: "VERIFYING...",
          kya_verify_identity: "VERIFY IDENTITY",
          agent_id_label: "Agent ID:",
          agent_xp_label: "XP",
          agent_last_active: "LAST ACTIVE",
          agent_never_active: "Never",
          agent_activating: "ACTIVATING...",
          agent_activate: "ACTIVATE",
          agent_pausing: "PAUSING...",
          agent_pause: "PAUSE",
          agent_resuming: "RESUMING...",
          agent_resume: "RESUME",
          terminal_title: "TERMINAL",
          terminal_entries: "entries",
          terminal_clear: "CLEAR",
          terminal_run_test: "RUN TEST",
          terminal_waiting: "Waiting for wallet activity...",
          view_passport: "View Passport",
          did_document: "DID Document",
          create_agent_title: "Create Your Agent",
          create_agent_desc: "Give your agent a name to get started.",
          create_agent_tier_info: "Your agent will begin at Tier 1 with 0 XP.",
          create_agent_placeholder: "Agent name (optional)",
          create_agent_creating: "CREATING...",
          create_agent_create: "CREATE",
          create_your_passport: "CREATE YOUR PASSPORT",
          passport_load_error: "Failed to load passport",
        };
        return mockDict[key] || key;
      },
    })),
  };
});

// Global mock for @upstash/redis
const globalRedisStore = new Map();
jest.mock("@upstash/redis", () => {
  return {
    Redis: {
      fromEnv: jest.fn().mockReturnValue({
        set: jest.fn().mockImplementation(async (key, value, options) => {
          globalRedisStore.set(key, value);
          return "OK";
        }),
        get: jest.fn().mockImplementation(async (key) => {
          return globalRedisStore.get(key) || null;
        }),
        del: jest.fn().mockImplementation(async (key) => {
          globalRedisStore.delete(key);
          return 1;
        }),
      }),
    },
  };
});


