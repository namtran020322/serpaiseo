import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export function useHeaderAnnouncements() {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["header-announcements", user?.id],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}
