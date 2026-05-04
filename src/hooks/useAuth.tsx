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
      console.log("🔍 Fetching user profile for userId:", userId);

      // First check if profile exists
      const { data: profileCheck, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("📋 Profile check:", profileCheck, profileError);

      // Then check user_roles
      const { data: userRolesCheck, error: rolesError } = await supabase
        .from("user_roles")
        .select(
          `
          role_id,
          roles!fk_user_roles_role_id(role_name, description)
        `
        )
        .eq("user_id", userId);

      console.log("👥 User roles check:", userRolesCheck, rolesError);

      // Now fetch with join - specify the foreign key constraint name
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          `
          *,
          user_roles(
            role_id,
            roles!fk_user_roles_role_id(role_name, description)
          )
        `
        )
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Error fetching user profile:", error);
        return null;
      }

      console.log("✅ User profile loaded:", JSON.stringify(profile, null, 2));
      setUserProfile(profile);
      return profile;
    } catch (error) {
      console.error("❌ Exception fetching user profile:", error);
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
    try {
      // Clear states first to prevent race conditions
      setUser(null);
      setSession(null);
      setUserProfile(null);

      // Then attempt logout from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        // Don't throw error, just log it since user is already cleared locally
      }
    } catch (error) {
      console.error("Error signing out:", error);
      // Don't throw error, user should still be logged out locally
    }
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
