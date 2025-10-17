// In /app/accept-invite/page.tsx
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs'; // Assuming you use Clerk for auth
import { useEffect } from 'react';

export default function AcceptInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const token = searchParams.get('token');

    useEffect(() => {
        // Once the user is loaded and we have a token
        if (isLoaded && token) {
            if (user) {
                // If user is already logged in, accept the invite
                fetch(`/api/invites/accept?token=${token}&user_id=${user.id}`, { method: 'POST' })
                    .then(() => router.push('/dashboard')); // Redirect to dashboard
            } else {
                // If user is not logged in, redirect them to sign up
                // Pass the invite token along so we can claim it after sign-up
                router.push(`/sign-up?redirect_url=/accept-invite?token=${token}`);
            }
        }
    }, [isLoaded, user, token, router]);

    return <div>Verifying your invitation...</div>;
}