// src/app/api/v1/main/generate_report/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const fastApiResponse = await fetch(`${FASTAPI_URL}/api/v1/main/generate_report`, {
      method: 'POST',
      headers: {
        // Pass the necessary credentials to the backend
        'Authorization': `Bearer ${process.env.FASTAPI_API_KEY}`,
        'X-User-Id': userId,
      },
    });

    if (!fastApiResponse.ok) {
      const errorBody = await fastApiResponse.text();
      console.error(`[GENERATE_REPORT_ERROR] FastAPI request failed:`, errorBody);
      throw new Error('Failed to generate report from backend.');
    }

    // Get the file blob from the FastAPI response
    const blob = await fastApiResponse.blob();
    
    // Forward the file blob back to the client
    return new NextResponse(blob, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="Financial_Report.pptx"`,
        },
    });

  } catch (error) {
    console.error('[GENERATE_REPORT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
