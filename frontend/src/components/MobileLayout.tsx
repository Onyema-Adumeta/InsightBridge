"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import AppSidebar from "./AppSidebar";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // ✅ Routes that should NOT get the sidebar / mobile header / padding
  const isAuthRoute =
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/sso-callback");

  // ✅ Dashboard route handles its own layout internally
  const isDashboardRoute = pathname === "/dashboard" || pathname?.startsWith("/dashboard");

  // 👉 Let auth pages and dashboard fully control their own layout
  if (isAuthRoute || isDashboardRoute) {
    return <>{children}</>;
  }

  // 👉 Default layout for other pages in the app
  return (
    <div className="relative min-h-screen bg-background">
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur border-b border-border z-30 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="touch-target p-2 hover:bg-muted/50 active:bg-muted rounded-lg transition"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <span className="text-base font-bold text-foreground">InsightBridge</span>
        </div>
      </header>

      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="pt-16 md:pt-0 md:pl-64 w-full min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}