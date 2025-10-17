// src/app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();  // ✅ fixed
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Simulated DB fetch
    const userSettings = { theme: 'dark' };
    return NextResponse.json(userSettings);

  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();  // ✅ fixed
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    console.log('Updating settings for user:', userId, 'with:', body);

    return NextResponse.json({ message: 'Settings updated successfully' });

  } catch (error) {
    console.error("[SETTINGS_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
