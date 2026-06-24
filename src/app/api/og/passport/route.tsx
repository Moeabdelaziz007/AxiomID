import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 10;

const TIER_COLORS: Record<string, string> = {
  visitor: '#71717a',
  citizen: '#3b82f6',
  validator: '#f59e0b',
  sovereign: '#22c55e',
};

const TIER_LABELS: Record<string, string> = {
  visitor: 'VISITOR',
  citizen: 'CITIZEN',
  validator: 'VALIDATOR',
  sovereign: 'SOVEREIGN',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || 'AxiomID Passport';
    const did = searchParams.get('did') || 'did:axiom:unknown';
    const tierParam = (searchParams.get('tier') || 'visitor').toLowerCase();
    const stampsParam = searchParams.get('stamps') || '0';
    const xpParam = searchParams.get('xp') || '0';

    const tierColor = TIER_COLORS[tierParam] || TIER_COLORS.visitor;
    const tierLabel = TIER_LABELS[tierParam] || 'VISITOR';
    const stamps = parseInt(stampsParam, 10) || 0;
    const xp = parseInt(xpParam, 10) || 0;

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
            backgroundImage:
              'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), ' +
              'radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.06) 0%, transparent 50%), ' +
              'linear-gradient(135deg, #0a0b0e 0%, #10131a 50%, #0a0b0e 100%)',
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
                    fontSize: 18,
                    color: tierColor,
                  }}
                >
                  {' '}
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
                      wordBreak: 'break-all',
                    }}
                  >
                    {did}
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
                {/* Trust Score */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#52525b', letterSpacing: 2 }}>TRUST SCORE</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 56, fontWeight: 'bold', color: '#e4e4e7' }}>{xp}</span>
                    <span style={{ fontSize: 18, color: '#52525b' }}>XP</span>
                  </div>
                </div>

                {/* Stamps row */}
                <div style={{ display: 'flex', gap: 16 }}>
                  {[
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
                      fontSize: 12,
                      color: '#0a0b0e',
                      fontWeight: 'bold',
                    }}
                  >
                    {' '}
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
                SOVERIGN IDENTITY PROTOCOL
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
