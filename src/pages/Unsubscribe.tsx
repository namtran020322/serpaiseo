import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <MailX className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <CardTitle>Email Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">Validating...</p>
            </div>
          )}
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Click the button below to unsubscribe from email notifications.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-muted-foreground">You have been successfully unsubscribed.</p>
            </div>
          )}
          {status === "already" && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">You are already unsubscribed.</p>
            </div>
          )}
          {status === "invalid" && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-muted-foreground">Invalid or expired unsubscribe link.</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-muted-foreground">Something went wrong. Please try again later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
