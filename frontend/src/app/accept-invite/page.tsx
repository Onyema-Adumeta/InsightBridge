'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid invitation link');
      return;
    }

    // Handle the invitation acceptance logic here
    const acceptInvite = async () => {
      try {
        // Your API call to accept the invitation
        // const response = await fetch(`/api/accept-invite?token=${token}`);
        // if (response.ok) {
        //   setStatus('success');
        //   setMessage('Invitation accepted successfully!');
        //   setTimeout(() => router.push('/dashboard'), 2000);
        // } else {
        //   throw new Error('Failed to accept invitation');
        // }
        
        // Placeholder - replace with your actual logic
        setStatus('success');
        setMessage('Processing invitation...');
      } catch (error) {
        setStatus('error');
        setMessage('Failed to accept invitation. Please try again.');
      }
    };

    acceptInvite();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-800">Processing Invitation</h2>
              <p className="text-gray-600 mt-2">Please wait...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-green-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Success!</h2>
              <p className="text-gray-600 mt-2">{message}</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Error</h2>
              <p className="text-gray-600 mt-2">{message}</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Go to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}