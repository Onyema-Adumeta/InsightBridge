// This is the page.tsx file that should go in:
// frontend/src/app/(app)/cash-flow/page.tsx

import { auth } from '@clerk/nextjs/server';
import CashFlowForecast from '@/components/CashFlowForecast';

export const metadata = {
  title: 'Cash Flow Forecast | InsightBridge',
  description: 'AI-powered cash flow forecasting to prevent bankruptcy',
};

export default async function CashFlowPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h1>
          <p className="text-gray-600">You need to be signed in to view cash flow forecasts.</p>
        </div>
      </div>
    );
  }

  return <CashFlowForecast userId={userId} />;
}