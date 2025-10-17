import { auth, currentUser } from "@clerk/nextjs/server";

export async function getSafeAuth() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    return { userId, user, error: null };
  } catch (error: any) {
    console.error("🔒 Clerk auth error:", error?.message || error);
    return { userId: null, user: null, error };
  }
}
