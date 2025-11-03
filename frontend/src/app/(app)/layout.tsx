"use client";

import AppSidebar from '@/components/AppSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 ml-64 p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}