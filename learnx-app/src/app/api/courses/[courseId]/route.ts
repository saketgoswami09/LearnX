// Deprecated API route — all data is now handled client-side via src/lib/service.ts + IndexedDB.
// placeholder
export const dynamic = 'force-static';
import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }
export async function POST() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }
export async function PUT() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }
export async function DELETE() { return NextResponse.json({ error: 'Use client-side service' }, { status: 410 }); }