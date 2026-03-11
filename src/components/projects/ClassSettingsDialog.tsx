import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectClassWithKeywords, useUpdateClass, useDeleteClass } from "@/hooks/useProjects";
import { Loader2, Trash2, X, Plus, Lock, AlertCircle, Settings2, Search, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";
import { useCredits } from "@/hooks/useCredits";
import { getMaxCompetitorsByPurchased } from "@/lib/pricing";
import { useLanguage } from "@/contexts/LanguageContext";
import { InfoTooltip } from "@/components/InfoTooltip";

const formSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  countryId: z.string().min(1),
  languageCode: z.string().min(1),
  device: z.string().min(1),
  topResults: z.number().min(10).max(100),
  schedule: z.string().nullable(),
  scheduleTime: z.string().default("08:00"),
});

type FormData = z.infer<typeof formSchema>;

interface ClassSettingsDialogProps {
  projectClass: ProjectClassWithKeywords;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassSettingsDialog({ projectClass, open, onOpenChange }: ClassSettingsDialogProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { t } = useLanguage();
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const { totalPurchased } = useCredits();
  const maxCompetitors = getMaxCompetitorsByPurchased(totalPurchased);
  const [competitorDomains, setCompetitorDomains] = useState<string[]>(projectClass.competitor_domains || []);
  const [newCompetitor, setNewCompetitor] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: projectClass.name, countryId: projectClass.country_id, languageCode: projectClass.language_code,
      device: projectClass.device, topResults: projectClass.top_results, schedule: projectClass.schedule,
      scheduleTime: (projectClass as any).schedule_time || "08:00",
    },
  });

  useEffect(() => {
    form.reset({ name: projectClass.name, countryId: projectClass.country_id, languageCode: projectClass.language_code, device: projectClass.device, topResults: projectClass.top_results, schedule: projectClass.schedule, scheduleTime: (projectClass as any).schedule_time || "08:00" });
    setCompetitorDomains(projectClass.competitor_domains || []);
  }, [projectClass, form]);

  const isAtCompetitorLimit = competitorDomains.length >= maxCompetitors;

  const onSubmit = async (data: FormData) => {
    const country = countries.find((c) => c.id === data.countryId);
    const language = languages.find((l) => l.lang === data.languageCode);
    try {
      await updateClass.mutateAsync({ id: projectClass.id, name: data.name, competitorDomains, countryId: data.countryId, countryName: country?.name || projectClass.country_name, languageCode: data.languageCode, languageName: language?.name || projectClass.language_name, device: data.device, topResults: data.topResults, schedule: data.schedule, scheduleTime: data.scheduleTime });
      onOpenChange(false);
    } catch (error) { console.error("Failed to update class:", error); }
  };

  const handleDelete = async () => {
    try { await deleteClass.mutateAsync(projectClass.id); onOpenChange(false); navigate(`/dashboard/projects/${projectId}`); }
    catch (error) { console.error("Failed to delete class:", error); }
  };

  const extractRootDomain = (input: string): string => {
    try { const urlString = input.includes("://") ? input : `https://${input}`; const url = new URL(urlString); return url.hostname.replace(/^www\./, "").toLowerCase(); }
    catch { return input.trim().replace(/^www\./, "").toLowerCase(); }
  };

  const addCompetitor = () => {
    if (isAtCompetitorLimit) return;
    const domain = extractRootDomain(newCompetitor);
    if (domain && !competitorDomains.includes(domain)) { setCompetitorDomains([...competitorDomains, domain]); setNewCompetitor(""); }
  };

  const removeCompetitor = (domain: string) => setCompetitorDomains(competitorDomains.filter((d) => d !== domain));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("classSettings.title")}</DialogTitle>
          <DialogDescription>{t("classSettings.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" className="gap-1.5"><Settings2 className="h-4 w-4" />{t("classSettings.general")}</TabsTrigger>
                <TabsTrigger value="search" className="gap-1.5"><Search className="h-4 w-4" />{t("classSettings.searchSettings")}</TabsTrigger>
                <TabsTrigger value="competitors" className="gap-1.5"><Users className="h-4 w-4" />{t("classSettings.competitors")}</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>{t("classSettings.className")}</FormLabel><FormControl><Input placeholder="Main Keywords" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="schedule" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">{t("classSettings.autoCheck")} <InfoTooltip text={t("tooltip.schedule")} /></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("classSettings.selectSchedule")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("classSettings.noSchedule")}</SelectItem>
                        <SelectItem value="daily">{t("classSettings.daily")}</SelectItem>
                        <SelectItem value="weekly">{t("classSettings.weekly")}</SelectItem>
                        <SelectItem value="monthly">{t("classSettings.monthly")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {form.watch("schedule") && form.watch("schedule") !== "none" && (
                  <FormField control={form.control} name="scheduleTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("classSettings.checkTime")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "08:00"}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("classSettings.selectTime")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => { const hour = i.toString().padStart(2, '0'); return <SelectItem key={hour} value={`${hour}:00`}>{hour}:00</SelectItem>; })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{t("classSettings.vietnamTime")}</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </TabsContent>

              <TabsContent value="search" className="space-y-4 pt-4">
                <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /><span>{t("classSettings.searchParamsLocked")}</span></div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div><p className="text-xs text-muted-foreground mb-1">{t("classSettings.country")}</p><p className="font-medium">{projectClass.country_name}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1">{t("classSettings.language")}</p><p className="font-medium">{projectClass.language_name}</p></div>
                    <div><p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">{t("classSettings.device")} <InfoTooltip text={t("tooltip.device")} /></p><p className="font-medium capitalize">{projectClass.device}</p></div>
                  </div>
                </div>
                <FormField control={form.control} name="topResults" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">{t("classSettings.topResults")} <InfoTooltip text={t("tooltip.topResults")} /></FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("classSettings.selectTopResults")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="10">Top 10</SelectItem><SelectItem value="30">Top 30</SelectItem>
                        <SelectItem value="50">Top 50</SelectItem><SelectItem value="100">Top 100</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="competitors" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-1.5">{t("classSettings.competitorDomains")} <InfoTooltip text={t("tooltip.competitors")} /></FormLabel>
                    <span className={`text-xs ${isAtCompetitorLimit ? 'text-destructive' : 'text-muted-foreground'}`}>{competitorDomains.length}/{maxCompetitors}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="competitor.com" value={newCompetitor} onChange={(e) => setNewCompetitor(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }} disabled={isAtCompetitorLimit} />
                    <Button type="button" variant="outline" onClick={addCompetitor} disabled={isAtCompetitorLimit}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {isAtCompetitorLimit && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span>{t("classSettings.competitorLimit", { max: maxCompetitors })} <a href="/dashboard/billing" className="underline">{t("classSettings.competitorUpgrade")}</a></span>
                    </div>
                  )}
                  {competitorDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {competitorDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="gap-1">{domain}<button type="button" onClick={() => removeCompetitor(domain)} className="ml-1 rounded-full hover:bg-muted"><X className="h-3 w-3" /></button></Badge>
                      ))}
                    </div>
                  )}
                  {competitorDomains.length === 0 && <p className="text-sm text-muted-foreground">{t("classSettings.noCompetitors")}</p>}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4" />{t("classSettings.deleteClass")}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("classSettings.deleteClass")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("classSettings.deleteConfirm", { name: projectClass.name })}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleteClass.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={updateClass.isPending}>
                {updateClass.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}