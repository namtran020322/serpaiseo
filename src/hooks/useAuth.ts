import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const done = (s: Session | null, u: User | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(u);
      setLoading(false);
    };

    // Safety timeout - never spin forever
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 10000);

    // Listen for auth changes - use session.user directly, no async getUser
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        done(session ?? null, session?.user ?? null);
      }
    );

    // Initial session check - verify user exists on server once
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: { user: serverUser }, error } = await supabase.auth.getUser();
        if (error || !serverUser) {
          await supabase.auth.signOut();
          done(null, null);
          return;
        }
        done(session, serverUser);
      } else {
        done(null, null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://serp.aiseocore.com',
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
