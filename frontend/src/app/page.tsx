import { SignedIn, SignedOut } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default function HomePage() {
  return (
    <>
      <SignedIn>
        {redirect('/dashboard')}
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome to InsightBridge</h1>
            <p className="text-xl mb-8">Please sign in to continue</p>
            <a href="/sign-in" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
              Sign In
            </a>
          </div>
        </div>
      </SignedOut>
    </>
  );
}