// app/layout.tsx

import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import ConditionalSidebar from '@/components/ConditionalSidebar';
import { SettingsProvider } from '@/context/SettingsContext';
import { AnalysisProvider } from '@/context/AnalysisContext';
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
            <AnalysisProvider>
              <ConditionalSidebar />
              {children}
            </AnalysisProvider>
          </SettingsProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}