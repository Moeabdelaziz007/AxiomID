import { z } from 'zod';

export const PiAuthSchema = z.object({
  accessToken: z.string().min(1, 'accessToken is required'),
  uid: z.string().min(1, 'uid is required'),
  username: z.string().min(1, 'username is required'),
});

export const KyaClaimSchema = z.object({
  username: z.string().min(1, 'username is required'),
});

export const UserStatusSchema = z.object({
  userId: z.string().min(1).optional(),
  walletAddress: z.string().regex(/^(G[A-Z2-7]{55}|0x[a-fA-F0-9]{40}|pi:[a-zA-Z0-9_-]+)$/, 'Invalid wallet address').optional(),
}).refine((data) => data.userId || data.walletAddress, {
  message: 'Either userId or walletAddress is required',
});

export const ActionClaimSchema = z.object({
  actionType: z.string().min(1, 'actionType is required').max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AuthStateSchema = z.object({
  walletAddress: z.string().regex(/^(G[A-Z2-7]{55}|0x[a-fA-F0-9]{40}|pi:[a-zA-Z0-9_-]+)$/, 'Invalid wallet address'),
});

export const WalletConnectSchema = z.object({
  walletAddress: z.string().regex(/^(G[A-Z2-7]{55}|0x[a-fA-F0-9]{40}|pi:[a-zA-Z0-9_-]+)$/, 'Invalid wallet address'),
  state: z.string().min(1, 'state token is required'),
  signature: z.string().optional(),
});

export const PaymentApproveSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
});

export const PaymentCompleteSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
  txid: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'txid must be alphanumeric, dashes, or underscores').min(1, 'txid is required'),
});

// New Schemas for Step 2 validation audit:

export const AgentMainSchema = z.object({
  action: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'action must be alphanumeric, underscores, or hyphens').max(100),
  params: z.record(z.string(), z.unknown()).optional(),
});

// ── Manifest Validation ────────────────────────────────────────

const REQUIRED_MANIFEST_SECTIONS = [
  { en: 'Purpose', ar: 'الغرض', header: 'الغرض — Purpose' },
  { en: 'Principle Alignment', ar: 'مبدأ التوافق', header: 'مبدأ التوافق — Principle Alignment' },
  { en: 'Operational Flow', ar: 'سير التشغيل', header: 'سير التشغيل — Operational Flow' },
  { en: 'Failure Modes', ar: 'أنماط الفشل', header: 'أنماط الفشل — Failure Modes' },
] as const;

const STUB_PATTERNS = [
  /TODO:/i,
  /TBD/i,
  /<fill in>/i,
  /^\s*\.\.\.\s*$/,
  /<!--\s*.*?\s*-->/,
];

export interface ManifestSection {
  header: string;
  body: string;
}

export interface ManifestValidation {
  valid: boolean;
  missing: string[];
  stubs: string[];
  sections: ManifestSection[];
}

/**
 * Extracts top-level Markdown sections headed by `##`.
 *
 * @param md - The Markdown text to parse
 * @returns The sections in document order, each with its header and trimmed body
 */
function parseManifestSections(md: string): ManifestSection[] {
  const sections: ManifestSection[] = [];
  const headerRegex = /^##\s+(.+)$/gm;
  let lastIndex = 0;
  let lastHeader = '';

  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(md)) !== null) {
    if (lastHeader) {
      const body = md.slice(lastIndex, match.index).trim();
      sections.push({ header: lastHeader, body });
    }
    lastHeader = match[1].trim();
    lastIndex = headerRegex.lastIndex;
  }
  if (lastHeader) {
    const body = md.slice(lastIndex).trim();
    sections.push({ header: lastHeader, body });
  }
  return sections;
}

/**
 * Determines whether a manifest section body contains only placeholder content.
 *
 * @returns `true` if the body is empty, consists only of HTML comments, or matches a stub pattern; `false` otherwise.
 */
function isStubBody(body: string): boolean {
  if (!body) return true;

  // Iteratively strip all comment pairs to handle nesting/overlapping cases.
  let stripped = body;
  let prev = '';
  while (prev !== stripped) {
    prev = stripped;
    stripped = stripped.replace(/<!--[\s\S]*?-->/g, '');
  }
  stripped = stripped.trim();
  if (!stripped) return true;

  // Detect any unmatched HTML comment opener.
  const lastOpen = stripped.lastIndexOf('<!--');
  const lastClose = stripped.lastIndexOf('-->');
  if (lastOpen !== -1 && (lastClose === -1 || lastOpen > lastClose)) return true;

  const lines = stripped.split('\n').filter(l => l.trim());
  if (lines.length === 0) return true;
  if (STUB_PATTERNS.some(p => p.test(stripped))) return true;
  if (lines.length === 1 && STUB_PATTERNS.some(p => p.test(lines[0].trim()))) return true;
  return false;
}

/**
 * Validates a manifest's required sections and content.
 *
 * @param md - The markdown manifest content to validate
 * @returns A validation result with the parsed sections, missing required sections, sections that contain placeholder content, and the overall validity flag
 */
export function validateManifest(md: string): ManifestValidation {
  const sections = parseManifestSections(md);
  const missing: string[] = [];
  const stubs: string[] = [];

  for (const required of REQUIRED_MANIFEST_SECTIONS) {
    const found = sections.find(s =>
      s.header === required.header ||
      s.header === required.en ||
      s.header === required.ar
    );
    if (!found) {
      missing.push(required.header);
    } else if (isStubBody(found.body)) {
      stubs.push(required.header);
    }
  }

  return {
    valid: missing.length === 0 && stubs.length === 0,
    missing,
    stubs,
    sections,
  };
}

/**
 * Describes validation issues found in a manifest document.
 *
 * @param md - The markdown content to analyze.
 * @returns A semicolon-separated list of missing sections and placeholder-content issues, or an empty string if none are found.
 */
export function describeManifestIssues(md: string): string {
  const result = validateManifest(md);
  const issues: string[] = [];
  for (const m of result.missing) {
    issues.push(`missing required section: ${m}`);
  }
  for (const s of result.stubs) {
    issues.push(`section "${s}" contains placeholder or empty content`);
  }
  return issues.join('; ');
}

export const ManifestSchema = z.string().refine(
  (md) => validateManifest(md).valid,
  { message: 'Manifest is incomplete — missing required sections or contains placeholder content' }
);

export const SkillsListSortSchema = z.enum([
  'newest', 'popular', 'rating', 'price_asc', 'price_desc',
]).optional().nullable();

export const SkillsListQuerySchema = z.object({
  tier: z.string().optional().nullable(),
  q: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  sort: SkillsListSortSchema,
  minPrice: z.coerce.number().nonnegative().optional().nullable(),
  maxPrice: z.coerce.number().nonnegative().optional().nullable(),
  soulPrinciple: z.enum(['MURAQABAH', 'TAWBAH', 'TRUSTCHAIN', 'TASBIH', 'SABIYYAH', 'BARAKAH']).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SkillPublishSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  manifestMd: z.string().min(1, 'manifestMd is required'),
  agentScript: z.string().optional().nullable(),
  testSuite: z.string().optional().nullable(),
  tier: z.enum(['BASIC_TOOL', 'ADVANCED_TOOL', 'ADVANCED_INFRASTRUCTURE', 'PRO', 'SOVEREIGN']).default('BASIC_TOOL'),
  pricePi: z.number().nonnegative().default(0),
  version: z.string().default('1.0.0'),
  soulPrinciple: z.enum(['MURAQABAH', 'TAWBAH', 'TRUSTCHAIN', 'TASBIH', 'SABIYYAH', 'BARAKAH']).optional().nullable(),
  chainable: z.boolean().optional().default(false),
});

export const SkillUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  manifestMd: z.string().optional(),
  agentScript: z.string().optional().nullable(),
  testSuite: z.string().optional().nullable(),
  tier: z.enum(['BASIC_TOOL', 'ADVANCED_TOOL', 'ADVANCED_INFRASTRUCTURE', 'PRO', 'SOVEREIGN']).optional(),
  pricePi: z.number().nonnegative().optional(),
  version: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'DEPRECATED']).optional(),
  isPublished: z.boolean().optional(),
  changelog: z.string().max(2000).optional(),
  soulPrinciple: z.enum(['MURAQABAH', 'TAWBAH', 'TRUSTCHAIN', 'TASBIH', 'SABIYYAH', 'BARAKAH']).optional().nullable(),
  chainable: z.boolean().optional(),
});

export const SkillReviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().optional().nullable(),
});

export const SkillTagsUpdateSchema = z.object({
  tags: z.array(z.string().min(1, 'tag name is required').max(100)).max(10, 'maximum 10 tags per skill'),
});

export const PresenceHeartbeatSchema = z.object({
  agentId: z.string().uuid('agentId must be a valid UUID'),
});

export const OrderCreateSchema = z.object({
  skillId: z.string().uuid('skillId must be a valid UUID'),
  agentId: z.string().uuid('agentId must be a valid UUID'),
  paymentId: z.string().min(1, 'paymentId is required'),
});

export const OrderActionSchema = z.object({
  paymentId: z.string().uuid('paymentId must be a valid UUID'),
});

export const CredentialStatusQuerySchema = z.object({
  credentialId: z.string().optional().nullable(),
  subjectId: z.string().optional().nullable(),
}).refine((data) => data.credentialId || data.subjectId, {
  message: 'credentialId or subjectId is required',
});

export const DidDocumentQuerySchema = z.object({
  did: z.string().optional().nullable(),
});

export const SlugParamSchema = z.object({
  slug: z.string().min(1, 'slug is required'),
});

// Type definitions
export type PiAuthInput = z.infer<typeof PiAuthSchema>;
export type KyaClaimInput = z.infer<typeof KyaClaimSchema>;
export type UserStatusInput = z.infer<typeof UserStatusSchema>;
export type ActionClaimInput = z.infer<typeof ActionClaimSchema>;
export type WalletConnectInput = z.infer<typeof WalletConnectSchema>;
export type PaymentApproveInput = z.infer<typeof PaymentApproveSchema>;
export type PaymentCompleteInput = z.infer<typeof PaymentCompleteSchema>;
export type AgentMainInput = z.infer<typeof AgentMainSchema>;
export type SkillsListQueryInput = z.infer<typeof SkillsListQuerySchema>;
export type SkillPublishInput = z.infer<typeof SkillPublishSchema>;
export type SkillUpdateInput = z.infer<typeof SkillUpdateSchema>;
export type SkillReviewCreateInput = z.infer<typeof SkillReviewCreateSchema>;
export type SkillTagsUpdateInput = z.infer<typeof SkillTagsUpdateSchema>;
export type PresenceHeartbeatInput = z.infer<typeof PresenceHeartbeatSchema>;
export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type OrderActionInput = z.infer<typeof OrderActionSchema>;
export type CredentialStatusQueryInput = z.infer<typeof CredentialStatusQuerySchema>;
export type DidDocumentQueryInput = z.infer<typeof DidDocumentQuerySchema>;
export type SlugParamInput = z.infer<typeof SlugParamSchema>;

export const AgentIdentitySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("identity_assertion"), assertion: z.string().min(1) }),
  z.object({ type: z.literal("anonymous") }),
]);

export const TokenExchangeSchema = z.discriminatedUnion("grant_type", [
  z.object({ grant_type: z.literal("jwt-bearer"), assertion: z.string().min(1) }),
  z.object({ grant_type: z.literal("claim"), claim_token: z.string().min(1) }),
]);

export const TokenRevocationSchema = z.object({
  token: z.string().min(1),
});

export const AgentSignSchema = z.object({
  payload: z.string().min(1, "Payload is required"),
  did: z.string().startsWith("did:axiom:", "Invalid AxiomID DID"),
});

export const ModerationActionSchema = z.object({
  action: z.enum(["approve", "reject"], { message: "action must be 'approve' or 'reject'" }),
  reason: z.string().max(1000).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const ModerationIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export type AgentIdentityInput = z.infer<typeof AgentIdentitySchema>;
export type TokenExchangeInput = z.infer<typeof TokenExchangeSchema>;
export type TokenRevocationInput = z.infer<typeof TokenRevocationSchema>;
export type AgentSignInput = z.infer<typeof AgentSignSchema>;
export type ModerationActionInput = z.infer<typeof ModerationActionSchema>;
export type ModerationIdParamInput = z.infer<typeof ModerationIdParamSchema>;
