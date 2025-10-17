// src/app/settings/page.tsx  (This is the NEW file)

import SettingsClientPage from './settings-client-page';

// We still need this to tell Next.js the route is dynamic
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  // This Server Component just renders our Client Component.
  return <SettingsClientPage />;
}