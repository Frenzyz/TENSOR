'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FlowchartGenerator from '@/components/FlowchartGenerator';
import { supabase } from '@/lib/supabase/client'; // Import supabase client

export default function Flow() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoadingAuthCheck, setIsLoadingAuthCheck] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoadingAuthCheck(true);
      // Directly check Supabase session instead of localStorage
      const { data: { session } } = await supabase.auth.getSession();
      const authStatus = !!session?.user; // Check if session and user exist
      setIsAuthenticated(authStatus);
      setIsLoadingAuthCheck(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoadingAuthCheck) {
      if (isAuthenticated === false) {
        router.replace('/login');
      } else if (isAuthenticated === true) {
        // Optionally, redirect to dashboard or keep on the homepage
        // If you want to redirect to dashboard after login, use:
        // router.replace('/dashboard');
        // For now, stay on the homepage which renders FlowchartGenerator
      }
    }
  }, [isAuthenticated, router, isLoadingAuthCheck]);

  if (isLoadingAuthCheck) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated !== true) {
    return null; // Do not render FlowchartGenerator if not authenticated (redirection will happen)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <FlowchartGenerator />
    </div>
  );
}
