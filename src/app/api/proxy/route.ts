import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    
    // Attempt to parse JSON, fallback to text if needed but our client expects JSON mostly
    const data = await res.json().catch(() => ({ error: 'Failed to parse JSON response' }));
    
    if (!res.ok) {
        return NextResponse.json(data || { error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Origin': new URL(targetUrl).origin,
        'Referer': targetUrl,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ error: 'Failed to parse JSON response' }));

    if (!res.ok) {
        return NextResponse.json(data || { error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
