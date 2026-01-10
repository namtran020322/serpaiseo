import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectClassWithKeywords, useUpdateClass, useDeleteClass } from "@/hooks/useProjects";
import { Loader2, Trash2, X, Plus, Lock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";

const formSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  countryId: z.string().min(1, "Country is required"),
  languageCode: z.string().min(1, "Language is required"),
  device: z.string().min(1, "Device is required"),
  topResults: z.number().min(10).max(100),
  schedule: z.string().nullable(),
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
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const [competitorDomains, setCompetitorDomains] = useState<string[]>(projectClass.competitor_domains || []);
  const [newCompetitor, setNewCompetitor] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: projectClass.name,
      countryId: projectClass.country_id,
      languageCode: projectClass.language_code,
      device: projectClass.device,
      topResults: projectClass.top_results,
      schedule: projectClass.schedule,
    },
  });

  // Reset form when projectClass changes
  useEffect(() => {
    form.reset({
      name: projectClass.name,
      countryId: projectClass.country_id,
      languageCode: projectClass.language_code,
      device: projectClass.device,
      topResults: projectClass.top_results,
      schedule: projectClass.schedule,
    });
    setCompetitorDomains(projectClass.competitor_domains || []);
  }, [projectClass, form]);

  const selectedCountry = countries.find((c) => c.id === form.watch("countryId"));

  const onSubmit = async (data: FormData) => {
    const country = countries.find((c) => c.id === data.countryId);
    const language = languages.find((l) => l.lang === data.languageCode);

    try {
      await updateClass.mutateAsync({
        id: projectClass.id,
        name: data.name,
        competitorDomains,
        countryId: data.countryId,
        countryName: country?.name || projectClass.country_name,
        languageCode: data.languageCode,
        languageName: language?.name || projectClass.language_name,
        device: data.device,
        topResults: data.topResults,
        schedule: data.schedule,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update class:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClass.mutateAsync(projectClass.id);
      onOpenChange(false);
      navigate(`/dashboard/projects/${projectId}`);
    } catch (error) {
      console.error("Failed to delete class:", error);
    }
  };

  const addCompetitor = () => {
    const domain = newCompetitor.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (domain && !competitorDomains.includes(domain)) {
      setCompetitorDomains([...competitorDomains, domain]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (domain: string) => {
    setCompetitorDomains(competitorDomains.filter((d) => d !== domain));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Class Settings</DialogTitle>
          <DialogDescription>
            Update class configuration, search settings, or competitors.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="search">Search Settings</TabsTrigger>
                <TabsTrigger value="competitors">Competitors</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Keywords" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-check Schedule</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No automatic checks</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="search" className="space-y-4 pt-4">
                {/* Read-only search parameters */}
                <div className="rounded-md bg-muted p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Search parameters cannot be changed after creation to maintain data consistency</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Country</p>
                      <p className="font-medium">{projectClass.country_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Language</p>
                      <p className="font-medium">{projectClass.language_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Device</p>
                      <p className="font-medium capitalize">{projectClass.device}</p>
                    </div>
                  </div>
                </div>
                
                {/* Editable Top Results */}
                <FormField
                  control={form.control}
                  name="topResults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Top Results</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select top results" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="10">Top 10</SelectItem>
                          <SelectItem value="30">Top 30</SelectItem>
                          <SelectItem value="50">Top 50</SelectItem>
                          <SelectItem value="100">Top 100</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="competitors" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <FormLabel>Competitor Domains</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="competitor.com"
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCompetitor();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addCompetitor}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {competitorDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {competitorDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="gap-1">
                          {domain}
                          <button
                            type="button"
                            onClick={() => removeCompetitor(domain)}
                            className="ml-1 rounded-full hover:bg-muted"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {competitorDomains.length === 0 && (
                    <p className="text-sm text-muted-foreground">No competitor domains added</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Class
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Class</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{projectClass.name}"? This will permanently delete all keywords associated with this class. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleteClass.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={updateClass.isPending}>
                {updateClass.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
