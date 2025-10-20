// app/layout.tsx

import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import AppSidebar from '@/components/AppSidebar';
import { SettingsProvider } from '@/context/SettingsContext';
import { AnalysisProvider } from '@/context/AnalysisContext'; // 👈 Add this import
import "./globals.css";

export const metadata = {
  title: "InsightBridge",
  description: "Smart Financial Assistant for SMBs",
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <SettingsProvider>
            <AnalysisProvider> {/* 👈 Add AnalysisProvider here */}
              <AppSidebar />
              {children}
            </AnalysisProvider>
          </SettingsProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}