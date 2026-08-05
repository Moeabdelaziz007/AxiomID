import { NextRequest, NextResponse } from 'next/server';

/**
 * Cloudflare Stream API Endpoint
 * Generates WebRTC / HLS playback stream tokens for sovereign agents
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const streamName = body.name || 'agent-live-stream';

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({
        success: true,
        mode: 'simulated_stream',
        streamId: `str_${Date.now()}`,
        hlsPlaybackUrl: `https://videodelivery.net/simulated-stream-${streamName}/manifest/video.m3u8`,
        dashPlaybackUrl: `https://videodelivery.net/simulated-stream-${streamName}/manifest/video.mpd`,
        webrtcPlaybackUrl: `https://videodelivery.net/simulated-stream-${streamName}/webrtc`,
        status: 'READY',
      });
    }

    // Live Cloudflare Stream API Execution
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`;
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600,
        creator: streamName,
      }),
    });

    const cfData = await cfRes.json();

    return NextResponse.json({
      success: true,
      mode: 'cloudflare_stream',
      uploadUrl: cfData.result ? cfData.result.uploadURL : null,
      streamId: cfData.result ? cfData.result.uid : null,
      status: 'EXECUTED',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
