import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const companyContext = await request.json();

    // --- YOUR LOGIC HERE ---
    // 1. Save the companyContext data to your own database
    // await db.company.create({ data: { ...companyContext, userId: userId } });
    console.log('Saving company context for user:', userId, companyContext);
    // ------------------------


    // --- CLERK LOGIC ---
    // 2. Set the "companyProfileComplete" flag in Clerk's public metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        companyProfileComplete: true
      }
    });
    // -------------------

    return NextResponse.json({ success: true, message: 'Context saved.' });

  } catch (error) {
    console.error('Failed to save company context:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}