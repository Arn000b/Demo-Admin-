import { redirect } from 'next/navigation';

/**
 * Root page — redirect to the app dashboard.
 * Unauthenticated users are redirected to /login in the middleware.
 */
export default function RootPage() {
  redirect('/dashboard');
}
