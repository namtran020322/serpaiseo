import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Trash2, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RankingCheck {
  id: string;
  keyword: string;
  target_url: string | null;
  country_name: string;
  location_name: string | null;
  language_name: string;
  device: string;
  top_results: number;
  ranking_position: number | null;
  created_at: string;
}

export default function History() {
  const [checks, setChecks] = useState<RankingCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuthContext();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("ranking_checks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to load check history",
      });
    } else {
      setChecks(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("ranking_checks").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to delete this item",
      });
    } else {
      setChecks(checks.filter((c) => c.id !== id));
      toast({
        title: "Deleted",
        description: "Item removed from history",
      });
    }
    setDeletingId(null);
  };

  const getRankingBadge = (position: number | null) => {
    if (position === null) return <Badge variant="secondary">N/A</Badge>;
    if (position <= 3) return <Badge className="bg-green-500">{position}</Badge>;
    if (position <= 10) return <Badge className="bg-blue-500">{position}</Badge>;
    if (position <= 20) return <Badge className="bg-yellow-500">{position}</Badge>;
    return <Badge variant="outline">{position}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Check History</h1>
        <p className="text-muted-foreground mt-2">
          Review previous ranking check results
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            <CardTitle>Recent History</CardTitle>
          </div>
          <CardDescription>
            {checks.length > 0
              ? `${checks.length} checks found`
              : "No check history yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : checks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{check.keyword}</p>
                        {check.target_url && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {check.target_url}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRankingBadge(check.ranking_position)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{check.country_name}</p>
                        {check.location_name && (
                          <p className="text-sm text-muted-foreground">
                            {check.location_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {check.device}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(check.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(check.id)}
                        disabled={deletingId === check.id}
                      >
                        {deletingId === check.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No history yet</p>
                <p className="text-sm text-muted-foreground">
                  Start checking rankings to see history here
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
