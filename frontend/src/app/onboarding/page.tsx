"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const INDUSTRIES = ["Generic", "Retail", "SaaS", "Manufacturing"] as const;
type Industry = typeof INDUSTRIES[number];

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [industry, setIndustry] = useState<Industry>("Generic");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    const existing = (user?.publicMetadata?.industry as string) || "";
    if (existing) {
      // Already set—skip onboarding
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, user, router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await user.update({
        publicMetadata: {
          ...(user.publicMetadata || {}),
          industry,
        },
      });
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to save industry.");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) return null;

  // FIXED: Removed <main> wrapper - layout.tsx already provides it
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Quick setup</h1>
      <p className="text-sm text-gray-500 mb-6">
        Choose your industry to tailor insights and recommendations. You can change this later in Settings.
      </p>
      <label className="block text-sm font-medium mb-2">Industry</label>
      <select
        className="w-full rounded-lg border p-2 mb-4"
        value={industry}
        onChange={(e) => setIndustry(e.target.value as Industry)}
      >
        {INDUSTRIES.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg px-4 py-2 bg-black text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Continue"}
      </button>
      {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
    </div>
  );
}