import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Plus, Upload } from "lucide-react";
import { useCreateClass, useCheckRankings } from "@/hooks/useProjects";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";
import { useGeoData } from "@/hooks/useGeoData";
import { LocationCombobox } from "@/components/LocationCombobox";

interface AddClassDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  projectId: string;
  projectName?: string;
  projectDomain?: string;
}

type Step = 1 | 2 | 3 | 4;

export function AddClassDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, projectId, projectName, projectDomain }: AddClassDialogProps) {
  const createClass = useCreateClass();
  const checkRankings = useCheckRankings();
  const { getLocationsByCountry } = useGeoData();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const onOpenChange = controlledOnOpenChange ?? setInternalOpen;

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Class & Domain - use projectDomain if provided
  const [className, setClassName] = useState("");
  const effectiveDomain = projectDomain || "";
  const [domain, setDomain] = useState(effectiveDomain);
  const [competitorDomains, setCompetitorDomains] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");

  // Step 2: Keywords
  const [keywordsText, setKeywordsText] = useState("");

  // Step 3: Search Settings
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [device, setDevice] = useState("desktop");
  const [topResults, setTopResults] = useState("100");

  // Step 4: Schedule
  const [schedule, setSchedule] = useState<string | null>(null);

  const filteredLocations = useMemo(() => {
    if (!country) return [];
    const selectedCountry = countries.find((c) => c.id === country);
    if (!selectedCountry) return [];
    return getLocationsByCountry(selectedCountry.code);
  }, [country, getLocationsByCountry]);

  const resetForm = () => {
    setStep(1);
    setClassName("");
    setDomain("");
    setCompetitorDomains([]);
    setNewCompetitor("");
    setKeywordsText("");
    setCountry("");
    setLocation("");
    setLanguage("");
    setDevice("desktop");
    setTopResults("100");
    setSchedule(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Extract root domain from URL
  const extractRootDomain = (input: string): string => {
    try {
      const urlString = input.includes("://") ? input : `https://${input}`;
      const url = new URL(urlString);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return input.trim().replace(/^www\./, "");
    }
  };

  const addCompetitor = () => {
    const cleanDomain = extractRootDomain(newCompetitor);
    if (cleanDomain && !competitorDomains.includes(cleanDomain)) {
      setCompetitorDomains([...competitorDomains, cleanDomain]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (domain: string) => {
    setCompetitorDomains(competitorDomains.filter((d) => d !== domain));
  };

  const parseKeywords = (): string[] => {
    return keywordsText
      .split("\n")
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return className.trim().length > 0 && domain.trim().length > 0;
      case 2:
        return parseKeywords().length > 0;
      case 3:
        return country.length > 0 && language.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);

    try {
      const selectedCountry = countries.find((c) => c.id === country);
      const selectedLanguage = languages.find((l) => l.lang === language);
      const selectedLocation = filteredLocations.find((l) => l.id === location);

      const newClass = await createClass.mutateAsync({
        projectId,
        name: className.trim(),
        domain: domain.trim(),
        competitorDomains,
        countryId: country,
        countryName: selectedCountry?.name || "",
        locationId: selectedLocation?.id,
        locationName: selectedLocation?.canonicalName,
        languageCode: language,
        languageName: selectedLanguage?.name || "",
        device,
        topResults: parseInt(topResults),
        schedule,
        keywords: parseKeywords(),
      });

      handleClose();
      
      // Auto-trigger ranking check (non-blocking)
      checkRankings.mutate({ classId: newClass.id });
    } catch (error) {
      console.error("Error creating class:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/[\n,]/).map((l) => l.trim()).filter((l) => l.length > 0);
    const existingKeywords = parseKeywords();
    const newKeywords = [...new Set([...existingKeywords, ...lines])];
    setKeywordsText(newKeywords.join("\n"));
    
    e.target.value = "";
  };

  const stepTitles: Record<Step, string> = {
    1: "Class & Domain",
    2: "Keywords",
    3: "Search Settings",
    4: "Schedule",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Class{projectName ? ` to "${projectName}"` : ""}</DialogTitle>
          <DialogDescription>
            Step {step} of 4: {stepTitles[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  placeholder="e.g. iPhone 16 Pro Max"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain">Your Domain</Label>
                <Input
                  id="domain"
                  placeholder="e.g. example.com"
                  value={projectDomain || domain}
                  onChange={(e) => !projectDomain && setDomain(e.target.value)}
                  onBlur={(e) => !projectDomain && setDomain(extractRootDomain(e.target.value))}
                  disabled={!!projectDomain}
                  className={projectDomain ? "bg-muted cursor-not-allowed" : ""}
                />
                {projectDomain && (
                  <p className="text-xs text-muted-foreground">
                    Domain is inherited from the project.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Competitor Domains (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. competitor.com"
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCompetitor())}
                  />
                  <Button variant="outline" onClick={addCompetitor}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {competitorDomains.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {competitorDomains.map((d) => (
                      <Badge key={d} variant="secondary" className="gap-1">
                        {d}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeCompetitor(d)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keywords">Keywords (one per line)</Label>
                  <label>
                    <input
                      type="file"
                      accept=".csv,.txt,.xlsx"
                      className="hidden"
                      onChange={handleImportFile}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </span>
                    </Button>
                  </label>
                </div>
                <Textarea
                  id="keywords"
                  placeholder="Enter keywords, one per line..."
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  {parseKeywords().length} unique keywords (duplicates will be removed)
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select value={country} onValueChange={(v) => { setCountry(v); setLocation(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Location (optional)</Label>
                  <LocationCombobox
                    locations={filteredLocations}
                    value={location}
                    onValueChange={setLocation}
                    placeholder="Select location"
                    disabled={!country}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language *</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.lang} value={l.lang}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Device</Label>
                  <Select value={device} onValueChange={setDevice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of results to check</Label>
                <Select value={topResults} onValueChange={setTopResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="30">Top 30</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                    <SelectItem value="100">Top 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Auto-check Schedule (optional)</Label>
                <Select value={schedule || "none"} onValueChange={(v) => setSchedule(v === "none" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No schedule (manual only)</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {schedule
                    ? `Rankings will be checked automatically ${schedule}. You'll receive an email notification when complete.`
                    : "You can manually check rankings at any time."}
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <h4 className="font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Class:</span>
                  <span>{className}</span>
                  <span className="text-muted-foreground">Domain:</span>
                  <span>{domain}</span>
                  <span className="text-muted-foreground">Competitors:</span>
                  <span>{competitorDomains.length || "None"}</span>
                  <span className="text-muted-foreground">Keywords:</span>
                  <span>{parseKeywords().length}</span>
                  <span className="text-muted-foreground">Country:</span>
                  <span>{countries.find((c) => c.id === country)?.name}</span>
                  <span className="text-muted-foreground">Language:</span>
                  <span>{languages.find((l) => l.lang === language)?.name}</span>
                  <span className="text-muted-foreground">Device:</span>
                  <span className="capitalize">{device}</span>
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="capitalize">{schedule || "Manual"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed()}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Class"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
