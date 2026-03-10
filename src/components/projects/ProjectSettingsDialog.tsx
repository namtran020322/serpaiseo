import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProjectWithClasses, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  domain: z.string().min(1, "Domain is required"),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectSettingsDialogProps {
  project: ProjectWithClasses;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsDialog({ project, open, onOpenChange }: ProjectSettingsDialogProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: project.name, domain: project.domain },
  });

  useEffect(() => { form.reset({ name: project.name, domain: project.domain }); }, [project, form]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateProject.mutateAsync({ id: project.id, name: data.name });
      onOpenChange(false);
    } catch (error) { console.error("Failed to update project:", error); }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id);
      onOpenChange(false);
      navigate("/dashboard/projects");
    } catch (error) { console.error("Failed to delete project:", error); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("projectSettings.title")}</DialogTitle>
          <DialogDescription>{t("projectSettings.description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("projectSettings.projectName")}</FormLabel>
                <FormControl><Input placeholder="My Website" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="domain" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("projectSettings.domain")}</FormLabel>
                <FormControl><Input placeholder="example.com" {...field} disabled className="bg-muted cursor-not-allowed" /></FormControl>
                <p className="text-xs text-muted-foreground">{t("projectSettings.domainReadonly")}</p>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4" />{t("projectSettings.deleteProject")}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("projectSettings.deleteProject")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("projectSettings.deleteConfirm", { name: project.name })}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleteProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}