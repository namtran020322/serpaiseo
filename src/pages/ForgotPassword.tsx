import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import logo from "@/assets/logo.webp";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { TurnstileCaptcha } from "@/components/TurnstileCaptcha";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const verifyTurnstile = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-turnstile', { body: { token } });
      return !error && data?.success === true;
    } catch { return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast({ variant: "destructive", title: t("error"), description: t("captcha.required") });
      return;
    }

    setIsLoading(true);

    const verified = await verifyTurnstile(turnstileToken);
    if (!verified) {
      toast({ variant: "destructive", title: t("error"), description: t("captcha.failed") });
      setTurnstileToken(null);
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ variant: "destructive", title: t("error"), description: error.message });
    } else {
      setEmailSent(true);
      toast({ title: t("forgotPassword.emailSent"), description: t("forgotPassword.emailSentDesc") });
    }

    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("forgotPassword.checkEmail")}</CardTitle>
            <CardDescription>{t("forgotPassword.sentTo")} <strong>{email}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              <p>{t("forgotPassword.checkSpam")}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>{t("forgotPassword.tryAgain")}</Button>
            <Link to="/login" className="text-sm text-primary hover:underline font-medium flex items-center justify-center gap-1">
              <ArrowLeft className="h-4 w-4" />{t("forgotPassword.backToLogin")}
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <img src={logo} alt="SerpAISEO" className="mx-auto h-12 w-auto" />
          <CardTitle className="text-2xl font-bold">{t("forgotPassword.title")}</CardTitle>
          <CardDescription>{t("forgotPassword.subtitle")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <TurnstileCaptcha onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("forgotPassword.sendResetLink")}
            </Button>
            <Link to="/login" className="text-sm text-primary hover:underline font-medium flex items-center justify-center gap-1">
              <ArrowLeft className="h-4 w-4" />{t("forgotPassword.backToLogin")}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
