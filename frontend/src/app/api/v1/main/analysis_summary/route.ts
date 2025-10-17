// src/app/api/v1/main/analysis_summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Prefer Clerk's user when available; allow ?user_id=... override
    const { userId: clerkUserId } = await auth();
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id') || clerkUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ Use req.headers (DO NOT import/use next/headers.headers())
    const authHeader =
      req.headers.get('authorization') || req.headers.get('Authorization') || '';

    const backendUrl = `${BACKEND_API_URL}/api/v1/main/analysis_summary?user_id=${encodeURIComponent(
      userId
    )}`;

    const upstream = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        // forward only what you actually need
        ...(authHeader ? { Authorization: authHeader } : {}),
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`,
        'X-API-Key': process.env.BACKEND_API_KEY,
      },
      // If your backend is same-origin and you need cookies, you could add:
      // credentials: 'include',
    });

    const payload = await upstream.json().catch(() => ({}));

    return NextResponse.json(payload, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
