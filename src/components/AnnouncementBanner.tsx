import { useQuery } from "@tanstack/react-query";
import { X, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
}

export function AnnouncementBanner() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed announcements from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("dismissed-announcements");
    if (stored) {
      try {
        setDismissedIds(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const { data: announcements } = useQuery({
    queryKey: ["active-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, content, type")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        return [];
      }

      return data as Announcement[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem("dismissed-announcements", JSON.stringify(newDismissed));
  };

  const visibleAnnouncements = announcements?.filter(a => !dismissedIds.includes(a.id)) || [];

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: string): "default" | "destructive" => {
    return type === "warning" ? "destructive" : "default";
  };

  return (
    <div className="space-y-2 mb-6">
      {visibleAnnouncements.map((announcement) => (
        <Alert 
          key={announcement.id} 
          variant={getVariant(announcement.type)}
          className={announcement.type === "success" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}
        >
          {getIcon(announcement.type)}
          <AlertTitle className="flex items-center justify-between">
            {announcement.title}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2"
              onClick={() => handleDismiss(announcement.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>{announcement.content}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
