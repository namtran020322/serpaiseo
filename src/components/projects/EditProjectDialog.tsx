import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateProject, Project } from "@/hooks/useProjects";
import { useLanguage } from "@/contexts/LanguageContext";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const { t } = useLanguage();
  const updateProject = useUpdateProject();
  const [name, setName] = useState(project.name);

  useEffect(() => { setName(project.name); }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProject.mutateAsync({ id: project.id, name: name.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("editProject.title")}</DialogTitle>
          <DialogDescription>{t("editProject.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("editProject.projectName")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("editProject.placeholder")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={!name.trim() || updateProject.isPending}>
              {updateProject.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}