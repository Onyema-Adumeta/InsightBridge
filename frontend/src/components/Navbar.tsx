"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-3 shadow-md flex items-center space-x-6">
      <Link href="/" className="font-bold text-lg text-pink-400">
        🧠 InsightBridge
      </Link>
      <div className="flex-grow flex items-center space-x-4">
        <Link href="/upload" className="hover:text-blue-400">Upload</Link>
        <Link href="/pdf-history" className="hover:text-blue-400">PDF History</Link>
        <Link href="/csv-history" className="hover:text-blue-400">CSV Logs</Link>
        
         {/* ✅ ADDED: Settings Link */}
        <Link href="/settings" className="hover:text-blue-400">Settings</Link>
      </div>

      <Link href="/dashboard" className="text-green-400 font-semibold hover:text-green-300">
        Dashboard
      </Link>
    </nav>
  );
}