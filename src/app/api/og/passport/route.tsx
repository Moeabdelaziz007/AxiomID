import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || 'AxiomID Passport';
    const did = searchParams.get('did') || 'did:axiom:unknown';
    const tier = searchParams.get('tier') || 'Visitor';
    const colorParam = searchParams.get('color') || '#ffffff';
    const tierColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorParam) ? colorParam : '#ffffff';

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
            backgroundImage: 'linear-gradient(135deg, rgba(29, 32, 39, 0.9) 0%, rgba(16, 19, 26, 0.95) 100%)',
            fontFamily: 'monospace',
            color: 'white',
            border: `4px solid ${tierColor}40`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 'bold',
                marginBottom: 20,
                color: tierColor,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 30,
                color: '#a1a1aa',
                marginBottom: 40,
              }}
            >
              {did}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 20, color: '#a1a1aa' }}>TIER</span>
                <span style={{ fontSize: 36, fontWeight: 'bold', color: tierColor }}>{tier.toUpperCase()}</span>
              </div>
              <div
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: `${tierColor}20`,
                  border: `2px solid ${tierColor}40`,
                  color: tierColor,
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                VERIFIED
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    logger.error('[OG-PASSPORT] Image generation failed:', e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
