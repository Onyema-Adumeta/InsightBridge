// src/app/(app)/layout.tsx
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// 1. Import the new ClientLayout we just made
import ClientLayout from './ClientLayout';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await clerkClient.users.getUser(userId);
  const profileComplete = user.publicMetadata?.companyProfileComplete === true;
  const pathname = headers().get('next-url') || '';

  // 2. This is the new user redirect logic
  if (!profileComplete && !pathname.startsWith('/settings')) {
    redirect('/settings');
  }
  
  // 3. Render the ClientLayout, which contains the sidebar and main tag
  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  );
}