import { useState, useRef } from "react";
import { Plus, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AddKeywordsDialogProps {
  onAddKeywords: (keywords: string[]) => Promise<void>;
  isLoading?: boolean;
}

export function AddKeywordsDialog({ onAddKeywords, isLoading }: AddKeywordsDialogProps) {
  const [open, setOpen] = useState(false);
  const [keywordsText, setKeywordsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseKeywords = (text: string): string[] => {
    return text
      .split(/[\n,]/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
  };

  const uniqueKeywords = [...new Set(parseKeywords(keywordsText))];

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newKeywords = parseKeywords(content);
      const existingKeywords = parseKeywords(keywordsText);
      const combined = [...new Set([...existingKeywords, ...newKeywords])];
      setKeywordsText(combined.join("\n"));
      toast({
        title: "File imported",
        description: `Added ${newKeywords.length} keywords from file`,
      });
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (uniqueKeywords.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one keyword",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddKeywords(uniqueKeywords);
      setKeywordsText("");
      setOpen(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Keywords
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Keywords</DialogTitle>
          <DialogDescription>
            Enter keywords to track, one per line or separated by commas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="keywords">Keywords</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileImport}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import File
                </Button>
              </div>
            </div>
            <Textarea
              id="keywords"
              placeholder="Enter keywords, one per line..."
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              {uniqueKeywords.length} unique keyword{uniqueKeywords.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading || uniqueKeywords.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add {uniqueKeywords.length} Keyword{uniqueKeywords.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
