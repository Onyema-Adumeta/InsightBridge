"use client";

import { useState, useEffect } from 'react'; // Import useEffect
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import { useUser } from '@clerk/nextjs'; // Import useUser
import AppSidebar from '@/components/AppSidebar';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); // Get the router
  const { user, isLoaded } = useUser(); // Get the Clerk user

  // --- NEW REDIRECT LOGIC ---
  useEffect(() => {
    // Wait for the user to be loaded
    if (isLoaded) {
      const profileComplete = user?.publicMetadata?.companyProfileComplete === true;
      
      // If user is loaded, profile is not complete, and we are NOT on the settings page...
      if (user && !profileComplete && pathname !== '/settings') {
        router.push('/settings'); // ...redirect to settings
      }
    }
  }, [isLoaded, user, pathname, router]); // Run this check when user or page changes
  // --- END OF NEW LOGIC ---

  // Check if current page is an auth page
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  // If auth page, render without sidebar layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
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

      {/* This <main> tag is PERFECT. It is correctly applying the layout.
        The layout inconsistency you are seeing on other pages is because
        THOSE PAGES are adding a *second* layout wrapper.
      */}
      <main className="flex-1 w-full min-h-screen md:ml-64 pt-16 md:pt-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        {children}
      </main>
    </div>
  );
}