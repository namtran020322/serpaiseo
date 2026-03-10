import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, ArrowRight, Plus, TrendingUp, Target } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Dashboard() {
  const { user } = useAuthContext();
  const { t } = useLanguage();
  const userName = user?.user_metadata?.full_name || "there";

  return (
    <div className="space-y-8">
      <AnnouncementBanner />
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.hello", { name: userName })}</h1>
        <p className="text-muted-foreground mt-2">
          {t("dashboard.welcome")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t("dashboard.projects")}</CardTitle>
            <CardDescription>
              {t("dashboard.projects.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full group">
              <Link to="/dashboard/projects">
                {t("dashboard.viewProjects")}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-emerald-500" />
            </div>
            <CardTitle>{t("dashboard.createProject")}</CardTitle>
            <CardDescription>
              {t("dashboard.createProject.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/projects">
                {t("dashboard.newProject")}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <CardTitle>{t("dashboard.trackRankings")}</CardTitle>
            <CardDescription>
              {t("dashboard.trackRankings.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full group">
              <Link to="/dashboard/projects">
                {t("dashboard.getStarted")}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.howToUse")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-medium">{t("dashboard.step1.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.step1.desc")}
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-medium">{t("dashboard.step2.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.step2.desc")}
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-medium">{t("dashboard.step3.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.step3.desc")}
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
              4
            </div>
            <div>
              <h4 className="font-medium">{t("dashboard.step4.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.step4.desc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
