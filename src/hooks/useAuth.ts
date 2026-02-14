import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isJudge, setIsJudge] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRole = useCallback(async (userId: string) => {
    const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", userId);
    const roles = (data || []).map((r: any) => r.role);
    setIsJudge(roles.includes("judge") || roles.includes("admin"));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await checkRole(currentUser.id);
      } else {
        setIsJudge(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession();

    return () => subscription.unsubscribe();
  }, [checkRole]);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    // Create profile after signup
    if (result.data.user) {
      await (supabase as any).from("profiles").insert({
        user_id: result.data.user.id,
        email,
      });
    }
    return result;
  };

  const signOut = async () => {
    setIsJudge(false);
    return supabase.auth.signOut();
  };

  return { user, isJudge, loading, signIn, signUp, signOut };
}
