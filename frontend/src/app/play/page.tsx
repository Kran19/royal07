'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
function PlayLauncher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session');

  useEffect(() => {
    if (sessionToken) {
      // For federated seamless launch, we store the session token exactly as if the user logged in
      localStorage.setItem('auth_token', sessionToken);
      
      // Redirect to the main game interface
      router.replace('/user');
    } else {
      // No session token provided, redirect to home/login
      router.replace('/');
    }
  }, [sessionToken, router]);

  return null;
}

export default function PlayRoute() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold tracking-widest text-slate-300">
        LOADING GAME...
      </h2>
      <p className="text-slate-500 mt-2">Authenticating Session</p>

      <Suspense fallback={null}>
        <PlayLauncher />
      </Suspense>
    </div>
  );
}
