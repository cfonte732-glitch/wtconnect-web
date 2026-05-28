'use client';

import { useEffect } from 'react';
import { authSupabase } from '@/lib/auth-client';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, session, loading, setUser, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const { data } = await authSupabase.auth.getSession();
      if (data.session) {
        setSession(data.session as never);
        setUser(data.session.user as never);
      }
      setLoading(false);
    };
    void init();

    const { data: sub } = authSupabase.auth.onAuthStateChange((_event, sess) => {
      if (sess) {
        setSession(sess as never);
        setUser(sess.user as never);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [setUser, setSession, setLoading]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await authSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authSupabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return { user, session, loading, signIn, signOut };
}
