// src/app/(app)/reconciliation/page.tsx

import { auth } from '@clerk/nextjs/server';
import AutoReconciliation from '@/components/AutoReconciliation';
import { Lock } from 'lucide-react'; // Import a suitable icon

export default async function ReconciliationPage() {
  const { userId } = await auth();

  if (!userId) {
    // Return the "Not Signed In" card directly
    return (
      <div className="flex h-full w-full items-center justify-center">
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
      </div>
    );
  }

  // Return the component directly
  return (
    <AutoReconciliation userId={userId} />
  );
}