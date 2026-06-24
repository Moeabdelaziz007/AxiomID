import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { calculateTier, getTierColor, type Tier } from '@/lib/tiers';
import { calculateTrustScore } from '@/lib/trust';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Normalizes an arbitrary tier query value to a canonical {@link Tier}.
 *
 * Accepts any casing (e.g. "sovereign", "SOVEREIGN") and returns the
 * capitalized canonical form from `@/lib/tiers`. Unknown values resolve to
 * `null` so the caller can fall back to XP-derived tier.
 */
function normalizeTier(value: string | null): Tier | null {
  if (!value) return null;
  const match = (['Visitor', 'Citizen', 'Validator', 'Sovereign'] as const).find(
    (t) => t.toLowerCase() === value.toLowerCase(),
  );
  return match ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || 'AxiomID Passport';
    const did = searchParams.get('did') || 'did:axiom:unknown';

    // Clamp numeric params to non-negative integers.
    const xp = Math.max(0, parseInt(searchParams.get('xp') || '0', 10) || 0);
    const stamps = Math.max(0, parseInt(searchParams.get('stamps') || '0', 10) || 0);

    // Prefer an explicit tier param (any casing); otherwise derive from XP so
    // the badge stays consistent with the rest of the app (see @/lib/tiers).
    const tier: Tier = normalizeTier(searchParams.get('tier')) ?? calculateTier(xp);
    const tierColor = getTierColor(tier);
    const tierLabel = tier.toUpperCase();

    // Trust score is a 0-100 metric derived from XP + stamps (see @/lib/trust),
    // distinct from raw XP. Compute it so the "TRUST SCORE" label is accurate.
    const trustScore = calculateTrustScore(xp, stamps);

    // Extract short name from DID for avatar
    const didParts = did.split(':');
    const shortName = didParts[didParts.length - 1]?.slice(0, 2).toUpperCase() || '??';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0b0e',
            backgroundImage: 'linear-gradient(135deg, #0a0b0e 0%, #10131a 50%, #0a0b0e 100%)',
            fontFamily: 'monospace',
            color: 'white',
            padding: 0,
          }}
        >
          {/* Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 1060,
              height: 530,
              borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: `1px solid rgba(255,255,255,0.08)`,
              boxShadow: `0 0 80px ${tierColor}10, 0 25px 50px rgba(0,0,0,0.5)`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Top accent line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${tierColor}, transparent)`,
              }}
            />

            {/* Header row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '28px 40px 0 40px',
              }}
            >
              {/* Logo / Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Shield icon */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}10)`,
                    border: `1px solid ${tierColor}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: tierColor,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span style={{ fontSize: 22, fontWeight: 'bold', color: '#e4e4e7', letterSpacing: 2 }}>
                  AXIOMID
                </span>
              </div>

              {/* Tier badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 20px',
                  borderRadius: 12,
                  background: `${tierColor}15`,
                  border: `1px solid ${tierColor}30`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: tierColor,
                    boxShadow: `0 0 8px ${tierColor}80`,
                  }}
                />
                <span style={{ fontSize: 16, fontWeight: 'bold', color: tierColor, letterSpacing: 3 }}>
                  {tierLabel}
                </span>
              </div>
            </div>

            {/* Main content area */}
            <div
              style={{
                display: 'flex',
                flex: 1,
                padding: '30px 40px',
                gap: 40,
              }}
            >
              {/* Left: Avatar + DID */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  width: 280,
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${tierColor}25, ${tierColor}08)`,
                    border: `2px solid ${tierColor}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 44,
                    fontWeight: 'bold',
                    color: tierColor,
                    boxShadow: `0 0 30px ${tierColor}15`,
                  }}
                >
                  {shortName}
                </div>

                {/* Title */}
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#e4e4e7',
                    textAlign: 'center',
                    maxWidth: 260,
                  }}
                >
                  {title}
                </span>

                {/* DID */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#52525b', letterSpacing: 2 }}>DECENTRALIZED ID</span>
                  <span
                    style={{
                      fontSize: 14,
                      color: '#71717a',
                      maxWidth: 260,
                      textAlign: 'center',
                      lineHeight: '1.4',
                    }}
                  >
                    {did.length > 28 ? `${did.slice(0, 14)}...${did.slice(-10)}` : did}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: 1,
                  background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.06), transparent)',
                }}
              />

              {/* Right: Stats */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 24,
                  flex: 1,
                }}
              >
                {/* Trust Score (0-100, computed from XP + stamps) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#52525b', letterSpacing: 2 }}>TRUST SCORE</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 56, fontWeight: 'bold', color: '#e4e4e7' }}>{trustScore}</span>
                    <span style={{ fontSize: 18, color: '#52525b' }}>/ 100</span>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
                    { label: 'XP', value: xp },
                    { label: 'STAMPS', value: stamps },
                    { label: 'TIER', value: tierLabel },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        padding: '16px 24px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        flex: 1,
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#52525b', letterSpacing: 2 }}>{stat.label}</span>
                      <span style={{ fontSize: 24, fontWeight: 'bold', color: '#a1a1aa' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Verification badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 20px',
                    borderRadius: 10,
                    background: `linear-gradient(90deg, ${tierColor}10, transparent)`,
                    border: `1px solid ${tierColor}20`,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: tierColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#0a0b0e',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, color: tierColor, letterSpacing: 1 }}>VERIFIED ON AXIOMID</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 40px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{ fontSize: 11, color: '#3f3f46', letterSpacing: 1 }}>
                SOVEREIGN IDENTITY PROTOCOL
              </span>
              <span style={{ fontSize: 11, color: '#3f3f46', letterSpacing: 1 }}>AXIOMID.APP</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: unknown) {
    logger.error('[OG-PASSPORT] Image generation failed:', e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
