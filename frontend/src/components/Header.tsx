// app/components/Header.tsx

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export default function Header() {
  return (
    <header className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto flex items-center justify-between p-4">
        {/* Your App Logo/Name */}
        <Link href="/dashboard" className="text-xl font-bold hover:text-blue-400 transition-colors">
          InsightBridge
        </Link>

        {/* User Button from Clerk */}
        <div className="flex items-center">
          {/* This component automatically renders the user's avatar */}
          {/* and a dropdown for "Manage Account" and "Sign Out"     */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}