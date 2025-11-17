// Create: src/app/(app)/reconciliation/page.tsx

import { auth } from '@clerk/nextjs/server';
import AutoReconciliation from '@/components/AutoReconciliation';
import { Lock } from 'lucide-react'; // Import a suitable icon

export default async function ReconciliationPage() {
  const { userId } = await auth();

  if (!userId) {
    // ✅ FIX 1: Add layout wrapper and light theme to "Not Signed In" state
    return (
      <main className="ml-64 flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="text-center text-gray-900 max-w-md p-8 bg-white border border-gray-200 rounded-lg shadow">
          <div className="mb-6">
            <Lock className="w-16 h-16 mx-auto text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please sign in to access reconciliation</p>
          <a 
            href="/sign-in" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Sign In
          </a>
        </div>
      </main>
    );
  }

  // ✅ FIX 2: Apply the correct layout wrapper
  return (
    <main className="ml-64 min-h-screen bg-gray-50 p-8">
      <AutoReconciliation userId={userId} />
    </main>
  );
}