// src/app/api/company-context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET(_req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await clerkClient.users.getUser(userId);
    const publicMetadata = (user.publicMetadata || {}) as Record<string, any>;

    const companyContext = publicMetadata.companyContext ?? null;
    const companyProfileComplete =
      publicMetadata.companyProfileComplete === true;

    return NextResponse.json(
      {
        success: true,
        companyContext,
        companyProfileComplete,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[company-context GET] Failed to load company context:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const companyContext = await req.json();

    // --- YOUR PERSISTENCE LOGIC (optional / later) ---
    // Here you could save to your own DB instead of / in addition to Clerk:
    // await db.companyContext.upsert({ where: { userId }, update: companyContext, create: { ...companyContext, userId } });
    console.log("[company-context POST] Saving company context for user:", userId, companyContext);

    // Save to Clerk publicMetadata so onboarding / guards can read it
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        companyContext,
        companyProfileComplete: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Context saved.",
        companyContext,
        companyProfileComplete: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[company-context POST] Failed to save company context:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
