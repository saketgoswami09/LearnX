import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!pageRes.ok) return NextResponse.json({ error: 'Failed to fetch watch page' }, { status: pageRes.status });
    
    const html = await pageRes.text();
    const descMatch = html.match(/"shortDescription":"(.*?)"/);
    
    let description = '';
    if (descMatch) {
      description = descMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    
    return NextResponse.json({ description });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
