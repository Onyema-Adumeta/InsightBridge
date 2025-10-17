// ApplyCLientSettings.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useSettings } from "@/context/SettingsContext";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";

// Font style mappings
const fontClasses: Record<string, string> = {
  Inter: "font-sans",
  Roboto: "font-roboto",
  "system-ui": "font-mono",
};

export default function ApplyClientSettings({ children }: { children: React.ReactNode }) {
  const { settings, setSettings } = useSettings();
  const { isLoaded, isSignedIn, user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // Only guard these routes (adjust as needed)
  const guarded = useMemo(
    () => pathname?.startsWith("/dashboard"),
    [pathname]
  );

  // Effect 0: Industry onboarding redirect (scoped to guarded routes)
  useEffect(() => {
    if (!guarded) return;                 // only on /dashboard*
    if (!isLoaded) return;                // wait for Clerk
    if (!isSignedIn) return;              // your existing auth layer handles sign-in redirect

    const industry = (user?.publicMetadata?.industry as string) || "";
    if (!industry) {
      router.replace("/onboarding");
    }
  }, [guarded, isLoaded, isSignedIn, user, router]);

  // Effect 1: Fetch settings once
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings", { credentials: "same-origin" });
        if (!response.ok) throw new Error("Failed to fetch settings from API");
        const fetchedSettings = await response.json();
        setSettings(fetchedSettings);
      } catch (error) {
        console.error("Error fetching client settings:", error);
      }
    };
    fetchSettings();
  }, [setSettings]);

  // Effect 2: Apply settings to DOM
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Theme
    root.classList.toggle("dark", settings.theme === "dark");

    // Font size
    root.style.fontSize =
      settings.fontSize === "large" ? "18px" :
      settings.fontSize === "small" ? "14px" : "16px";

    // Font family
    Object.values(fontClasses).forEach((cls) => body.classList.remove(cls));
    if (fontClasses[settings.fontFamily]) {
      body.classList.add(fontClasses[settings.fontFamily]);
    }
  }, [settings]);

  return <>{children}</>;
}
