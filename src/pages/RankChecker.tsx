import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { countries } from "@/data/countries";
import { languages } from "@/data/languages";
import { useGeoData } from "@/hooks/useGeoData";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
}

export default function RankChecker() {
  const [keyword, setKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [country, setCountry] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [device, setDevice] = useState("desktop");
  const [topResults, setTopResults] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SerpResult[]>([]);
  const [targetRanking, setTargetRanking] = useState<number | null>(null);
  const { toast } = useToast();
  const { getLocationsByCountry } = useGeoData();

  // Get locations filtered by selected country
  const filteredLocations = useMemo(() => {
    if (!country) return [];
    const selectedCountry = countries.find((c) => c.id === country);
    if (!selectedCountry) return [];
    return getLocationsByCountry(selectedCountry.code);
  }, [country, getLocationsByCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyword.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a keyword to check",
      });
      return;
    }

    if (!country) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a country",
      });
      return;
    }

    if (!language) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a language",
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    setTargetRanking(null);

    try {
      // Get country and language details
      const selectedCountry = countries.find((c) => c.id === country);
      const selectedLanguage = languages.find((l) => l.lang === language);
      const selectedLocation = filteredLocations.find((l) => l.id === location);

      if (!selectedCountry || !selectedLanguage) {
        throw new Error("Country or language information not found");
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke("check-ranking", {
        body: {
          keyword: keyword.trim(),
          targetUrl: targetUrl.trim() || undefined,
          countryId: selectedCountry.id,
          countryName: selectedCountry.name,
          locationId: selectedLocation?.id || undefined,
          locationName: selectedLocation?.canonicalName || undefined,
          languageCode: selectedLanguage.lang,
          languageName: selectedLanguage.name,
          device,
          topResults: parseInt(topResults),
        },
      });

      if (error) {
        throw new Error(error.message || "API call failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }

      setResults(data.results);

      // Handle target ranking result
      if (targetUrl.trim()) {
        if (data.targetRanking) {
          setTargetRanking(data.targetRanking);
          toast({
            title: "Found!",
            description: `Your URL is ranking #${data.targetRanking}`,
          });
        } else {
          setTargetRanking(-1);
          toast({
            variant: "destructive",
            title: "Not found",
            description: `URL not found in top ${topResults} results`,
          });
        }
      }
    } catch (error) {
      console.error("Error checking ranking:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while checking ranking",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keyword Rank Checker</h1>
        <p className="text-muted-foreground mt-2">
          Enter keyword and details to check position on Google SERP
        </p>
      </div>


      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Details
            </CardTitle>
            <CardDescription>
              Fill in all details for the most accurate results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword *</Label>
                <Input
                  id="keyword"
                  placeholder="e.g. what is marketing"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetUrl">Target URL (optional)</Label>
                <Input
                  id="targetUrl"
                  placeholder="example.com or https://example.com/page"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={country} onValueChange={setCountry}>
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
                <Label htmlFor="location">Specific location (optional)</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.canonicalName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.lang} value={lang.lang}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device">Device</Label>
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

              <div className="space-y-2">
                <Label htmlFor="topResults">Number of results to check</Label>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check Ranking
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  {results.length > 0
                    ? `Showing ${results.length} results`
                    : "Enter details and click check to see results"}
                </CardDescription>
              </div>
              {targetRanking !== null && (
                <Badge
                  variant={targetRanking > 0 ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {targetRanking > 0 ? `#${targetRanking}` : "Not found"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Searching for results...</p>
              </div>
            ) : results.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow
                      key={result.position}
                      className={
                        targetUrl &&
                        result.url.toLowerCase().includes(targetUrl.toLowerCase())
                          ? "bg-primary/5"
                          : ""
                      }
                    >
                      <TableCell>
                        <Badge variant="outline">{result.position}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium line-clamp-1">{result.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {result.url}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No results yet</p>
                  <p className="text-sm text-muted-foreground">
                    Fill in the details and click "Check Ranking" to start
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
