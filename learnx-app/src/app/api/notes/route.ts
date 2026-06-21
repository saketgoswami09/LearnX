// Deprecated API route � all data is now handled client-side via src/lib/service.ts + IndexedDB.
// These routes return 410 Gone; all data is handled client-side via IndexedDB (src/lib/service.ts). The 410 responses are explicit � not a constraint of static export.
export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }
export async function POST() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }
export async function PUT() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }
export async function DELETE() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }