import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || 'AxiomID — Sovereign Identity').slice(0, 90);
    const domain = (searchParams.get('domain') || 'axiomid.app').slice(0, 40);
    const tagline = (searchParams.get('tagline') || 'Identity · Skills · Labor Exchange for Humans and AI Agents').slice(0, 120);

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
            padding: 60,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 1080,
              flex: 1,
              borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              padding: '48px 56px',
              justifyContent: 'space-between',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, transparent, #6366f1, transparent)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #6366f130, #6366f110)',
                    border: '1px solid #6366f150',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a5b4fc',
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span style={{ fontSize: 28, fontWeight: 'bold', color: '#e4e4e7', letterSpacing: 3 }}>AXIOMID</span>
              </div>
              <span style={{ fontSize: 18, color: '#71717a', letterSpacing: 2, padding: '10px 24px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)' }}>{domain}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <span style={{ fontSize: 13, color: '#6366f1', letterSpacing: 4 }}>PAI PROTOCOL · SOVEREIGN AGENT STACK</span>
              <span style={{ fontSize: 64, fontWeight: 'bold', color: '#fafafa', lineHeight: 1.15 }}>{title}</span>
              <span style={{ fontSize: 24, color: '#a1a1aa', maxWidth: 900, lineHeight: 1.5 }}>{tagline}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, color: '#3f3f46', letterSpacing: 1 }}>HUMANS + AI AGENTS · ONE IDENTITY LAYER</span>
              <span style={{ fontSize: 15, color: '#22c55e', letterSpacing: 2 }}>دقيق · جيد · 🟢 QUAD-LINGUAL</span>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (e: unknown) {
    logger.error('[OG-BRAND] Image generation failed:', e);
    return new Response('Failed to generate the image', { status: 500 });
  }
}