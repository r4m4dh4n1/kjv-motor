import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useIdleTimeout } from "./useIdleTimeout";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  checkUserApproval: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          `
          *,
          user_roles!inner(
            role_id,
            roles!inner(role_name, description)
          )
        `
        )
        .eq("id", userId)
        .single();

      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  const checkUserApproval = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc("is_user_approved", {
        user_id: user.id,
      });

      if (error) {
        console.error("Error checking approval:", error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error("Error checking approval:", error);
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch user profile when user logs in
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserProfile(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }
    // Clear all states immediately
    setUser(null);
    setSession(null);
    setUserProfile(null);
  };

  // Auto logout after 5 minutes of inactivity
  const handleIdleTimeout = () => {
    signOut();
    toast({
      title: "Sesi berakhir",
      description:
        "Anda telah logout otomatis karena tidak ada aktivitas selama 5 menit",
      variant: "default",
    });
  };

  useIdleTimeout({
    timeout: 5 * 60 * 1000, // 5 minutes in milliseconds
    onTimeout: handleIdleTimeout,
    enabled: !!user, // Only enable when user is logged in
  });

  const value = {
    user,
    session,
    userProfile,
    loading,
    signOut,
    checkUserApproval,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
