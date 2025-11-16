// Create: src/app/(app)/reconciliation/page.tsx

import { auth } from '@clerk/nextjs/server';
import AutoReconciliation from '@/components/AutoReconciliation';

export default async function ReconciliationPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-gray-900">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-slate-400">Please sign in to access reconciliation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-10 bg-slate-950">
      <AutoReconciliation userId={userId} />
    </div>
  );
}