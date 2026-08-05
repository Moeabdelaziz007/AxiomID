import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { 
      headers: { 
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*'
      } 
    }
  )
}