"use client";

import { AnalysisProvider } from '@/context/AnalysisContext';
import AppSidebar from '@/components/AppSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnalysisProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex-1 ml-64 p-10 overflow-auto">
          {children}
        </main>
      </div>
    </AnalysisProvider>
  );
}