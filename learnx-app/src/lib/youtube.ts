/**
 * LearnX YouTube utilities.
 *
 * Phase 1 (free, no API key):
 *   - Extract video ID from any YT URL format
 *   - Fetch video metadata via oEmbed (title, author)
 *   - Parse chapters from video description (0:00 - Title format)
 *
 * Phase 2 (Gemini Flash — user's own key):
 *   - Fetch raw transcript via allorigins.win CORS proxy
 *   - Compress transcript, send to Gemini, get semantic timestamps
 */

import type { YouTubeTimestamp } from '@/types';

// ──────────────────────────────────────────────────────────────
// 1. Extract video ID
// ──────────────────────────────────────────────────────────────
const YT_REGEX = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractVideoId(url: string): string | null {
  const m = url.match(YT_REGEX);
  return m?.[1] ?? null;
}

export function buildEmbedUrl(videoId: string, startSeconds = 0): string {
  const t = startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : '';
  return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1${t}`;
}

// ──────────────────────────────────────────────────────────────
// 2. oEmbed metadata (title + author, no API key needed)
// ──────────────────────────────────────────────────────────────
export interface YTMeta {
  title: string;
  author: string;
  thumbnailUrl: string;
}

export async function fetchYTMeta(videoId: string): Promise<YTMeta | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title ?? '',
      author: data.author_name ?? '',
      thumbnailUrl: data.thumbnail_url ?? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// 3. Parse chapters from description (e.g. "0:00 Intro")
// ──────────────────────────────────────────────────────────────

/** Convert "1:23:45" or "1:23" or "23" to seconds */
function parseTimecode(tc: string): number {
  const parts = tc.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

const CHAPTER_RE = /(?:^|\n)\s*(\d{1,2}(?::\d{2}){1,2})\s+(.+)/g;

export function parseChaptersFromDescription(description: string): YouTubeTimestamp[] {
  const results: YouTubeTimestamp[] = [];
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = CHAPTER_RE.exec(description)) !== null) {
    const label = m[2].trim().replace(/^[-–—•·]+\s*/, '');
    if (label) results.push({ time: parseTimecode(m[1]), label });
  }
  CHAPTER_RE.lastIndex = 0;
  return results;
}

// ──────────────────────────────────────────────────────────────
// 4. Fetch transcript via allorigins.win CORS proxy
// ──────────────────────────────────────────────────────────────

interface TranscriptEntry {
  start: number;
  text: string;
}

/**
 * Fetches the auto-generated English captions for a YouTube video.
 * Uses allorigins.win as a CORS proxy.
 * Returns null if captions are unavailable.
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptEntry[] | null> {
  try {
    const res = await fetch(`/api/youtube-transcript?videoId=${videoId}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) return null;
    
    return data.map((item: any) => ({
      start: item.offset / 1000,
      text: item.text,
    }));
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// 5. Compress transcript for AI (reduce token count ~70%)
// ──────────────────────────────────────────────────────────────

export function compressTranscript(entries: TranscriptEntry[]): string {
  // Sample 1 entry every 5 seconds, keep only first 8 words per entry
  const sampled: TranscriptEntry[] = [];
  let lastTime = -6;
  for (const e of entries) {
    if (e.start - lastTime >= 5) {
      sampled.push(e);
      lastTime = e.start;
    }
  }

  return sampled
    .map(e => {
      const words = e.text.split(/\s+/).slice(0, 8).join(' ');
      const mins = Math.floor(e.start / 60);
      const secs = Math.floor(e.start % 60).toString().padStart(2, '0');
      return `[${mins}:${secs}] ${words}`;
    })
    .join('\n');
}

// ──────────────────────────────────────────────────────────────
// 6. Gemini Flash AI segmentation
// ──────────────────────────────────────────────────────────────

export async function segmentWithGemini(
  compressedTranscript: string,
  videoTitle: string,
  apiKey: string,
): Promise<YouTubeTimestamp[] | null> {
  const prompt = `You are an expert content analyzer. I am providing you with a raw, compressed transcript of a YouTube video titled "${videoTitle}".
  
Your task is to identify the major topic changes and create video chapters.
CRITICAL INSTRUCTIONS:
1. DO NOT return every timestamp. You MUST summarize and group the entire content into EXACTLY 5 to 15 major topic sections.
2. The "label" should be a clear, broad human-readable title for that section (max 6 words). DO NOT just quote the transcript.
3. Your output MUST be a JSON array with a MAXIMUM of 15 items. Never return more than 15 items.
4. Return ONLY a valid JSON array of objects, with no markdown formatting or extra text.
Format: [{"time": 0, "label": "Introduction"}, {"time": 120, "label": "Installing Dependencies"}]

Transcript data:
${compressedTranscript}`;

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const cleanKey = apiKey.trim();
    
    // Dynamically fetch available models to prevent 404 on restricted/older API keys
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    if (!modelsRes.ok) throw new Error(`Failed to list models: ${modelsRes.statusText}`);
    const modelsData = await modelsRes.json();
    
    const validModels = (modelsData.models || []).filter((m: any) => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    const bestModel = validModels.find((m: any) => m.name.includes('gemini-1.5-flash'))
                   || validModels.find((m: any) => m.name.includes('gemini-1.5-pro'))
                   || validModels.find((m: any) => m.name.includes('gemini-pro'))
                   || validModels[0];
                   
    if (!bestModel) throw new Error("Your API key does not have access to any compatible text generation models.");
    
    const modelName = bestModel.name.replace('models/', '');
    
    const genAI = new GoogleGenerativeAI(cleanKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      }
    });
    
    const text = result.response.text();

    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error(`Gemini returned invalid JSON format: ${text.substring(0, 100)}...`);

    const parsed: { time: number; label: string }[] = JSON.parse(jsonMatch[0]);
    return parsed
      .filter(p => typeof p.time === 'number' && typeof p.label === 'string')
      .map(p => ({ time: Math.floor(p.time), label: p.label.trim() }))
      .sort((a, b) => a.time - b.time);
  } catch (e: any) {
    console.error(e);
    throw new Error(`Gemini API Error: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────────
// 7. High-level: get timestamps for a lesson (with caching)
// ──────────────────────────────────────────────────────────────

import { dbGet, dbPut, STORES } from './idb';
import type { YouTubeTimestampCache } from '@/types';

export type TimestampResult =
  | { status: 'ok'; timestamps: YouTubeTimestamp[]; source: 'chapters' | 'ai' | 'manual' | 'cache' }
  | { status: 'no_transcript' }
  | { status: 'error'; message: string };

export async function getOrFetchTimestamps(
  lessonId: string,
  videoId: string,
  description: string,
  apiKey: string | null,
): Promise<TimestampResult> {
  // Check cache first
  const cached = await dbGet<YouTubeTimestampCache>(STORES.ytTimestamps, lessonId);
  if (cached?.timestamps?.length) {
    return { status: 'ok', timestamps: cached.timestamps, source: 'cache' };
  }

  // Fetch description dynamically if empty (bypasses CORS)
  let activeDesc = description;
  if (!activeDesc) {
    try {
      const descRes = await fetch(`/api/youtube-description?videoId=${videoId}`);
      if (descRes.ok) {
        const descData = await descRes.json();
        activeDesc = descData.description || '';
      }
    } catch {
      // Ignore
    }
  }

  // Phase 1: Try description chapters
  if (activeDesc) {
    const chapters = parseChaptersFromDescription(activeDesc);
    if (chapters.length >= 2) {
      await dbPut(STORES.ytTimestamps, {
        lesson_id: lessonId, video_id: videoId,
        timestamps: chapters, source: 'chapters', cached_at: Date.now(),
      });
      return { status: 'ok', timestamps: chapters, source: 'chapters' };
    }
  }

  // Phase 2: Fetch transcript
  const transcript = await fetchTranscript(videoId);
  if (!transcript) return { status: 'no_transcript' };

  // Phase 2a: AI segmentation if key is set
  if (apiKey) {
    const compressed = compressTranscript(transcript);
    // Need title — fallback gracefully
    const meta = await fetchYTMeta(videoId);
    const ai = await segmentWithGemini(compressed, meta?.title ?? 'Video', apiKey);
    if (ai && ai.length > 0) {
      await dbPut(STORES.ytTimestamps, {
        lesson_id: lessonId, video_id: videoId,
        timestamps: ai, source: 'ai', cached_at: Date.now(),
      });
      return { status: 'ok', timestamps: ai, source: 'ai' };
    }
  }

  // Phase 2b: Fallback — return raw transcript as clickable lines (every 30s)
  const sparse: YouTubeTimestamp[] = [];
  let lastTime = -31;
  for (const e of transcript) {
    if (e.start - lastTime >= 30) {
      const words = e.text.split(/\s+/).slice(0, 7).join(' ');
      sparse.push({ time: Math.floor(e.start), label: words });
      lastTime = e.start;
    }
  }

  if (sparse.length > 0) {
    await dbPut(STORES.ytTimestamps, {
      lesson_id: lessonId, video_id: videoId,
      timestamps: sparse, source: 'chapters', cached_at: Date.now(),
    });
    return { status: 'ok', timestamps: sparse, source: 'chapters' };
  }

  return { status: 'no_transcript' };
}

/** Save user-manually-added timestamps */
export async function saveManualTimestamps(lessonId: string, videoId: string, timestamps: YouTubeTimestamp[]): Promise<void> {
  await dbPut(STORES.ytTimestamps, {
    lesson_id: lessonId, video_id: videoId,
    timestamps, source: 'manual', cached_at: Date.now(),
  });
}

/** Clear cached timestamps (forces re-fetch) */
export async function clearTimestampCache(lessonId: string): Promise<void> {
  const { dbDelete } = await import('./idb');
  await dbDelete(STORES.ytTimestamps, lessonId);
}

/** Format seconds to M:SS or H:MM:SS */
export function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
