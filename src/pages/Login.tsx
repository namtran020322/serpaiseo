import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.webp";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { TurnstileCaptcha } from "@/components/TurnstileCaptcha";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const { signIn, user, loading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  const isPreview = window.location.hostname.includes('lovableproject.com') || window.location.hostname.includes('lovable.app');

  // Auto-set dummy token in preview so captcha doesn't block login
  useEffect(() => {
    if (isPreview && !turnstileToken) {
      setTurnstileToken('preview-bypass');
    }
  }, [isPreview, turnstileToken]);

  const verifyTurnstile = async (token: string): Promise<boolean> => {
    if (isPreview) return true; // Skip captcha verification in preview/staging
    try {
      const { data, error } = await supabase.functions.invoke('verify-turnstile', { body: { token } });
      return !error && data?.success === true;
    } catch { return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast({ variant: "destructive", title: t("login.failed"), description: t("captcha.required") });
      return;
    }

    setIsLoading(true);

    try {
      const verified = await Promise.race([
        verifyTurnstile(turnstileToken),
        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error("Captcha verification timeout")), 15000)),
      ]);

      if (!verified) {
        toast({ variant: "destructive", title: t("login.failed"), description: t("captcha.failed") });
        setTurnstileToken(null);
        setIsLoading(false);
        return;
      }

      const result = await Promise.race([
        signIn(email, password),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Login timeout. Please try again.")), 15000)),
      ]);

      if (result.error) {
        toast({ variant: "destructive", title: t("login.failed"), description: result.error.message });
      } else {
        toast({ title: t("login.success"), description: t("login.welcomeBack") });
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast({ variant: "destructive", title: t("login.failed"), description: err.message || "An unexpected error occurred" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center space-y-4">
          <img src={logo} alt="SerpAISEO" className="mx-auto h-12 w-auto" />
          <CardTitle className="text-2xl font-bold">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">{t("login.forgotPassword")}</Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <TurnstileCaptcha onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading || !turnstileToken}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login.signIn")}
            </Button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("login.orContinueWith")}</span>
              </div>
            </div>
            
            <Button type="button" variant="outline" className="w-full" onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://serp.aiseocore.com/dashboard' } });
              if (error) { toast({ variant: "destructive", title: t("error"), description: error.message }); }
            }}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("login.continueWithGoogle")}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              {t("login.noAccount")}{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">{t("login.signUpNow")}</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
