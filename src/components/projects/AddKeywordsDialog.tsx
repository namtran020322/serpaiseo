import { useState, useRef } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddKeywordsDialogProps {
  onAddKeywords: (keywords: string[]) => Promise<void>;
  isLoading?: boolean;
}

export function AddKeywordsDialog({ onAddKeywords, isLoading }: AddKeywordsDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [keywordsText, setKeywordsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const MAX_KEYWORDS = 500;
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB

  const parseKeywords = (text: string): string[] => text.split(/[\n,]/).map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0);
  const uniqueKeywords = [...new Set(parseKeywords(keywordsText))];

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ variant: "destructive", title: t("error"), description: t("addKeywords.fileTooLarge") });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newKeywords = parseKeywords(content);
      const existingKeywords = parseKeywords(keywordsText);
      const combined = [...new Set([...existingKeywords, ...newKeywords])];
      if (combined.length > MAX_KEYWORDS) {
        toast({ variant: "destructive", title: t("error"), description: t("addKeywords.tooManyKeywords", { max: MAX_KEYWORDS }) });
        setKeywordsText(combined.slice(0, MAX_KEYWORDS).join("\n"));
      } else {
        setKeywordsText(combined.join("\n"));
      }
      toast({ title: t("addKeywords.fileImported"), description: t("addKeywords.fileImportedDesc", { count: newKeywords.length }) });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (uniqueKeywords.length === 0) {
      toast({ variant: "destructive", title: t("error"), description: t("addKeywords.enterKeyword") });
      return;
    }
    setIsSubmitting(true);
    try { await onAddKeywords(uniqueKeywords); setKeywordsText(""); setOpen(false); }
    catch (error) { /* Error handled by parent */ }
    finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" />{t("addKeywords.title")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("addKeywords.title")}</DialogTitle>
          <DialogDescription>{t("addKeywords.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="keywords">{t("addKeywords.label")}</Label>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileImport} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />{t("addKeywords.importFile")}
                </Button>
              </div>
            </div>
            <Textarea id="keywords" placeholder={t("addKeywords.placeholder")} value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} className="min-h-[200px] font-mono text-sm" />
            <p className="text-sm text-muted-foreground">{t("addKeywords.uniqueCount", { count: uniqueKeywords.length })}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading || uniqueKeywords.length === 0}>
            {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("addKeywords.adding")}</>) : (<><Plus className="mr-2 h-4 w-4" />{t("addKeywords.add", { count: uniqueKeywords.length })}</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}