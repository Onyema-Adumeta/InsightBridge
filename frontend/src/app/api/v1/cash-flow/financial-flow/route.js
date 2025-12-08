import { NextResponse } from 'next/server';

// Dynamically determine backend URL based on environment
function getBackendUrl() {
    // 1. If explicitly set in environment, use that
    if (process.env.FASTAPI_URL) {
        return process.env.FASTAPI_URL;
    }
    
    // 2. If in production/Azure, use relative path (same domain)
    if (process.env.NODE_ENV === 'production') {
        // In Azure, your Next.js and FastAPI should be on same domain
        // or you can set FASTAPI_URL in Azure environment variables
        return ''; // Empty string means same origin
    }
    
    // 3. Local development fallback
    return 'http://localhost:8000';
}

const FASTAPI_URL = getBackendUrl();

export async function GET(request) {
    console.log('=== Cash Flow API Route Called ===');
    console.log('[API Route] Environment:', process.env.NODE_ENV);
    console.log('[API Route] Backend URL:', FASTAPI_URL || 'same-origin');
    
    try {
        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const months = searchParams.get('months') || '1';
        
        // Build the FastAPI endpoint URL
        let fastApiEndpoint = `${FASTAPI_URL}/api/v1/cash-flow/financial-flow?months=${months}`;
        if (userId) {
            fastApiEndpoint += `&user_id=${userId}`;
        }
        
        console.log('[API Route] Calling FastAPI:', fastApiEndpoint);
        
        // Call FastAPI backend
        const response = await fetch(fastApiEndpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        console.log('[API Route] FastAPI response status:', response.status);
        
        // Handle non-OK responses
        if (!response.ok) {
            console.error('[API Route] FastAPI error:', response.status);
            
            // Try to get error details
            let errorDetails;
            try {
                errorDetails = await response.text();
                console.error('[API Route] Error details:', errorDetails);
            } catch (e) {
                errorDetails = 'Could not read error details';
            }
            
            // Return empty state with error info
            return NextResponse.json({
                success: false,
                empty: true,
                nodes: [],
                links: [],
                error: `FastAPI error: ${response.status}`,
                details: errorDetails,
                message: "Unable to load cash flow data. Please check your FastAPI backend."
            }, { status: 200 }); // Return 200 so frontend can handle gracefully
        }
        
        // Parse successful response
        const data = await response.json();
        console.log('[API Route] Data received:', {
            success: data.success,
            nodeCount: data.nodes?.length || 0,
            linkCount: data.links?.length || 0,
            hasError: !!data.error
        });
        
        // Check if data is empty
        if (!data.nodes || data.nodes.length === 0) {
            console.log('[API Route] No data available');
            return NextResponse.json({
                success: true,
                empty: true,
                nodes: [],
                links: [],
                message: data.message || "No transaction data available."
            });
        }
        
        // Return successful data
        return NextResponse.json(data);
        
    } catch (error) {
        console.error('[API Route] Exception:', error);
        
        // Check if FastAPI is unreachable
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            return NextResponse.json({
                success: false,
                empty: true,
                nodes: [],
                links: [],
                error: 'Cannot connect to FastAPI backend',
                message: `FastAPI backend is not running at ${FASTAPI_URL}. Please start your FastAPI server.`,
                details: error.message
            }, { status: 200 }); // Return 200 so frontend can display message
        }
        
        return NextResponse.json({
            success: false,
            empty: true,
            nodes: [],
            links: [],
            error: 'Internal server error',
            message: error.message
        }, { status: 200 }); // Return 200 so frontend can handle
    }
}

// Health check endpoint
export async function POST(request) {
    return NextResponse.json({
        status: 'This endpoint only accepts GET requests',
        availableMethods: ['GET']
    }, { status: 405 });
}