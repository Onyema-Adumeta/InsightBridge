'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from './AppSidebar';

export default function ConditionalSidebar() {
  const pathname = usePathname();
  
  // Don't show sidebar on auth pages
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')) {
    return null;
  }
  
  return <AppSidebar />;
}