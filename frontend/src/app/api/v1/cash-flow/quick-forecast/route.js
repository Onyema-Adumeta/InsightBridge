import { NextResponse } from 'next/server';

// Dynamically determine backend URL based on environment
function getBackendUrl() {
    if (process.env.FASTAPI_URL) {
        return process.env.FASTAPI_URL;
    }
    
    if (process.env.NODE_ENV === 'production') {
        return ''; // Same origin in production
    }
    
    return 'http://localhost:8000';
}

const FASTAPI_URL = getBackendUrl();

export async function POST(request) {
    console.log('=== Quick Forecast API Called ===');
    console.log('[API] Environment:', process.env.NODE_ENV);
    console.log('[API] Backend URL:', FASTAPI_URL || 'same-origin');
    
    try {
        // Parse request body
        const body = await request.json();
        console.log('[API] Request payload:', body);
        
        const fastApiEndpoint = `${FASTAPI_URL}/api/v1/cash-flow/quick-forecast`;
        console.log('[API] Calling FastAPI:', fastApiEndpoint);
        
        const response = await fetch(fastApiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        console.log('[API] FastAPI response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API] FastAPI error:', response.status, errorText);
            
            return NextResponse.json({
                success: false,
                error: `FastAPI error: ${response.status}`,
                message: "Unable to generate forecast."
            }, { status: response.status });
        }
        
        const data = await response.json();
        console.log('[API] Forecast generated successfully');
        
        return NextResponse.json(data);
        
    } catch (error) {
        console.error('[API] Exception:', error);
        
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            return NextResponse.json({
                success: false,
                error: 'Cannot connect to FastAPI backend',
                message: `FastAPI backend is not running at ${FASTAPI_URL}`,
                details: error.message
            }, { status: 503 });
        }
        
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}

// Handle GET requests (should be POST only)
export async function GET(request) {
    return NextResponse.json({
        error: 'Method not allowed',
        message: 'This endpoint only accepts POST requests'
    }, { status: 405 });
}