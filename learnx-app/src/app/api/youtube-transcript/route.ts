import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return NextResponse.json(transcript);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
