// src/app/(app)/ClientLayout.tsx
"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AppSidebar from '@/components/AppSidebar';
import { Menu } from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  // If auth page, render without sidebar layout
  // Note: This check might not be needed if your (app) group is already
  // separate from your sign-in routes, but it doesn't hurt.
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    // This div provides the light gray background for ALL pages
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Sidebar with open/close control */}
      <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* This is the KEY! This main tag applies the layout to ALL children.
        It has the 'ml-64' on desktop and no margin on mobile.
      */}
      <main className="flex-1 w-full min-h-screen md:ml-64 pt-16 md:pt-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        {children}
      </main>
    </div>
  );
}