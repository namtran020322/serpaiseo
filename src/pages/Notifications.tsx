import { Bell, Info, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  starts_at: string | null;
  expires_at: string | null;
}

const typeConfig = {
  info: {
    icon: Info,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  warning: {
    icon: AlertTriangle,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
  },
  success: {
    icon: CheckCircle,
    color: "bg-green-500/10 text-green-600 border-green-200",
    badge: "bg-green-100 text-green-700",
  },
};

export default function Notifications() {
  const { user } = useAuthContext();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["user-announcements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!user,
  });

  const getTypeConfig = (type: string) => {
    return typeConfig[type as keyof typeof typeConfig] || typeConfig.info;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated with the latest announcements and news
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const config = getTypeConfig(announcement.type);
            const Icon = config.icon;

            return (
              <Card key={announcement.id} className={`border ${config.color}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={config.badge}>
                      {announcement.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              When there are new announcements or updates, they will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
